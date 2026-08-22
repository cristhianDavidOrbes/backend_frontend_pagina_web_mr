"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, type CSSProperties } from "react";
import {
  Code2,
  CheckCircle2,
  Circle,
  Lock,
  Trophy,
  ChevronRight,
  Sparkles,
  BookOpen,
  Gamepad2,
  TerminalSquare,
  ArrowRight,
  Target,
  Zap,
  Clock3,
} from "lucide-react";
import { OOP_NIVELES, type MiniNivel } from "@/lib/oop-niveles";
import { useAuthSession } from "@/lib/use-auth-session";
import { apiRequest } from "@/lib/client-api";
import styles from "./programar-poo.module.css";

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

function claveProgreso(usuarioId?: number) {
  return `${STORAGE_KEY}:${usuarioId ?? "anonimo"}`;
}

function cargarProgresoLocal(usuarioId?: number): OopProgreso {
  if (typeof window === "undefined") {
    return { lenguaje: "python", niveles: {}, puntajeTotal: 0 };
  }
  try {
    const raw = localStorage.getItem(claveProgreso(usuarioId));
    if (raw) return JSON.parse(raw) as OopProgreso;
  } catch {
    /* ignore */
  }
  return { lenguaje: "python", niveles: {}, puntajeTotal: 0 };
}

function guardarProgresoLocal(p: OopProgreso, usuarioId?: number) {
  if (typeof window !== "undefined") {
    localStorage.setItem(claveProgreso(usuarioId), JSON.stringify(p));
  }
}

function fusionarNivelProgreso(
  local: NivelProgreso | undefined,
  remoto: NivelProgreso,
): NivelProgreso {
  if (!local) return remoto;

  return {
    completado: local.completado || remoto.completado,
    puntos: Math.max(local.puntos, remoto.puntos),
    intentos: Math.max(local.intentos, remoto.intentos),
    usoPista: local.usoPista || remoto.usoPista,
  };
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
  const [lenguaje, setLenguaje] = useState<"python" | "java">("python");

  // Sincronizar con el backend al montar o al obtener token
  useEffect(() => {
    if (!usuario?.id) return;

    let cancelado = false;
    const local = cargarProgresoLocal(usuario.id);
    queueMicrotask(() => {
      if (cancelado) return;
      setProgreso(local);
      setLenguaje(local.lenguaje);
    });
    if (!token) return () => { cancelado = true; };

    apiRequest<ProgresoOopBackend>("/api/oop/progreso", token)
      .then((data) => {
        if (cancelado || !data || !data.niveles) return;

        setProgreso((prev) => {
          const actualizados: Record<string, NivelProgreso> = { ...prev.niveles };
          data.niveles.forEach((n) => {
            const claveNivel = String(n.nivel);
            const remoto: NivelProgreso = {
              completado: n.completado,
              puntos: n.puntaje,
              intentos: n.intentos,
              usoPista: n.usoPista,
            };
            actualizados[claveNivel] = fusionarNivelProgreso(
              actualizados[claveNivel],
              remoto,
            );
          });

          const totalFusionado = Object.values(actualizados).reduce(
            (total, nivel) => total + nivel.puntos,
            0,
          );

          const nuevo: OopProgreso = {
            lenguaje: prev.lenguaje,
            niveles: actualizados,
            puntajeTotal: Math.max(
              prev.puntajeTotal,
              data.puntajeOopTotal ?? 0,
              totalFusionado,
            ),
            puntajeGlobal: data.puntajeGlobalTotal,
          };
          guardarProgresoLocal(nuevo, usuario.id);
          return nuevo;
        });
      })
      .catch(() => {
        // Fallback transparente a localStorage si el backend no responde
      });
    return () => { cancelado = true; };
  }, [token, usuario?.id]);

  function cambiarLenguaje(lang: "python" | "java") {
    setLenguaje(lang);
    setProgreso((prev) => {
      const nuevo = { ...prev, lenguaje: lang };
      guardarProgresoLocal(nuevo, usuario?.id);
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
  // usuario.puntaje ya incluye OOP; sumarlo otra vez en el fallback duplicaba
  // el total cuando el endpoint específico estaba temporalmente indisponible.
  const puntajeGlobal = progreso.puntajeGlobal ?? usuario?.puntaje ?? puntajeOopTotal;
  const completados = Object.values(progreso.niveles).filter((n) => n.completado).length;
  const porcentaje = Math.round((completados / OOP_NIVELES.length) * 100);
  const intentosTotales = Object.values(progreso.niveles).reduce(
    (total, nivel) => total + nivel.intentos,
    0,
  );
  const puntosDisponibles = OOP_NIVELES.reduce((total, nivel) => total + nivel.puntaje, 0);
  const puntosRestantes = OOP_NIVELES.reduce(
    (total, nivel) =>
      total + (progreso.niveles[String(nivel.id)]?.completado ? 0 : nivel.puntaje),
    0,
  );
  const siguienteNivel = OOP_NIVELES.find((nivel, index) => {
    if (progreso.niveles[String(nivel.id)]?.completado) return false;
    return index === 0 || progreso.niveles[String(OOP_NIVELES[index - 1].id)]?.completado;
  });
  const rutaCompleta = OOP_NIVELES.every(
    (nivel) => progreso.niveles[String(nivel.id)]?.completado,
  );

  return (
    <main className={`oop-main ${styles.routePage}`}>
      {/* Header */}
      <header className="oop-page-header">
        <div className="oop-page-title-row">
          <div className="oop-page-icon">
            <Code2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="section-kicker">Contenido adicional · laboratorio de código</p>
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                Suma Puntos Globales
              </span>
            </div>
            <h1 className="oop-page-title">Programa POO fuera de las gafas</h1>
            <p className="oop-page-subtitle">
              Un complemento opcional de AlgoLab para llevar a código lo que ya tocaste y comprendiste en realidad mixta.
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

      <section className={styles.missionHero} aria-labelledby="mision-programar-poo">
        <div className={styles.missionCopy}>
          <span className={styles.liveBadge}>
            <span aria-hidden="true" /> {rutaCompleta ? "RUTA DOMINADA" : "MISIÓN ACTIVA"}
          </span>
          <p className={styles.eyebrow}>
            {rutaCompleta ? "Laboratorio completado" : `Siguiente desafío · ${siguienteNivel?.subnivel ?? "1.1"}`}
          </p>
          <h2 id="mision-programar-poo">
            {rutaCompleta ? "Tu colección POO está completa" : siguienteNivel?.titulo ?? "Variables y Tipos"}
          </h2>
          <p>
            {rutaCompleta
              ? "Puedes repetir cualquier reto, probar el otro lenguaje y perfeccionar tus soluciones sin perder el progreso."
              : siguienteNivel?.descripcionCorta ?? "Convierte lo aprendido en una solución real de código."}
          </p>

          <div className={styles.missionActions}>
            <Link
              href={`/estudiante/codigo/${siguienteNivel?.id ?? OOP_NIVELES[0].id}?lang=${lenguaje}`}
              className={styles.primaryMissionButton}
            >
              {rutaCompleta ? "Volver al laboratorio" : completados > 0 ? "Continuar misión" : "Comenzar aventura"}
              <ArrowRight size={17} />
            </Link>
            <span className={styles.shortcutHint}>
              <TerminalSquare size={15} /> Código ejecutado en tu navegador
            </span>
          </div>

          <div className={styles.missionMetrics}>
            <span><Target size={15} /> {OOP_NIVELES.length - completados} retos pendientes</span>
            <span><Zap size={15} /> {puntosRestantes} XP disponibles</span>
            <span><Clock3 size={15} /> {intentosTotales} ejecuciones guardadas</span>
          </div>
        </div>

        <div className={styles.progressCore} aria-label={`${porcentaje}% de la ruta completado`}>
          <div
            className={styles.progressRing}
            style={{ "--route-progress": `${porcentaje * 3.6}deg` } as CSSProperties}
          >
            <div className={styles.progressRingInner}>
              <strong>{porcentaje}%</strong>
              <span>RUTA POO</span>
            </div>
          </div>
          <div className={styles.scoreDock}>
            <span>XP CONSEGUIDA</span>
            <strong>{puntajeOopTotal}<small> / {puntosDisponibles}</small></strong>
          </div>
        </div>
      </section>

      <section className="oop-additional-banner" aria-label="Cómo funciona Programar POO">
        <div className="oop-additional-copy">
          <span className="oop-additional-badge">MODO COMPLEMENTARIO</span>
          <h2>De los objetos físicos al código, sin reemplazar la experiencia VR.</h2>
          <p>
            Practica a tu ritmo en Python o Java. Cada reto combina documentación breve, editor, terminal y
            validación del concepto; los puntos se sincronizan con tu perfil global de AlgoLab.
          </p>
        </div>
        <div className="oop-additional-flow" aria-label="Flujo del módulo">
          <span><Gamepad2 size={17} /> Comprende en MR</span>
          <ChevronRight size={16} />
          <span><BookOpen size={17} /> Consulta la guía</span>
          <ChevronRight size={16} />
          <span><TerminalSquare size={17} /> Programa y ejecuta</span>
        </div>
      </section>

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
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <span className="oop-progress-label">
          {porcentaje}% completado
        </span>
      </div>

      {rutaCompleta ? (
        <section className="oop-konami-reward" aria-label="Recompensa secreta de Programar POO">
          <div>
            <span className="oop-konami-crown">🏆 TROFEO DE MAESTRÍA POO</span>
            <h2>Desbloqueaste el secreto mejor guardado de AlgoLab</h2>
            <p>
              Esta recompensa solo aparece al completar los ocho subniveles. Memoriza la secuencia y pruébala
              dentro de las gafas.
            </p>
          </div>
          <div className="oop-konami-code" aria-label="Código Konami">
            <strong>↑ ↑ ↓ ↓ ← ← → → B A</strong>
            <small>
              Como <b>invitado</b>: úsalo después de ver o saltar el tutorial, fuera de cualquier nivel, para
              desbloquear la ruta. En el <b>nivel 3</b>: introdúcelo durante la práctica y observa al robot.
            </small>
          </div>
        </section>
      ) : null}

      {/* Modules and Sublevels list in 2-column grid */}
      <div className="oop-modules-grid">
        {modulos.map((mod) => {
          const subnivelesCompletados = mod.niveles.filter((n) => progreso.niveles[String(n.id)]?.completado).length;

          return (
            <section key={mod.numero} className={`oop-module-card ${styles.moduleStage}`}>
              {/* Module Header */}
              <div className={styles.moduleHeader}>
                <div className="flex items-center gap-2">
                  <span className={styles.moduleNumber}>{String(mod.numero).padStart(2, "0")}</span>
                  <div>
                    <p>CAPÍTULO</p>
                    <h2>{mod.nombre}</h2>
                  </div>
                </div>
                <span className={styles.moduleCounter}>
                  {subnivelesCompletados} de {mod.niveles.length} completados
                </span>
                <div className={styles.moduleProgress} aria-hidden="true">
                  <span style={{ width: `${(subnivelesCompletados / mod.niveles.length) * 100}%` }} />
                </div>
              </div>

              {/* Sublevels Grid (2 sub-levels side by side) */}
              <div className="oop-module-levels">
                {mod.niveles.map((nivel) => {
                  const nivelIdx = OOP_NIVELES.findIndex((n) => n.id === nivel.id);
                  const nivelProgreso = progreso.niveles[String(nivel.id)];
                  const completado = nivelProgreso?.completado ?? false;
                  const bloqueado = nivelIdx > 0 && !progreso.niveles[String(OOP_NIVELES[nivelIdx - 1].id)]?.completado;

                  return (
                    <div
                      key={nivel.id}
                      className={`oop-nivel-card ${styles.levelCard} flex flex-col justify-between border ${BG_MAP[nivel.color]} ${bloqueado ? `${styles.levelLocked} opacity-50` : ""} ${completado ? styles.levelComplete : ""}`}
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

                        <div className={styles.levelSignal} aria-hidden="true">
                          <span />
                          <span />
                          <span />
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
                          <span className="oop-locked-text text-[11px]">Completa el reto anterior</span>
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
