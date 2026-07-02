import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <p className="uppercase tracking-[0.3em] text-cyan text-sm font-semibold mb-2">Quiz das Equipes</p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold">Escolha uma tela</h1>
      </div>
      <div className="grid gap-4 w-full max-w-sm">
        <Link to="/presenter" className="rounded-2xl bg-panel border border-white/10 px-6 py-4 hover:border-volt transition">
          <span className="font-display text-xl">🎛️ Painel do Apresentador</span>
        </Link>
        <Link to="/display" className="rounded-2xl bg-panel border border-white/10 px-6 py-4 hover:border-volt transition">
          <span className="font-display text-xl">📺 Tela Principal (TV)</span>
        </Link>
        <Link to="/team/1" className="rounded-2xl bg-panel border border-white/10 px-6 py-4 hover:border-volt transition">
          <span className="font-display text-xl">📱 Controle de Equipe (teste)</span>
        </Link>
      </div>
      <p className="text-white/40 text-xs max-w-sm">
        Na partida real, as equipes acessam direto pelo QR Code gerado no Painel do Apresentador —
        elas não precisam ver esta tela.
      </p>
    </div>
  );
}
