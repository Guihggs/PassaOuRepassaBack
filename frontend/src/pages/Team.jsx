import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { socket } from "../socket.js";

const COLOR_OPTIONS = [
  { name: "Azul", value: "#3B82F6" },
  { name: "Vermelho", value: "#EF4444" },
  { name: "Verde", value: "#10B981" },
  { name: "Amarelo", value: "#F4E409" },
  { name: "Roxo", value: "#8B5CF6" },
  { name: "Rosa", value: "#FF2E8C" },
];

export default function Team() {
  const { teamId } = useParams();
  const id = Number(teamId);

  const [team, setTeam] = useState(null);
  const [state, setState] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0].value);
  const [photo, setPhoto] = useState(null);
  const [connected, setConnected] = useState(socket.connected);
  const [alreadyPressed, setAlreadyPressed] = useState(false);
  const [myPosition, setMyPosition] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      socket.emit("team:getInfo", { teamId: id }, (res) => {
        if (res?.team) setTeam(res.team);
      });
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onState(s) {
      setState(s);
      const idx = s.pressOrder.findIndex((p) => p.teamId === id);
      setAlreadyPressed(idx !== -1);
      setMyPosition(idx === -1 ? null : idx + 1);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("state:update", onState);

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("state:update", onState);
    };
  }, [id]);

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  }

  function handleRegister() {
    if (!name.trim()) return;
    socket.emit(
      "team:register",
      { teamId: id, name: name.trim(), color, photo },
      (res) => {
        if (res?.team) setTeam(res.team);
      }
    );
  }

  function handlePress() {
    socket.emit("team:press", { teamId: id });
  }

  if (!connected) {
    return (
      <FullScreen>
        <p className="font-display text-2xl animate-pulse">Conectando…</p>
      </FullScreen>
    );
  }

  if (!team) {
    return (
      <FullScreen>
        <p className="font-display text-2xl animate-pulse">Carregando equipe…</p>
      </FullScreen>
    );
  }

  // ---- Tela de cadastro ----------------------------------------------------
  if (!team.registered) {
    return (
      <FullScreen>
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <p className="uppercase tracking-[0.3em] text-cyan text-xs font-semibold">Equipe {id}</p>
            <h1 className="font-display text-3xl font-semibold mt-1">Cadastro</h1>
          </div>

          <div>
            <label className="text-sm text-white/60 mb-1 block">Nome da equipe</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Os Invencíveis"
              className="w-full rounded-xl bg-panel border border-white/10 px-4 py-3 outline-none focus:border-volt"
            />
          </div>

          <div>
            <label className="text-sm text-white/60 mb-2 block">Cor da equipe</label>
            <div className="grid grid-cols-3 gap-3">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`h-14 rounded-xl border-2 transition ${
                    color === c.value ? "border-white scale-105" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.value }}
                  aria-label={c.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-white/60 mb-2 block">Foto da equipe</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border border-dashed border-white/25 py-4 flex flex-col items-center gap-2"
            >
              {photo ? (
                <img src={photo} alt="Foto da equipe" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <span className="text-3xl">📷</span>
              )}
              <span className="text-sm text-white/60">{photo ? "Trocar foto" : "Tirar foto"}</span>
            </button>
          </div>

          <button
            onClick={handleRegister}
            disabled={!name.trim()}
            className="w-full rounded-xl bg-volt text-night font-display font-semibold text-lg py-4 disabled:opacity-30"
          >
            Confirmar cadastro
          </button>
        </div>
      </FullScreen>
    );
  }

  // ---- Tela do botão ---------------------------------------------------
  const isLive = state?.status === "live";
  const canPress = isLive && !alreadyPressed;

  let statusLabel = "Aguardando o apresentador…";
  if (state?.status === "countdown") statusLabel = "Preparem-se…";
  if (state?.status === "live") statusLabel = alreadyPressed ? `Você apertou! (${myPosition}º lugar)` : "Aperte agora!";
  if (state?.status === "answering") statusLabel = alreadyPressed ? `Você está na posição ${myPosition}º` : "Rodada em andamento";
  if (state?.status === "revealed") statusLabel = "Rodada encerrada";

  return (
    <FullScreen bg={team.color}>
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        {team.photo && (
          <img src={team.photo} alt={team.name} className="w-16 h-16 rounded-full object-cover border-2 border-white/40" />
        )}
        <div>
          <p className="text-white/70 text-sm">{statusLabel}</p>
          <h1 className="font-display text-2xl font-semibold">{team.name}</h1>
        </div>

        <button
          onClick={handlePress}
          disabled={!canPress}
          className={`w-64 h-64 rounded-full font-display text-3xl font-bold select-none transition
            ${canPress ? "bg-white text-night active:scale-95 animate-pulseGlow" : "bg-white/10 text-white/30"}`}
        >
          {alreadyPressed ? "✓" : "APERTAR"}
        </button>

        <p className="text-white/50 text-xs">Placar: {team.score} pts</p>
      </div>
    </FullScreen>
  );
}

function FullScreen({ children, bg }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={bg ? { background: `linear-gradient(180deg, ${bg}33, #0B0A1F 70%)` } : undefined}
    >
      {children}
    </div>
  );
}
