"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Code2, CheckCircle2, Circle, Lock, Trophy, ChevronRight, Sparkles, BookOpen } from "lucide-react";
import { OOP_NIVELES, type MiniNivel } from "@/lib/oop-niveles";
import { useAuthSession } from "@/lib/use-auth-session";
import { apiRequest } from "@/lib/client-api";

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
  puntajeGlobal?: number;
};

type ProgresoOopBackend = {
  usuarioId: number;
  puntajeOopTotal: number;
  puntajeGlobalTotal: number;
  niveles: Array<{
    id: number;
    nivel: number;
    lenguaje: string;
    completado: boolean;
    puntaje: number;
    intentos: number;
    usoPista: boolean;
  }>;
};

function cargarProgresoLocal(): OopProgreso {
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

function guardarProgresoLocal(p: OopProgreso) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }
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
  const { token, usuario } = useAuthSession();
  const [progreso, setProgreso] = useState<OopProgreso>(() => cargarProgresoLocal());
  const [lenguaje, setLenguaje] = useState<"python" | "java">(() => cargarProgresoLocal().lenguaje);

  // Sincronizar con el backend al montar o al obtener token
  useEffect(() => {
    if (!token) return;

    apiRequest<ProgresoOopBackend>("/api/oop/progreso", token)
      .then((data) => {
        if (!data || !data.niveles) return;

        setProgreso((prev) => {
          const actualizados: Record<string, NivelProgreso> = { ...prev.niveles };
          data.niveles.forEach((n) => {
            actualizados[String(n.nivel)] = {
              completado: n.completado,
              puntos: n.puntaje,
              intentos: n.intentos,
              usoPista: n.usoPista,
            };
          });

          const nuevo: OopProgreso = {
            lenguaje: prev.lenguaje,
            niveles: actualizados,
            puntajeTotal: data.puntajeOopTotal ?? prev.puntajeTotal,
            puntajeGlobal: data.puntajeGlobalTotal,
          };
          guardarProgresoLocal(nuevo);
          return nuevo;
        });
      })
      .catch(() => {
        // Fallback transparente a localStorage si el backend no responde
      });
  }, [token]);

  function cambiarLenguaje(lang: "python" | "java") {
    setLenguaje(lang);
    setProgreso((prev) => {
      const nuevo = { ...prev, lenguaje: lang };
      guardarProgresoLocal(nuevo);
      return nuevo;
    });
  }

  // Agrupar niveles por Módulo y Subniveles
  const modulos = useMemo(() => {
    const map = new Map<number, { nombre: string; niveles: MiniNivel[] }>();
    OOP_NIVELES.forEach((n) => {
      if (!map.has(n.moduloNumero)) {
        map.set(n.moduloNumero, { nombre: n.moduloNombre, niveles: [] });
      }
      map.get(n.moduloNumero)!.niveles.push(n);
    });
    return Array.from(map.entries()).map(([numero, data]) => ({
      numero,
      nombre: data.nombre,
      niveles: data.niveles,
    }));
  }, []);

  const puntajeOopTotal = Object.values(progreso.niveles).reduce((sum, n) => sum + n.puntos, 0);
  const puntajeGlobal = progreso.puntajeGlobal ?? (usuario?.puntaje ? usuario.puntaje + puntajeOopTotal : puntajeOopTotal);
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
            <div className="flex items-center gap-2">
              <p className="section-kicker">Módulo de Programación POO</p>
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                Suma Puntos Globales
              </span>
            </div>
            <h1 className="oop-page-title">Aprende Python y Java con Objetos</h1>
            <p className="oop-page-subtitle">
              4 Módulos estructurados · 8 Subniveles interactivos · Compilador 100% local
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="oop-stats-row">
          <div className="oop-stat-card">
            <Trophy size={18} className="text-yellow-400" />
            <div>
              <span className="oop-stat-value">{puntajeOopTotal}</span>
              <span className="oop-stat-label"> pts OOP</span>
            </div>
          </div>
          <div className="oop-stat-card">
            <Sparkles size={18} className="text-cyan-400" />
            <div>
              <span className="oop-stat-value">{puntajeGlobal}</span>
              <span className="oop-stat-label"> pts Totales</span>
            </div>
          </div>
          <div className="oop-stat-card">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <div>
              <span className="oop-stat-value">{completados}</span>
              <span className="oop-stat-label"> de {OOP_NIVELES.length} subniveles</span>
            </div>
          </div>
        </div>
      </header>

      {/* Language selector */}
      <div className="oop-lang-selector">
        <p className="oop-lang-label">Lenguaje de aprendizaje:</p>
        <div className="oop-lang-tabs">
          <button
            className={`oop-lang-tab ${lenguaje === "python" ? "active" : ""}`}
            onClick={() => cambiarLenguaje("python")}
          >
            🐍 Python (Pyodide local)
          </button>
          <button
            className={`oop-lang-tab ${lenguaje === "java" ? "active" : ""}`}
            onClick={() => cambiarLenguaje("java")}
          >
            ☕ Java (Compilador local)
          </button>
        </div>
        <p className="oop-lang-note">
          Puedes alternar de lenguaje cuando desees. Los códigos iniciales son limpios para que practiques desde cero.
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

      {/* Modules and Sublevels list in 2-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {modulos.map((mod) => {
          const subnivelesCompletados = mod.niveles.filter((n) => progreso.niveles[String(n.id)]?.completado).length;

          return (
            <section key={mod.numero} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-lg">
              {/* Module Header */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-emerald-400" />
                  <h2 className="text-base font-bold text-white">{mod.nombre}</h2>
                </div>
                <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
                  {subnivelesCompletados} de {mod.niveles.length} completados
                </span>
              </div>

              {/* Sublevels Grid (2 sub-levels side by side) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
                {mod.niveles.map((nivel) => {
                  const nivelIdx = OOP_NIVELES.findIndex((n) => n.id === nivel.id);
                  const nivelProgreso = progreso.niveles[String(nivel.id)];
                  const completado = nivelProgreso?.completado ?? false;
                  const bloqueado = nivelIdx > 0 && !progreso.niveles[String(OOP_NIVELES[nivelIdx - 1].id)]?.completado;

                  return (
                    <div
                      key={nivel.id}
                      className={`oop-nivel-card flex flex-col justify-between border ${BG_MAP[nivel.color]} ${bloqueado ? "opacity-50" : ""}`}
                    >
                      <div className="space-y-2.5">
                        <div className="oop-nivel-card-top">
                          <div className="flex items-center gap-2">
                            <span className="oop-nivel-emoji">{nivel.emoji}</span>
                            <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-300">
                              Subnivel {nivel.subnivel}
                            </span>
                          </div>
                          <div className="oop-nivel-status">
                            {completado ? (
                              <CheckCircle2 size={18} className="text-emerald-400" />
                            ) : bloqueado ? (
                              <Lock size={15} className="text-slate-500" />
                            ) : (
                              <Circle size={18} className="text-slate-600" />
                            )}
                          </div>
                        </div>

                        <div className="oop-nivel-info">
                          <p className={`oop-nivel-num text-[11px] ${COLOR_MAP[nivel.color]}`}>
                            {nivel.concepto}
                          </p>
                          <h3 className="oop-nivel-title text-sm font-bold">{nivel.titulo}</h3>
                          <p className="oop-nivel-desc text-xs text-slate-400 line-clamp-2">{nivel.descripcionCorta}</p>
                        </div>
                      </div>

                      <div className="oop-nivel-footer mt-4 pt-3 border-t border-white/5">
                        <div className="oop-nivel-pts text-xs">
                          <span className="text-yellow-400">⭐</span>
                          <span>
                            {completado
                              ? `${nivelProgreso.puntos} pts`
                              : `${nivel.puntaje} pts`}
                          </span>
                        </div>

                        {bloqueado ? (
                          <span className="oop-locked-text text-[11px]">Bloqueado</span>
                        ) : (
                          <Link
                            href={`/estudiante/codigo/${nivel.id}?lang=${lenguaje}`}
                            className="oop-nivel-btn text-xs py-1 px-2.5"
                          >
                            {completado ? "Repasar" : "Empezar"}
                            <ChevronRight size={13} />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
