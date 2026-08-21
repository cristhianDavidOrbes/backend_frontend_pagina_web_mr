"use client";

import Link from "next/link";
import { useState } from "react";
import { Code2, CheckCircle2, Circle, Lock, Trophy, ChevronRight } from "lucide-react";
import { OOP_NIVELES } from "@/lib/oop-niveles";

const STORAGE_KEY = "oop_progreso";

type NivelProgreso = {
  completado: boolean;
  puntos: number;
  intentos: number;
  usoPista: boolean;
};

type OopProgreso = {
  lenguaje: "python" | "java";
  niveles: Record<string, NivelProgreso>;
  puntajeTotal: number;
};

function cargarProgreso(): OopProgreso {
  if (typeof window === "undefined") {
    return { lenguaje: "python", niveles: {}, puntajeTotal: 0 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OopProgreso;
  } catch {
    /* ignore */
  }
  return { lenguaje: "python", niveles: {}, puntajeTotal: 0 };
}

const COLOR_MAP: Record<string, string> = {
  cyan: "text-cyan-300",
  amber: "text-amber-300",
  emerald: "text-emerald-300",
  violet: "text-violet-300",
  sky: "text-sky-300",
  rose: "text-rose-300",
  purple: "text-purple-300",
  yellow: "text-yellow-300",
};

const BG_MAP: Record<string, string> = {
  cyan: "border-cyan-500/30 bg-cyan-500/5",
  amber: "border-amber-500/30 bg-amber-500/5",
  emerald: "border-emerald-500/30 bg-emerald-500/5",
  violet: "border-violet-500/30 bg-violet-500/5",
  sky: "border-sky-500/30 bg-sky-500/5",
  rose: "border-rose-500/30 bg-rose-500/5",
  purple: "border-purple-500/30 bg-purple-500/5",
  yellow: "border-yellow-500/30 bg-yellow-500/5",
};

export default function CodigoPage() {
  const [progreso, setProgreso] = useState<OopProgreso>(() => cargarProgreso());
  const [lenguaje, setLenguaje] = useState<"python" | "java">(() => cargarProgreso().lenguaje);

  function cambiarLenguaje(lang: "python" | "java") {
    setLenguaje(lang);
    const nuevo = { ...progreso, lenguaje: lang };
    setProgreso(nuevo);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevo));
  }

  const puntajeTotal = Object.values(progreso.niveles).reduce((sum, n) => sum + n.puntos, 0);
  const completados = Object.values(progreso.niveles).filter((n) => n.completado).length;

  return (
    <main className="oop-main">
      {/* Header */}
      <header className="oop-page-header">
        <div className="oop-page-title-row">
          <div className="oop-page-icon">
            <Code2 size={24} />
          </div>
          <div>
            <p className="section-kicker">Módulo Extra · POO</p>
            <h1 className="oop-page-title">Aprende a Programar con Objetos</h1>
            <p className="oop-page-subtitle">
              Python y Java · 8 niveles · Desde cero hasta los 4 pilares de POO
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="oop-stats-row">
          <div className="oop-stat-card">
            <Trophy size={18} className="text-yellow-400" />
            <span className="oop-stat-value">{puntajeTotal}</span>
            <span className="oop-stat-label">puntos</span>
          </div>
          <div className="oop-stat-card">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <span className="oop-stat-value">{completados}</span>
            <span className="oop-stat-label">de {OOP_NIVELES.length} niveles</span>
          </div>
        </div>
      </header>

      {/* Language selector */}
      <div className="oop-lang-selector">
        <p className="oop-lang-label">Lenguaje:</p>
        <div className="oop-lang-tabs">
          <button
            className={`oop-lang-tab ${lenguaje === "python" ? "active" : ""}`}
            onClick={() => cambiarLenguaje("python")}
          >
            🐍 Python
          </button>
          <button
            className={`oop-lang-tab ${lenguaje === "java" ? "active" : ""}`}
            onClick={() => cambiarLenguaje("java")}
          >
            ☕ Java
          </button>
        </div>
        <p className="oop-lang-note">
          Puedes cambiar de lenguaje en cualquier momento. Tu progreso es independiente por nivel.
        </p>
      </div>

      {/* Progress bar */}
      <div className="oop-progress-bar-container">
        <div className="oop-progress-bar-track">
          <div
            className="oop-progress-bar-fill"
            style={{ width: `${(completados / OOP_NIVELES.length) * 100}%` }}
          />
        </div>
        <span className="oop-progress-label">
          {Math.round((completados / OOP_NIVELES.length) * 100)}% completado
        </span>
      </div>

      {/* Level grid */}
      <div className="oop-nivel-grid">
        {OOP_NIVELES.map((nivel, idx) => {
          const nivelProgreso = progreso.niveles[String(nivel.id)];
          const completado = nivelProgreso?.completado ?? false;
          const bloqueado = idx > 0 && !progreso.niveles[String(OOP_NIVELES[idx - 1].id)]?.completado;

          return (
            <div
              key={nivel.id}
              className={`oop-nivel-card border ${BG_MAP[nivel.color]} ${bloqueado ? "opacity-50" : ""}`}
            >
              <div className="oop-nivel-card-top">
                <span className="oop-nivel-emoji">{nivel.emoji}</span>
                <div className="oop-nivel-status">
                  {completado ? (
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  ) : bloqueado ? (
                    <Lock size={16} className="text-slate-500" />
                  ) : (
                    <Circle size={20} className="text-slate-600" />
                  )}
                </div>
              </div>

              <div className="oop-nivel-info">
                <p className={`oop-nivel-num ${COLOR_MAP[nivel.color]}`}>
                  Nivel {nivel.id} · {nivel.concepto}
                </p>
                <h3 className="oop-nivel-title">{nivel.titulo}</h3>
                <p className="oop-nivel-desc">{nivel.descripcionCorta}</p>
              </div>

              <div className="oop-nivel-footer">
                <div className="oop-nivel-pts">
                  <span className="text-yellow-400">⭐</span>
                  <span>
                    {completado
                      ? `${nivelProgreso.puntos} pts ganados`
                      : `hasta ${nivel.puntaje} pts`}
                  </span>
                </div>

                {bloqueado ? (
                  <span className="oop-locked-text">Completa el nivel anterior</span>
                ) : (
                  <Link
                    href={`/estudiante/codigo/${nivel.id}?lang=${lenguaje}`}
                    className="oop-nivel-btn"
                  >
                    {completado ? "Repasar" : "Empezar"}
                    <ChevronRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
