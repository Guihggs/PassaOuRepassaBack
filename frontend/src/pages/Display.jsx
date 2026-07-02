import { useEffect, useState } from "react";
import { socket } from "../socket.js";

const MEDALS = ["🥇", "🥈", "🥉"];
const LETTERS = ["A", "B", "C", "D"];

export default function Display() {
  const [state, setState] = useState(null);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    function onState(s) {
      setState(s);
      if (s.status !== "countdown") setCountdown(null);
    }
    function onCountdown(n) {
      setCountdown(n);
    }
    socket.on("state:update", onState);
    socket.on("round:countdown", onCountdown);
    return () => {
      socket.off("state:update", onState);
      socket.off("round:countdown", onCountdown);
    };
  }, []);

  if (!state) {
    return (
      <FullScreen>
        <p className="font-display text-3xl animate-pulse">Conectando ao servidor…</p>
      </FullScreen>
    );
  }

  const teamsRanked = [...state.teams].sort((a, b) => b.score - a.score);
  const q = state.currentQuestion;
  const pressOrderWithTeams = state.pressOrder.map((p, i) => ({
    ...p,
    team: state.teams.find((t) => t.id === p.teamId),
    position: i,
  }));

  return (
    <div className="min-h-screen flex flex-col p-8 gap-6">
      {/* Cabeçalho com placar das 3 equipes */}
      <div className="grid grid-cols-3 gap-6">
        {teamsRanked.map((t, i) => (
          <div
            key={t.id}
            className="rounded-2xl border border-white/10 bg-panel p-4 flex items-center gap-4"
            style={{ boxShadow: i === 0 ? `0 0 30px ${t.color}55` : undefined }}
          >
            {t.photo ? (
              <img src={t.photo} alt={t.name} className="w-14 h-14 rounded-full object-cover border-2" style={{ borderColor: t.color || "#fff" }} />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: t.color || "#333" }}>
                {t.name?.[0] || "?"}
              </div>
            )}
            <div>
              <p className="font-display text-lg leading-tight">{t.name || `Equipe ${t.id}`}</p>
              <p className="text-white/60 text-sm">{t.score} pts</p>
            </div>
          </div>
        ))}
      </div>

      {/* Área central: contagem, pergunta ou ranking de quem apertou */}
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
        {state.status === "idle" && (
          <p className="font-display text-4xl text-white/40">Aguardando o apresentador iniciar a rodada…</p>
        )}

        {state.status === "countdown" && (
          <div className="flex flex-col items-center gap-4">
            <p className="font-display text-3xl text-white/60">Preparem-se…</p>
            <p className="font-display text-[10rem] leading-none text-volt animate-popIn" key={countdown}>
              {countdown}
            </p>
          </div>
        )}

        {(state.status === "live" || state.status === "answering" || state.status === "revealed") && q && (
          <div className="w-full max-w-4xl space-y-8">
            {state.currentQuestionIndex >= 0 && (
              <p className="text-cyan uppercase tracking-widest text-sm font-semibold">
                Pergunta {state.currentQuestionIndex + 1} de {state.totalQuestions}
                {q.category ? ` · ${q.category}` : ""}
              </p>
            )}
            <h2 className="font-display text-3xl md:text-4xl font-semibold">{q.title}</h2>
            <div className="grid grid-cols-2 gap-4 text-left">
              {LETTERS.map((letter) => {
                const isCorrect = state.status === "revealed" && q.correct === letter;
                return (
                  <div
                    key={letter}
                    className={`rounded-xl border px-5 py-4 flex gap-3 items-start transition ${
                      isCorrect ? "border-volt bg-volt/10" : "border-white/10 bg-panel"
                    }`}
                  >
                    <span className="font-display text-xl text-cyan">{letter}</span>
                    <span className="text-lg">{q[`alt_${letter.toLowerCase()}`]}</span>
                  </div>
                );
              })}
            </div>

            {state.status === "revealed" && q.explanation && (
              <p className="text-white/60 text-base max-w-2xl mx-auto">{q.explanation}</p>
            )}

            {pressOrderWithTeams.length > 0 && (
              <div className="flex justify-center gap-6 pt-4">
                {pressOrderWithTeams.map((p) => (
                  <div
                    key={p.teamId}
                    className={`flex flex-col items-center gap-1 ${
                      state.status === "answering" && p.position === state.answeringPos ? "animate-pulseGlow rounded-2xl" : ""
                    }`}
                  >
                    <span className="text-3xl">{MEDALS[p.position] || "•"}</span>
                    <span className="font-display text-sm">{p.team?.name || `Equipe ${p.teamId}`}</span>
                    <span className="text-xs text-white/40">vale {state.pointValues[p.position]} pt</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {state.status === "ended" && (
          <div className="space-y-4">
            <p className="font-display text-5xl text-volt">Fim de jogo! 🎉</p>
            <p className="font-display text-2xl">Campeã: {teamsRanked[0]?.name}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FullScreen({ children }) {
  return <div className="min-h-screen flex items-center justify-center">{children}</div>;
}
