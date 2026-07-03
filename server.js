// server.js
// Backend do jogo. Responsabilidades:
//  1) REST API simples para CRUD de perguntas.
//  2) Servidor Socket.IO que é a "fonte da verdade" do estado da partida em
//     tempo real (rodada atual, ordem de quem apertou, pontuação, etc).
//
// Arquitetura em camadas:
//  db.js     -> acesso a dados (lowdb / JSON)
//  server.js -> orquestra HTTP + WebSocket, mantém o estado da rodada em
//               memória e liga tudo

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import * as db from "./db.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" })); // limite maior por causa das fotos em base64

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// ---------------------------------------------------------------------------
// Estado da rodada em memória. É "efêmero" de propósito: se o servidor
// reiniciar, a rodada em andamento se perde, mas equipes/placar/perguntas
// continuam salvos (arquivo game-data.json via db.js).
// ---------------------------------------------------------------------------
const POINT_VALUES = [1, 0.75, 0.5]; // 1º, 2º, 3º colocado

let state = {
  status: "idle", // idle | countdown | live | answering | revealed | ended
  currentQuestionId: null,
  currentQuestionIndex: -1, // índice sequencial dentro da lista de perguntas
  pressOrder: [], // [{ teamId, ts }] em ordem de chegada
  answeringPos: -1, // posição (0,1,2) dentro de pressOrder que está respondendo agora
  roundLog: [], // histórico de acertos/erros desta rodada
};

// Assim que a 1ª equipe aperta o botão, abrimos uma janela de tolerância
// (WAIT_ALL_PRESS_MS) antes de travar a ordem e liberar o julgamento do
// apresentador. Isso dá tempo real para as outras equipes apertarem também,
// em vez de já "fechar" a rodada no exato instante do primeiro toque.
// Se as 3 equipes apertarem antes do tempo acabar, não precisa esperar o
// resto: trava a ordem na hora.
const WAIT_ALL_PRESS_MS = 5000;
let pendingAnswerTimer = null;

function clearPendingAnswerTimer() {
  if (pendingAnswerTimer) {
    clearTimeout(pendingAnswerTimer);
    pendingAnswerTimer = null;
  }
}

// Travar a ordem de apertos e liberar o julgamento do apresentador
// (status -> "answering", começando pela 1ª equipe da fila).
function lockInAnswering() {
  clearPendingAnswerTimer();
  if (state.status !== "live" || state.pressOrder.length === 0) return;
  state.status = "answering";
  state.answeringPos = 0;
  console.log(`[lockInAnswering] ordem travada com ${state.pressOrder.length} equipe(s); iniciando julgamento pela posição 0`);
  broadcastState();
}

function publicQuestion(q, revealAnswer) {
  if (!q) return null;
  const base = {
    id: q.id,
    title: q.title,
    alt_a: q.alt_a,
    alt_b: q.alt_b,
    alt_c: q.alt_c,
    alt_d: q.alt_d,
    category: q.category,
    difficulty: q.difficulty,
  };
  if (revealAnswer) {
    base.correct = q.correct;
    base.explanation = q.explanation;
  }
  return base;
}

function buildPublicState() {
  const questions = db.getQuestions();
  const currentQuestion = questions.find((q) => q.id === state.currentQuestionId) || null;
  const revealAnswer = state.status === "revealed" || state.status === "ended";
  return {
    status: state.status,
    teams: db.getTeams(),
    totalQuestions: questions.length,
    currentQuestionIndex: state.currentQuestionIndex,
    currentQuestion: publicQuestion(currentQuestion, revealAnswer),
    pressOrder: state.pressOrder,
    answeringPos: state.answeringPos,
    pointValues: POINT_VALUES,
    // Resultado de quem acertou/errou nesta rodada — necessário para o
    // painel do apresentador (e telão) confirmarem visualmente que o
    // "Resposta Correta/Errada" foi de fato registrado e pontuado.
    roundLog: state.roundLog,
  };
}

function broadcastState() {
  io.emit("state:update", buildPublicState());
}

// Perguntas completas (com resposta certa) só vão para o painel do
// apresentador, nunca para telão ou celulares das equipes.
function sendPresenterQuestions(target) {
  target.emit("presenter:questions", db.getQuestions());
}

// ---------------------------------------------------------------------------
// REST API — usada pelo painel do apresentador para CRUD de perguntas.
// ---------------------------------------------------------------------------
app.get("/api/questions", (req, res) => {
  res.json(db.getQuestions());
});

app.post("/api/questions", async (req, res) => {
  const { title, alt_a, alt_b, alt_c, alt_d, correct, category, difficulty, explanation } = req.body;
  if (!title || !alt_a || !alt_b || !alt_c || !alt_d || !correct) {
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }
  const created = await db.addQuestion({ title, alt_a, alt_b, alt_c, alt_d, correct, category, difficulty, explanation });
  io.emit("presenter:questions", db.getQuestions());
  res.status(201).json(created);
});

app.put("/api/questions/:id", async (req, res) => {
  const updated = await db.updateQuestion(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Pergunta não encontrada." });
  io.emit("presenter:questions", db.getQuestions());
  res.json(updated);
});

app.delete("/api/questions/:id", async (req, res) => {
  await db.deleteQuestion(req.params.id);
  io.emit("presenter:questions", db.getQuestions());
  res.status(204).end();
});

app.get("/api/teams", (req, res) => res.json(db.getTeams()));

app.get("/health", (req, res) => res.json({ ok: true }));

// ---------------------------------------------------------------------------
// Socket.IO — motor de tempo real do jogo
// ---------------------------------------------------------------------------
io.on("connection", (socket) => {
  // Ao conectar, todo cliente recebe o estado atual (presenter/display/team)
  socket.emit("state:update", buildPublicState());
  sendPresenterQuestions(socket);

  // ---- Cadastro de equipe -------------------------------------------------
  socket.on("team:register", async ({ teamId, name, color, photo }, ack) => {
    const updated = await db.registerTeam(teamId, { name, color, photo });
    if (!updated) return ack?.({ error: "Equipe inválida." });
    console.log(`[team:register] equipe ${teamId} cadastrada/atualizada como "${name}"`);
    ack?.({ team: updated });
    broadcastState();
  });

  socket.on("team:getInfo", ({ teamId }, ack) => {
    ack?.({ team: db.getTeamById(teamId) });
  });

  // ---- Botão da equipe ("APERTAR") ----------------------------------------
  socket.on("team:press", ({ teamId }) => {
    // Aceita o toque enquanto a rodada estiver "live" (botões liberados).
    // Depois que a ordem é travada (status "answering"), não aceita mais
    // toques novos — a janela de 5s já deu chance a todo mundo.
    if (state.status !== "live") return;
    if (state.pressOrder.length >= 3) return; // as 3 equipes já apertaram
    const alreadyPressed = state.pressOrder.some((p) => p.teamId === teamId);
    if (alreadyPressed) return;

    // Timestamp de alta precisão gerado no SERVIDOR, não no celular, para
    // evitar diferenças de relógio entre aparelhos.
    state.pressOrder.push({ teamId, ts: process.hrtime.bigint().toString() });
    console.log(`[team:press] equipe ${teamId} apertou (posição ${state.pressOrder.length}º)`);

    const totalTeams = db.getTeams().length;
    if (state.pressOrder.length >= totalTeams) {
      // Todo mundo já apertou — não precisa esperar o resto da janela.
      lockInAnswering();
    } else if (state.pressOrder.length === 1) {
      // Primeira equipe apertou: abre a janela de tolerância para as demais.
      clearPendingAnswerTimer();
      pendingAnswerTimer = setTimeout(lockInAnswering, WAIT_ALL_PRESS_MS);
      broadcastState();
    } else {
      broadcastState();
    }
  });

  // ---- Controles do apresentador ------------------------------------------

  // Seleciona uma pergunta (por índice sequencial) e prepara a rodada
  socket.on("presenter:selectQuestion", ({ index }) => {
    console.log(`[selectQuestion] recebido index=${index}`);
    const questions = db.getQuestions();
    if (index < 0 || index >= questions.length) return;
    clearPendingAnswerTimer();
    state = {
      status: "idle",
      currentQuestionId: questions[index].id,
      currentQuestionIndex: index,
      pressOrder: [],
      answeringPos: -1,
      roundLog: [],
    };
    broadcastState();
  });

  // Inicia a contagem regressiva: 3..2..1 -> libera os botões
  socket.on("presenter:startRound", () => {
    console.log(`[startRound] recebido, currentQuestionId=${state.currentQuestionId}`);
    if (!state.currentQuestionId) return;
    clearPendingAnswerTimer();
    state.status = "countdown";
    state.pressOrder = [];
    state.answeringPos = -1;
    broadcastState();

    let count = 3;
    io.emit("round:countdown", count);
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        io.emit("round:countdown", count);
      } else {
        clearInterval(interval);
        state.status = "live";
        broadcastState();
      }
    }, 1000);
  });

  // Apresentador confirma se a resposta da equipe da vez está certa ou errada
  socket.on("presenter:markAnswer", async ({ correct }) => {
    if (state.status !== "answering") {
      console.log(`[markAnswer] ignorado: status atual é "${state.status}", esperado "answering".`);
      return;
    }
    const entry = state.pressOrder[state.answeringPos];
    if (!entry) {
      console.log("[markAnswer] ignorado: nenhuma equipe na posição atual de resposta.");
      return;
    }
    const pointValue = POINT_VALUES[state.answeringPos] ?? 0;

    state.roundLog.push({ teamId: entry.teamId, correct, pointValue });
    console.log(`[markAnswer] equipe ${entry.teamId} marcada como ${correct ? "CORRETA" : "ERRADA"} (pos ${state.answeringPos}, vale ${pointValue} pt)`);

    if (correct) {
      await db.addScore(entry.teamId, pointValue);
      console.log(`[markAnswer] pontos gravados para equipe ${entry.teamId}. Placar agora:`, db.getTeams().map((t) => `${t.id}:${t.score}`));
      await finishRound();
    } else if (state.answeringPos < state.pressOrder.length - 1) {
      state.answeringPos += 1; // passa para o próximo colocado automaticamente
      broadcastState();
    } else {
      // ninguém mais na fila (ou todos já tentaram) -> ninguém pontua
      await finishRound();
    }
  });

  async function finishRound() {
    state.status = "revealed";
    await db.addRoundHistory({
      questionId: state.currentQuestionId,
      pressOrder: state.pressOrder,
      result: state.roundLog,
    });
    broadcastState();
  }

  socket.on("presenter:showAnswer", () => {
    clearPendingAnswerTimer();
    state.status = "revealed";
    broadcastState();
  });

  socket.on("presenter:resetButton", () => {
    clearPendingAnswerTimer();
    state.pressOrder = [];
    state.answeringPos = -1;
    state.status = state.currentQuestionId ? "live" : "idle";
    broadcastState();
  });

  socket.on("presenter:endRound", () => {
    clearPendingAnswerTimer();
    state.status = "idle";
    state.pressOrder = [];
    state.answeringPos = -1;
    state.currentQuestionId = null;
    broadcastState();
  });

  socket.on("presenter:nextQuestion", () => {
    const questions = db.getQuestions();
    const nextIndex = state.currentQuestionIndex + 1;
    clearPendingAnswerTimer();
    if (nextIndex >= questions.length) {
      state.status = "ended";
      broadcastState();
      return;
    }
    state = {
      status: "idle",
      currentQuestionId: questions[nextIndex].id,
      currentQuestionIndex: nextIndex,
      pressOrder: [],
      answeringPos: -1,
      roundLog: [],
    };
    broadcastState();
  });

  socket.on("presenter:resetGame", async () => {
    clearPendingAnswerTimer();
    await db.resetScores();
    state = {
      status: "idle",
      currentQuestionId: null,
      currentQuestionIndex: -1,
      pressOrder: [],
      answeringPos: -1,
      roundLog: [],
    };
    broadcastState();
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Quiz game backend rodando na porta ${PORT}`);
});
