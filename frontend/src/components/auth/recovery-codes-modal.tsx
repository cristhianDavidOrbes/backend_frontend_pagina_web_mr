"use client";

import { useState } from "react";
import { Check, Copy, Download, KeyRound, ShieldAlert, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  codigos: string[];
};

export function RecoveryCodesModal({ isOpen, onClose, codigos }: Props) {
  const [copiado, setCopiado] = useState(false);

  if (!isOpen || codigos.length === 0) return null;

  async function handleCopiar() {
    const texto = `Códigos de Recuperación de AlgoLab UCC:\n\n${codigos.join("\n")}\n\nCada código solo puede utilizarse una vez. Guárdalos en un lugar seguro.`;
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  function handleDescargar() {
    const texto = `CÓDIGOS DE RECUPERACIÓN - ALGOLAB UCC\n====================================\n\n${codigos.join("\n")}\n\nGuarda estos códigos en un lugar seguro.\nCada código solo puede utilizarse una vez para acceder a tu cuenta si pierdes acceso a tu correo o dispositivo.\n`;
    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `algolab-codigos-recuperacion-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-emerald-500/30 bg-[#0c1527] p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Códigos de Recuperación</h3>
              <p className="text-xs text-slate-400">Guarda estos códigos en un lugar seguro</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p>
              Si alguna vez pierdes acceso a tu correo o aplicación de autenticación, podrás usar cualquiera de estos códigos de un solo uso para iniciar sesión.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-3.5 font-mono text-xs font-bold text-emerald-300">
            {codigos.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
                <span className="text-[10px] text-slate-500">{idx + 1}.</span>
                <span>{c}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopiar}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/10"
            >
              {copiado ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  ¡Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar todos
                </>
              )}
            </button>
            <button
              onClick={handleDescargar}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/10"
            >
              <Download className="h-4 w-4" />
              Descargar .txt
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
          >
            Entendido, ya guardé mis códigos
          </button>
        </div>
      </div>
    </div>
  );
}
