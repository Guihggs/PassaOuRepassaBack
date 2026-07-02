# Quiz das Equipes — MVP

Jogo de perguntas e respostas em tempo real para disputas presenciais entre 3
equipes, controlado por um apresentador e exibido em TV/projetor. Cada equipe
joga pelo próprio celular, acessando via QR Code.

## Arquitetura

```
quiz-game/
├── backend/         Node.js + Express + Socket.IO + SQLite
│   ├── db.js         camada de dados (schema + seed de perguntas)
│   └── server.js      REST API (perguntas) + motor de tempo real (Socket.IO)
└── frontend/        React + Vite + TailwindCSS
    └── src/
        ├── socket.js         cliente Socket.IO compartilhado
        └── pages/
            ├── Presenter.jsx  painel do apresentador (controle + CRUD + QR)
            ├── Display.jsx    tela principal para TV/projetor
            └── Team.jsx       controle remoto da equipe (cadastro + botão)
```

**Por que essa stack:** é a combinação mais simples que ainda atende a todos
os requisitos — SQLite dispensa configurar um banco externo para o MVP, e
Socket.IO cuida da reconexão automática dos celulares sozinho.

**Por que o estado da rodada fica em memória (não no banco):** o estado da
rodada (quem apertou, em que ordem, rodada ao vivo ou não) muda muitas vezes
por segundo e não precisa sobreviver a um restart do servidor. Já placar,
equipes e perguntas são persistidos no SQLite. O histórico de cada rodada
(ordem de aperto + resultado) também é salvo na tabela `round_history` para
auditoria futura.

**Timestamp de alta precisão:** a ordem de quem apertou primeiro é decidida
pelo **servidor**, no momento em que o evento `team:press` chega via
WebSocket (usando `process.hrtime.bigint()`), e não pelo relógio do celular —
isso evita que um aparelho com hora errada "ganhe" a rodada injustamente.

## Como rodar localmente

Pré-requisitos: Node.js 18+.

```bash
# Backend
cd backend
npm install
npm start          # roda em http://localhost:4000

# Frontend (em outro terminal)
cd frontend
npm install
npm run dev         # roda em http://localhost:5173
```

Abra:
- `http://localhost:5173/presenter` no computador ligado à TV
- `http://localhost:5173/display` em uma segunda janela/monitor (a tela do telão)
- Os QR Codes gerados na aba **Equipes / QR Codes** do painel do apresentador
  apontam para `http://<host>:5173/team/1`, `/team/2` e `/team/3`

> Para os celulares acessarem, todos os aparelhos (computador e celulares)
> precisam estar na mesma rede Wi-Fi, e você deve acessar o painel usando o
> IP local do computador (ex: `http://192.168.0.10:5173`) em vez de
> `localhost`, para que o QR Code funcione. O Vite já está configurado com
> `host: true` para aceitar essas conexões.

## Deploy (produção)

- **Backend:** Render (ou Railway/Fly.io) — Web Service Node, comando de start `npm start`.
  Como o SQLite é um arquivo local, use um *persistent disk* no Render (ou troque por Supabase depois).
- **Frontend:** Vercel — defina a variável de ambiente `VITE_BACKEND_URL` apontando para a URL pública do backend.

## Fluxo do jogo (implementado)

1. Apresentador escolhe uma pergunta na aba **Controle da Partida**.
2. Clica em **Iniciar rodada** → todos os celulares recebem o botão desabilitado,
   telão mostra "Preparem-se…" e a contagem 3-2-1.
3. Ao final da contagem, os botões liberam automaticamente em todos os celulares ao mesmo tempo.
4. A ordem de quem apertou é registrada pelo servidor e exibida em tempo real (🥇🥈🥉).
5. O apresentador confirma **Resposta Correta** ou **Resposta Errada** para quem está na vez:
   - 1º colocado vale 1 ponto
   - se errar, passa automaticamente para o 2º colocado, que vale 0,75 ponto
   - se errar de novo, passa para o 3º, que vale 0,5 ponto
   - se todos errarem, ninguém pontua
6. Apresentador usa **Mostrar resposta**, **Próxima pergunta**, **Resetar botão** e
   **Encerrar rodada** para conduzir o restante da partida.

## Já preparado para evoluir (conforme pedido no briefing)

- Estrutura em camadas e componentes separados facilitam adicionar:
  - cronômetro com limite de tempo por pergunta,
  - efeitos sonoros,
  - importação de perguntas via planilha Excel (basta um novo endpoint `POST /api/questions/import`),
  - autenticação do apresentador,
  - múltiplas salas/partidas simultâneas.
- `round_history` já guarda ordem de aperto + resultado de cada rodada, base para um ranking geral histórico.

## Perguntas seed (Projeto Beta)

10 perguntas sobre Aprendizagem Profissional (Lei da Aprendizagem, SENAI,
SENAC, ética, comunicação, segurança do trabalho etc.) já vêm cadastradas
automaticamente na primeira execução do backend (`backend/db.js`).
