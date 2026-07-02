// db.js
// Camada de acesso a dados. Usa lowdb (arquivo JSON local) por ser a opção
// MAIS simples possível para um MVP: um único arquivo, sem servidor externo
// e sem nenhuma dependência nativa para compilar (o que facilita o deploy
// em qualquer plataforma, ex: Render). Trocar por Supabase/Postgres no
// futuro exige apenas reescrever este arquivo — o resto da aplicação só
// conhece as funções exportadas aqui embaixo.

import { JSONFilePreset } from "lowdb/node";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const seedQuestions = [
  {
    title: "Qual lei regulamenta o contrato de aprendizagem no Brasil?",
    alt_a: "Lei nº 10.097/2000 (Lei da Aprendizagem)",
    alt_b: "Lei nº 8.069/1990 (ECA)",
    alt_c: "Lei nº 9.394/1996 (LDB)",
    alt_d: "Lei nº 13.467/2017 (Reforma Trabalhista)",
    correct: "A",
    category: "Lei da Aprendizagem",
    difficulty: "fácil",
    explanation: "A Lei nº 10.097/2000, conhecida como Lei da Aprendizagem, alterou a CLT para regulamentar o contrato de aprendizagem.",
  },
  {
    title: "Qual é a idade mínima e máxima para ser aprendiz, segundo a legislação?",
    alt_a: "12 a 16 anos",
    alt_b: "14 a 24 anos",
    alt_c: "16 a 22 anos",
    alt_d: "18 a 26 anos",
    correct: "B",
    category: "Direitos do aprendiz",
    difficulty: "médio",
    explanation: "A aprendizagem é destinada a pessoas de 14 a 24 anos, exceto para aprendizes com deficiência, sem limite máximo de idade.",
  },
  {
    title: "Qual a duração máxima permitida para um contrato de aprendizagem?",
    alt_a: "1 ano",
    alt_b: "2 anos",
    alt_c: "3 anos",
    alt_d: "5 anos",
    correct: "B",
    category: "Contrato de aprendizagem",
    difficulty: "médio",
    explanation: "O contrato de aprendizagem tem duração máxima de 2 anos, salvo para aprendiz com deficiência, que não tem prazo determinado.",
  },
  {
    title: "Empresas de que porte são obrigadas a contratar aprendizes?",
    alt_a: "Apenas multinacionais",
    alt_b: "Todas, sem exceção",
    alt_c: "Estabelecimentos de médio e grande porte, com funções que demandem formação profissional",
    alt_d: "Somente empresas públicas",
    correct: "C",
    category: "Empresas",
    difficulty: "médio",
    explanation: "A obrigatoriedade vale para estabelecimentos de médio e grande porte, que devem empregar de 5% a 15% de aprendizes em funções que demandem formação profissional.",
  },
  {
    title: "O que significa a sigla SENAI?",
    alt_a: "Serviço Nacional de Aprendizagem Industrial",
    alt_b: "Sistema Nacional de Auxílio à Indústria",
    alt_c: "Secretaria Nacional de Aprendizagem e Inclusão",
    alt_d: "Serviço Nacional de Assistência Infantil",
    correct: "A",
    category: "SENAI",
    difficulty: "fácil",
    explanation: "SENAI é o Serviço Nacional de Aprendizagem Industrial, entidade que oferece formação profissional voltada à indústria.",
  },
  {
    title: "O SENAC forma profissionais principalmente para qual setor?",
    alt_a: "Setor industrial",
    alt_b: "Setor agrícola",
    alt_c: "Setor de comércio e serviços",
    alt_d: "Setor público",
    correct: "C",
    category: "SENAC",
    difficulty: "fácil",
    explanation: "O SENAC (Serviço Nacional de Aprendizagem Comercial) forma profissionais voltados ao comércio de bens, serviços e turismo.",
  },
  {
    title: "Qual destas NÃO é uma característica esperada no mundo do trabalho atual?",
    alt_a: "Capacidade de trabalhar em equipe",
    alt_b: "Adaptabilidade a mudanças",
    alt_c: "Resistência a aprender coisas novas",
    alt_d: "Comunicação eficaz",
    correct: "C",
    category: "Mundo do trabalho",
    difficulty: "fácil",
    explanation: "O mercado de trabalho atual valoriza aprendizado contínuo e adaptabilidade; resistir a aprender é uma desvantagem competitiva.",
  },
  {
    title: "Agir com honestidade, respeito e responsabilidade no ambiente de trabalho está relacionado a qual princípio?",
    alt_a: "Produtividade",
    alt_b: "Ética profissional",
    alt_c: "Hierarquia",
    alt_d: "Meritocracia",
    correct: "B",
    category: "Ética",
    difficulty: "fácil",
    explanation: "Honestidade, respeito e responsabilidade são pilares da ética profissional, essenciais para a confiança nas relações de trabalho.",
  },
  {
    title: "Em uma comunicação profissional eficaz, o que é mais recomendado?",
    alt_a: "Falar o máximo possível sem ouvir",
    alt_b: "Usar apenas mensagens de texto informais",
    alt_c: "Ouvir ativamente e ser claro e objetivo",
    alt_d: "Evitar dar feedback",
    correct: "C",
    category: "Comunicação",
    difficulty: "fácil",
    explanation: "A escuta ativa combinada com clareza e objetividade é a base de uma comunicação profissional eficaz.",
  },
  {
    title: "O uso de Equipamento de Proteção Individual (EPI) tem como principal objetivo:",
    alt_a: "Cumprir uma formalidade burocrática",
    alt_b: "Proteger a saúde e a integridade física do trabalhador",
    alt_c: "Aumentar a produtividade da empresa",
    alt_d: "Substituir treinamentos de segurança",
    correct: "B",
    category: "Segurança do trabalho",
    difficulty: "fácil",
    explanation: "O EPI existe para proteger a saúde e a integridade física do trabalhador diante de riscos presentes no ambiente laboral.",
  },
].map((q, i) => ({ id: i + 1, ...q }));

const defaultData = {
  teams: [
    { id: 1, name: null, color: null, photo: null, score: 0, registered: false },
    { id: 2, name: null, color: null, photo: null, score: 0, registered: false },
    { id: 3, name: null, color: null, photo: null, score: 0, registered: false },
  ],
  questions: seedQuestions,
  roundHistory: [],
  nextQuestionId: seedQuestions.length + 1,
};

const lowdb = await JSONFilePreset(path.join(__dirname, "game-data.json"), defaultData);

export function getTeams() {
  return lowdb.data.teams;
}

export function getTeamById(id) {
  return lowdb.data.teams.find((t) => t.id === Number(id)) || null;
}

export async function registerTeam(teamId, { name, color, photo }) {
  const team = getTeamById(teamId);
  if (!team) return null;
  team.name = name;
  team.color = color;
  team.photo = photo || null;
  team.registered = true;
  await lowdb.write();
  return team;
}

export async function addScore(teamId, delta) {
  const team = getTeamById(teamId);
  if (!team) return;
  team.score = Math.round((team.score + delta) * 100) / 100;
  await lowdb.write();
}

export async function resetScores() {
  lowdb.data.teams.forEach((t) => (t.score = 0));
  await lowdb.write();
}

export function getQuestions() {
  return lowdb.data.questions;
}

export function getQuestionById(id) {
  return lowdb.data.questions.find((q) => q.id === Number(id)) || null;
}

export async function addQuestion(q) {
  const created = { id: lowdb.data.nextQuestionId++, ...q };
  lowdb.data.questions.push(created);
  await lowdb.write();
  return created;
}

export async function updateQuestion(id, q) {
  const idx = lowdb.data.questions.findIndex((x) => x.id === Number(id));
  if (idx === -1) return null;
  lowdb.data.questions[idx] = { ...lowdb.data.questions[idx], ...q, id: Number(id) };
  await lowdb.write();
  return lowdb.data.questions[idx];
}

export async function deleteQuestion(id) {
  lowdb.data.questions = lowdb.data.questions.filter((q) => q.id !== Number(id));
  await lowdb.write();
}

export async function addRoundHistory(entry) {
  lowdb.data.roundHistory.push({ ...entry, createdAt: new Date().toISOString() });
  await lowdb.write();
}
