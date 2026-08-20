"use client";

import Image from "next/image";
import { useState } from "react";
import { Battery, Flame, ShieldAlert, Sparkles, Power, RefreshCw } from "lucide-react";

export function WorkshopSimulator() {
  const [bateria, setBateria] = useState(24);
  const [temperatura, setTemperatura] = useState(85);
  const [encendido, setEncendido] = useState(true);
  const [alerta, setAlerta] = useState<string | null>(null);

  const handleCargar = () => {
    setAlerta(null);
    if (!encendido) {
      setAlerta("Robot en reposo. Carga segura completada (+25% energía).");
    } else {
      setAlerta("Método público cargar() ejecutado con éxito (+15% energía).");
    }
    setBateria((prev) => Math.min(100, prev + 15));
  };

  const handleEnfriar = () => {
    setAlerta("Método público enfriar() activado: sistema térmico estabilizado (-20°C).");
    setTemperatura((prev) => Math.max(25, prev - 20));
  };

  const handleApagar = () => {
    setEncendido((prev) => {
      const nuevo = !prev;
      setAlerta(
        nuevo
          ? "Robot reactivado: comprobando integridad de atributos privados."
          : "Modo seguro activado: estado protegido.",
      );
      return nuevo;
    });
  };

  const handleIntentoIlegal = () => {
    setAlerta("⚠️ Acceso denegado: 'batería' y 'temperatura' son atributos PRIVADOS. Usa métodos públicos.");
  };

  const handleReset = () => {
    setBateria(24);
    setTemperatura(85);
    setEncendido(true);
    setAlerta("Simulador restablecido a estado inicial con avería.");
  };

  const tempColor = temperatura > 60 ? "text-rose-400" : temperatura > 40 ? "text-amber-400" : "text-emerald-400";
  const batColor = bateria < 30 ? "text-rose-400" : bateria < 60 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      {/* HUD status monitor */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className={`h-2.5 w-2.5 rounded-full ${encendido ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
          <span className="text-slate-400">ESTADO:</span>
          <strong className={encendido ? "text-emerald-300" : "text-slate-400"}>
            {encendido ? "MODO ACTIVO" : "MODO SEGURO // APAGADO"}
          </strong>
        </div>
        <button
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-1 text-[11px] text-slate-400 transition hover:bg-white/[.08] hover:text-white"
          onClick={handleReset}
          type="button"
        >
          <RefreshCw size={12} /> Reiniciar
        </button>
      </div>

      {/* Metrics telemetry bar */}
      <div className="mt-4 grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center">
          <span className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider text-slate-500">
            <Battery size={13} /> Batería
          </span>
          <strong className={`mt-1 block font-mono text-xl font-bold ${batColor}`}>
            {bateria}%
          </strong>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${bateria}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center">
          <span className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider text-slate-500">
            <Flame size={13} /> Temperatura
          </span>
          <strong className={`mt-1 block font-mono text-xl font-bold ${tempColor}`}>
            {temperatura}°C
          </strong>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-rose-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (temperatura / 100) * 100)}%` }}
            />
          </div>
        </div>

        <div className="col-span-2 rounded-2xl border border-white/10 bg-black/30 p-3 text-center sm:col-span-1">
          <span className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider text-slate-500">
            <Sparkles size={13} /> Integridad
          </span>
          <strong className="mt-1 block font-mono text-xl font-bold text-emerald-300">
            {bateria > 50 && temperatura < 50 ? "100% OK" : "AVERIADO"}
          </strong>
          <span className="text-[10px] text-slate-500">Encapsulado</span>
        </div>
      </div>

      {/* Robot image with subtle glow */}
      <div className="relative my-4 flex items-center justify-center py-2">
        <div
          className="pointer-events-none absolute h-44 w-44 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: temperatura > 60 ? "#f43f5e" : "#10b981" }}
        />
        <Image
          alt="Robot interactivo averiado de AlgoLab"
          className="h-44 w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,.7)] transition-all duration-500"
          height={180}
          src="/algolab/robot-averiado.png"
          width={180}
        />
      </div>

      {/* Alert toast display */}
      {alerta && (
        <div className="mb-4 w-full rounded-xl border border-emerald-400/25 bg-emerald-950/40 p-2.5 text-center text-xs leading-relaxed text-emerald-200">
          {alerta}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex w-full flex-wrap items-center justify-center gap-2">
        <button
          className="flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/15 px-3.5 py-2 text-xs font-semibold text-emerald-200 shadow-lg transition hover:bg-emerald-400/25 active:scale-95"
          onClick={handleCargar}
          type="button"
        >
          <Battery size={14} /> + cargar()
        </button>

        <button
          className="flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-400/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 shadow-lg transition hover:bg-cyan-400/25 active:scale-95"
          onClick={handleEnfriar}
          type="button"
        >
          <Flame size={14} /> + enfriar()
        </button>

        <button
          className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[.05] px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[.1] active:scale-95"
          onClick={handleApagar}
          type="button"
        >
          <Power size={14} /> {encendido ? "+ apagar()" : "+ encender()"}
        </button>

        <button
          className="flex items-center gap-1.5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 active:scale-95"
          onClick={handleIntentoIlegal}
          type="button"
        >
          <ShieldAlert size={14} /> − mod_directa (error)
        </button>
      </div>
    </div>
  );
}
