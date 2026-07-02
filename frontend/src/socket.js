// socket.js
// Instância única do cliente Socket.IO, compartilhada por toda a aplicação.
// Em dev, se VITE_BACKEND_URL não for definida, assume o backend rodando
// na mesma máquina na porta 4000 (útil quando presenter e backend estão
// no mesmo computador conectado à TV).

import { io } from "socket.io-client";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000`;

export const socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 800,
});

export const BACKEND_HTTP_URL = BACKEND_URL;
