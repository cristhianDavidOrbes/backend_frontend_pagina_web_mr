"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Award,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Code2,
  Glasses,
  Medal,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { LearningPath } from "@/components/learning-path";
import { LevelObject } from "@/components/level-object";
import { Reveal, Stagger, StaggerItem } from "@/components/reveal";
import { Notice, ProgressBar, Stat } from "@/components/ui";
import { ApiRequestError, apiRequest } from "@/lib/client-api";
import { PUNTAJE_MAXIMO_NIVEL, RUTA_MR, TOTAL_NIVELES_MR, esNivelDeRuta, nivelActualEnRuta, nivelRuta } from "@/lib/ruta-mr";
import type { Nivel, ProgresoNivel, ProgresoUsuario, Ranking, ReporteNivel } from "@/lib/types";
import { useAuthSession } from "@/lib/use-auth-session";

type EstadoNivel = "completado" | "actual" | "disponible" | "bloqueado";

export default function EstudiantePage() {
  const reduce = useReducedMotion();
  const { hydrated, token, usuario: sesion } = useAuthSession();
  const [progreso, setProgreso] = useState<ProgresoUsuario | null>(null);
  const [reportes, setReportes] = useState<ReporteNivel[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated || !token) return;
    let cancelado = false;
    const opciones = { signal: AbortSignal.timeout(45_000) };

    apiRequest<ProgresoUsuario>("/api/progreso", token, opciones)
      .then((avance) => { if (!cancelado) setProgreso(avance); })
      .catch((reason: unknown) => {
        if (cancelado) return;
        if (reason instanceof ApiRequestError && reason.status === 401) return;
        setError("No se pudo actualizar tu progreso. Puedes seguir explorando; intenta recargar más tarde.");
      })
      .finally(() => { if (!cancelado) setLoading(false); });

    apiRequest<ReporteNivel[]>("/api/reportes", token, opciones)
      .then((datos) => { if (!cancelado) setReportes(Array.isArray(datos) ? datos : []); })
      .catch(() => { /* El panel sigue disponible aunque los diagnósticos tarden. */ });
    apiRequest<Nivel[]>("/api/niveles", token, opciones)
      .then((datos) => { if (!cancelado) setNiveles([...datos].sort((a, b) => a.nivel - b.nivel)); })
      .catch(() => { /* Se conserva la descripción local de los niveles. */ });
    apiRequest<Ranking>("/api/ranking", token, opciones)
      .then((datos) => { if (!cancelado) setRanking(datos); })
      .catch(() => { /* El ranking no bloquea el laboratorio. */ });

    return () => { cancelado = true; };
  }, [hydrated, token]);

  const usuario = sesion;
  // Solo cuentan los cuatro niveles de la ruta MR; 5 y 6 siguen en diseño.
  const resultados = useMemo(
    () => new Map<number, ProgresoNivel>((progreso?.niveles ?? []).filter((n) => esNivelDeRuta(n.nivel)).map((n) => [n.nivel, n])),
    [progreso],
  );
  const reportesRuta = useMemo(() => reportes.filter((r) => esNivelDeRuta(r.nivel)), [reportes]);
  const completados = RUTA_MR.filter((n) => resultados.get(n.nivel)?.completado).length;
  const rutaCompleta = completados === TOTAL_NIVELES_MR;
  const nivelActual = nivelActualEnRuta(progreso?.nivelActual ?? usuario?.nivelActual);
  const porcentajeRuta = Math.round((completados / TOTAL_NIVELES_MR) * 100);
  const posicion = ranking?.estudiantes.find((item) => item.usuarioId === usuario?.id)?.posicion;
  const ultimoReporte = reportesRuta.length ? reportesRuta[reportesRuta.length - 1] : null;

  function estado(n: number): EstadoNivel {
    if (resultados.get(n)?.completado) return "completado";
    if (n === nivelActual && !rutaCompleta) return "actual";
    if (n < nivelActual) return "disponible";
    return "bloqueado";
  }

  const logros = [
    { id: "primero", icon: Star, titulo: "Primer nivel superado", logrado: completados >= 1 },
    { id: "diagnostico", icon: BrainCircuit, titulo: "Primer diagnóstico del tutor", logrado: reportesRuta.length >= 1 },
    { id: "perfecto", icon: Award, titulo: "Puntaje perfecto en un nivel", logrado: [...resultados.values()].some((r) => r.completado && r.puntaje >= PUNTAJE_MAXIMO_NIVEL) },
    { id: "ruta", icon: Medal, titulo: "Ruta de realidad mixta completa", logrado: rutaCompleta },
  ];

  if (!usuario) return null;

  const siguiente = nivelRuta(nivelActual);

  return (
    <div className="home">
      <div className="home-main">
        {error ? <Notice tone="warning">{error}</Notice> : null}

        {/* Siguiente paso */}
        <Reveal as="section" className="next-step glass">
          <div className="next-step-copy">
            <p className="eyebrow">¡Hola, {primerNombre(usuario.nombre)}!</p>
            <h1 className="display-2 mt-2">
              {rutaCompleta ? <>¡Ruta <span className="gradient-text">completa!</span></> : <>Sigue con <span className="gradient-text">{siguiente.concepto.toLowerCase()}</span></>}
            </h1>
            <p className="headset-hint"><Glasses size={18} /> {rutaCompleta ? "Repite niveles en tus gafas para subir tu puntaje" : `Nivel ${siguiente.nivel} · se juega en tus gafas`}</p>
            <div className="mt-6 max-w-sm">
              <div className="mb-2 flex items-center justify-between text-sm font-extrabold">
                <span className="muted">Tu ruta</span>
                <span className="num">{completados}/{TOTAL_NIVELES_MR}</span>
              </div>
              <ProgressBar label="Progreso de la ruta de realidad mixta" value={porcentajeRuta} />
            </div>
          </div>
          <motion.div
            animate={reduce ? undefined : { y: [0, -10, 0], rotate: [0, -2, 0] }}
            className="next-step-object"
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <LevelObject objeto={siguiente.objeto} size={150} />
          </motion.div>
        </Reveal>

        {loading ? <div className="loading-card">Actualizando tu progreso…</div> : null}

        {/* Camino de cuatro niveles con estados reales */}
        <section aria-label="Tu ruta de cuatro niveles" className="home-path">
          <LearningPath
            detalle={(nivel, e) => {
              const r = resultados.get(nivel.nivel);
              const info = niveles.find((n) => n.nivel === nivel.nivel);
              return (
                <>
                  <span className={`badge ${e === "completado" ? "badge-action" : e === "actual" ? "badge-info" : ""}`}>{etiquetaEstado(e as EstadoNivel)}</span>
                  <strong>{info?.nombre || nivel.concepto}</strong>
                  <p>{r?.completado ? `Mejor puntaje: ${r.puntaje}/${PUNTAJE_MAXIMO_NIVEL} · ${r.intentos} intento${r.intentos === 1 ? "" : "s"}` : e === "bloqueado" ? "Supera el nivel anterior para desbloquearlo." : nivel.enGafas}</p>
                  {r?.completado ? <Link className="btn btn-secondary btn-sm btn-block" href="/estudiante/reportes" transitionTypes={["nav-forward"]}>Ver qué aprendí</Link> : null}
                </>
              );
            }}
            estado={(nivel) => estado(nivel.nivel)}
            meta={{ titulo: rutaCompleta ? "¡Ruta completa!" : "Meta: ruta completa", logrado: rutaCompleta }}
          />
        </section>
      </div>

      <aside className="home-rail">
        <Stagger className="grid grid-cols-2 gap-3">
          <StaggerItem><Stat icon={<Zap size={18} />} label="Puntos" tone="action" value={progreso?.puntajeTotal ?? usuario.puntaje ?? 0} /></StaggerItem>
          <StaggerItem><Stat icon={<Clock3 size={18} />} label="Jugado" tone="info" value={formatearTiempo(progreso?.tiempoJugadoSegundos ?? usuario.tiempoJugadoSegundos ?? 0)} /></StaggerItem>
          <StaggerItem><Stat icon={<CheckCircle2 size={18} />} label="Niveles" tone="progress" value={`${completados}/${TOTAL_NIVELES_MR}`} /></StaggerItem>
          <StaggerItem><Stat icon={<Trophy size={18} />} label="Ranking" value={posicion ? `#${posicion}` : "—"} /></StaggerItem>
        </Stagger>

        <Reveal as="section" className="card card-pad">
          <div className="flex items-center justify-between gap-3">
            <h2 className="title-md">Tu tutor dice</h2>
            <Link className="link text-sm" href="/estudiante/reportes" transitionTypes={["nav-forward"]}>Ver todo</Link>
          </div>
          {ultimoReporte ? (
            <div className="mt-4 grid gap-3">
              <div className="flex items-center gap-3">
                <div className="score-ring" style={{ "--score": `${ultimoReporte.dominio * 3.6}deg` } as CSSProperties}>
                  <strong>{ultimoReporte.dominio}</strong><span>%</span>
                </div>
                <div className="min-w-0">
                  <p className="subtle text-sm font-bold">Nivel {ultimoReporte.nivel}</p>
                  <p className="font-extrabold">{ultimoReporte.tituloNivel}</p>
                </div>
              </div>
              <p className="tutor-bubble">{ultimoReporte.recomendaciones[0] ?? ultimoReporte.resumen}</p>
            </div>
          ) : (
            <p className="tutor-bubble mt-4">Completa un nivel en las gafas y te diré qué lograste y qué sigue.</p>
          )}
        </Reveal>

        <Reveal as="section" className="card card-pad" delay={0.05}>
          <h2 className="title-md">Logros</h2>
          <ul className="achievements">
            {logros.map((logro, i) => (
              <motion.li
                animate={{ opacity: 1, scale: 1 }}
                className={logro.logrado ? "is-earned" : ""}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.85 }}
                key={logro.id}
                transition={{ delay: 0.15 + i * 0.07, type: "spring", stiffness: 300, damping: 20 }}
              >
                <span className="achievement-icon"><logro.icon size={18} /></span>
                <span>{logro.titulo}</span>
              </motion.li>
            ))}
          </ul>
        </Reveal>

        <Reveal as="section" className="card card-pad code-promo" delay={0.1}>
          <h2 className="title-md">Practica en código</h2>
          <p className="muted mt-1 text-sm font-semibold">Retos cortos en Python o Java. Aparte de la ruta en gafas.</p>
          <Link className="btn btn-secondary btn-sm mt-4" href="/estudiante/codigo" transitionTypes={["nav-forward"]}><Code2 size={16} /> Programar POO</Link>
        </Reveal>
      </aside>
    </div>
  );
}

function etiquetaEstado(e: EstadoNivel) {
  return e === "completado" ? "Completado" : e === "actual" ? "Siguiente" : e === "disponible" ? "Disponible" : "Bloqueado";
}

function primerNombre(nombre?: string) {
  const limpio = nombre?.trim();
  return limpio ? limpio.split(/\s+/)[0] : "estudiante";
}

function formatearTiempo(segundos: number) {
  const total = Math.max(0, Math.floor(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  if (horas > 0) return `${horas}h ${String(minutos).padStart(2, "0")}m`;
  return `${minutos}m`;
}
