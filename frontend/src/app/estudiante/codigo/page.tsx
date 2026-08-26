"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  CheckCircle2,
  Circle,
  Lock,
  ChevronRight,
  ArrowRight,
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
  const completados = Object.values(progreso.niveles).filter((n) => n.completado).length;
  const porcentaje = Math.round((completados / OOP_NIVELES.length) * 100);
  const siguienteNivel = OOP_NIVELES.find((nivel, index) => {
    if (progreso.niveles[String(nivel.id)]?.completado) return false;
    return index === 0 || progreso.niveles[String(OOP_NIVELES[index - 1].id)]?.completado;
  });
  const rutaCompleta = OOP_NIVELES.every(
    (nivel) => progreso.niveles[String(nivel.id)]?.completado,
  );

  return (
    <main className={`oop-main ${styles.routePage}`}>
      <header className={styles.compactRouteHeader}>
        <div>
          <span className={styles.optionalBadge}>COMPLEMENTO OPCIONAL</span>
          <h1>Programar POO</h1>
          <p>Practica en código los conceptos que aprendiste con objetos en las gafas.</p>
        </div>
        <div className={styles.routeSummary} aria-label="Resumen de tu progreso">
          <strong>{completados}/{OOP_NIVELES.length}</strong>
          <span>retos completados</span>
          <b>{puntajeOopTotal} pts</b>
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
          </div>

          <div className={styles.languageOrb} aria-label="Lenguaje de aprendizaje">
            <span>LENGUAJE</span>
            <button
              type="button"
              aria-pressed={lenguaje === "python"}
              onClick={() => cambiarLenguaje("python")}
            >
              <span aria-hidden="true">🐍</span> Python
            </button>
            <button
              type="button"
              aria-pressed={lenguaje === "java"}
              onClick={() => cambiarLenguaje("java")}
            >
              <span aria-hidden="true">☕</span> Java
            </button>
          </div>

          <div className={styles.compactProgress} aria-label={`${porcentaje}% de la ruta completado`}>
            <div><span style={{ width: `${porcentaje}%` }} /></div>
            <small>{porcentaje}% completado</small>
          </div>
        </div>
      </section>

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
              <div className={styles.moduleHeader}>
                <div className={styles.moduleIdentity}>
                  <span className={styles.moduleNumber}>{String(mod.numero).padStart(2, "0")}</span>
                  <h2>{mod.nombre}</h2>
                </div>
                <span className={styles.moduleCounter}>
                  {subnivelesCompletados}/{mod.niveles.length}
                </span>
                <div className={styles.moduleProgress} aria-hidden="true">
                  <span style={{ width: `${(subnivelesCompletados / mod.niveles.length) * 100}%` }} />
                </div>
              </div>

              <div className="oop-module-levels">
                {mod.niveles.map((nivel) => {
                  const nivelIdx = OOP_NIVELES.findIndex((n) => n.id === nivel.id);
                  const nivelProgreso = progreso.niveles[String(nivel.id)];
                  const completado = nivelProgreso?.completado ?? false;
                  const bloqueado = nivelIdx > 0 && !progreso.niveles[String(OOP_NIVELES[nivelIdx - 1].id)]?.completado;

                  return (
                    <div
                      key={nivel.id}
                      className={`${styles.compactLevelCard} border ${BG_MAP[nivel.color]} ${bloqueado ? `${styles.levelLocked} opacity-50` : ""} ${completado ? styles.levelComplete : ""}`}
                    >
                      <span className={styles.compactLevelEmoji}>{nivel.emoji}</span>
                      <div className={styles.compactLevelCopy}>
                        <div className={styles.compactLevelMeta}>
                          <span>Subnivel {nivel.subnivel}</span>
                          <b className={COLOR_MAP[nivel.color]}>{nivel.concepto}</b>
                        </div>
                        <h3>{nivel.titulo}</h3>
                      </div>
                      <div className={styles.compactLevelAction}>
                        {bloqueado ? (
                          <span className={styles.lockedLabel}><Lock size={13} /> Anterior</span>
                        ) : (
                          <Link
                            href={`/estudiante/codigo/${nivel.id}?lang=${lenguaje}`}
                            className={styles.compactLevelButton}
                          >
                            {completado ? "Repasar" : "Empezar"}
                            <ChevronRight size={13} />
                          </Link>
                        )}
                        <span className={styles.compactPoints}>
                          {completado ? <CheckCircle2 size={14} /> : bloqueado ? <Lock size={13} /> : <Circle size={13} />}
                          {completado ? nivelProgreso.puntos : nivel.puntaje} pts
                        </span>
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
