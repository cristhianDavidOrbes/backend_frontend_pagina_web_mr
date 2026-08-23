"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  Boxes,
  BrainCircuit,
  CarFront,
  CheckCircle2,
  ChevronRight,
  Disc3,
  DoorOpen,
  GitBranch,
  Headset,
  LockKeyhole,
  Radio,
  ScanLine,
  Sparkles,
  Target,
  TimerReset,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ApiRequestError, apiRequest } from "@/lib/client-api";
import type { Nivel, ProgresoUsuario, Ranking, ReporteNivel } from "@/lib/types";
import { useAuthSession } from "@/lib/use-auth-session";

const conceptos = ["Clases y objetos", "Atributos y métodos", "Encapsulamiento", "Abstracción", "Herencia", "Polimorfismo"];

const objetosPorNivel: {
  nombre: string;
  pista: string;
  experiencia: string;
  icono: LucideIcon;
  color: string;
  accent: string;
}[] = [
  {
    nombre: "Puerta interactiva",
    pista: "Descubre clase y objeto",
    experiencia: "Toca la puerta, observa sus propiedades y reconoce qué la convierte en un objeto.",
    icono: DoorOpen,
    color: "text-cyan-200",
    accent: "cyan",
  },
  {
    nombre: "Vehículos",
    pista: "Manipula atributos y acciones",
    experiencia: "Cambia el estado de vehículos físicos y comprueba cómo sus métodos producen resultados.",
    icono: CarFront,
    color: "text-amber-200",
    accent: "amber",
  },
  {
    nombre: "Robot de taller",
    pista: "Protege su estado interno",
    experiencia: "Repara un robot sin romper sus reglas internas y aprende por qué existe el encapsulamiento.",
    icono: Bot,
    color: "text-emerald-200",
    accent: "emerald",
  },
  {
    nombre: "Libros físicos",
    pista: "Elige solo lo esencial",
    experiencia: "Clasifica libros entre dos contextos y conserva únicamente la información que sí importa.",
    icono: Disc3,
    color: "text-violet-200",
    accent: "violet",
  },
  {
    nombre: "Árbol de tipos",
    pista: "Conecta rasgos heredados",
    experiencia: "Construye relaciones entre tipos y descubre qué características viajan desde una clase base.",
    icono: GitBranch,
    color: "text-sky-200",
    accent: "sky",
  },
  {
    nombre: "Formas mutables",
    pista: "Una acción, varios resultados",
    experiencia: "Aplica una misma acción a distintos objetos y observa cómo cada uno responde a su manera.",
    icono: Boxes,
    color: "text-rose-200",
    accent: "rose",
  },
];

export default function EstudiantePage() {
  const { hydrated, token, usuario: sesion } = useAuthSession();
  const [progreso, setProgreso] = useState<ProgresoUsuario | null>(null);
  const [reportes, setReportes] = useState<ReporteNivel[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [nivelSeleccionado, setNivelSeleccionado] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated || !token) return;
    Promise.all([
      apiRequest<ProgresoUsuario>("/api/progreso", token),
      apiRequest<ReporteNivel[]>("/api/reportes", token),
      apiRequest<Nivel[]>("/api/niveles", token),
      apiRequest<Ranking>("/api/ranking", token),
    ])
      .then(([avance, reportesData, nivelesData, rankingData]) => {
        setProgreso(avance);
        setReportes(reportesData);
        setNiveles([...nivelesData].sort((a, b) => a.nivel - b.nivel));
        setRanking(rankingData);
      })
      .catch((reason: unknown) => {
        if (reason instanceof ApiRequestError && reason.status === 401) {
          return;
        }
        setError(reason instanceof Error ? reason.message : "No pudimos cargar los datos.");
      })
      .finally(() => setLoading(false));
  }, [hydrated, token]);

  const usuarioActivo = sesion;
  const ultimoReporte = reportes.length ? reportes[reportes.length - 1] : null;
  const completados = progreso?.niveles.filter((nivel) => nivel.completado).length ?? 0;
  const posicion = ranking?.estudiantes.find((item) => item.usuarioId === usuarioActivo?.id)?.posicion;
  const nivelActual = Math.min(Math.max(progreso?.nivelActual ?? usuarioActivo?.nivelActual ?? 1, 1), 6);
  const objetoActual = objetosPorNivel[nivelActual - 1];
  const IconoActual = objetoActual.icono;
  const porcentajeRuta = Math.round((completados / 6) * 100);
  const promedio = useMemo(
    () => (reportes.length ? Math.round(reportes.reduce((total, item) => total + item.dominio, 0) / reportes.length) : 0),
    [reportes],
  );
  const nivelesVisibles = useMemo<Nivel[]>(
    () =>
      niveles.length
        ? niveles
        : conceptos.map((nombre, index) => ({
            id: index + 1,
            nombre,
            descripcion: "Concepto fundamental de programación orientada a objetos.",
            nivel: index + 1,
          })),
    [niveles],
  );
  const detalleSeleccionado = nivelesVisibles.find((nivel) => nivel.nivel === (nivelSeleccionado ?? nivelActual)) ?? nivelesVisibles[0];
  const resultadoSeleccionado = progreso?.niveles.find((item) => item.nivel === detalleSeleccionado?.nivel);
  const experienciaSeleccionada = objetosPorNivel[Math.min(Math.max((detalleSeleccionado?.nivel ?? 1) - 1, 0), 5)];
  const IconoSeleccionado = experienciaSeleccionada.icono;
  const seleccionadoActual = detalleSeleccionado?.nivel === nivelActual;
  const seleccionadoBloqueado = !resultadoSeleccionado?.completado && (detalleSeleccionado?.nivel ?? 1) > nivelActual;

  if (!usuarioActivo) return null;
  if (loading) return <div className="loading-card">Sincronizando tu laboratorio…</div>;

  return (
    <>
      {error ? <div className="alert-error mb-5">{error}</div> : null}

      <section className="student-command-hero">
        <div aria-hidden="true" className="student-hero-orb student-hero-orb-one" />
        <div aria-hidden="true" className="student-hero-orb student-hero-orb-two" />
        <div className="relative z-10 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="section-kicker flex items-center gap-2">
              <ScanLine className="student-scan-icon" size={14} /> Laboratorio conectado
            </p>
            <span className="student-live-pill"><Radio size={11} /> Quest sincronizada</span>
          </div>
          <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-[1.08] tracking-[-.045em] text-white sm:text-4xl xl:text-5xl">
            Hola, {primerNombre(usuarioActivo.nombre)}. Tu próxima idea ya está tomando forma.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300/75 sm:text-base sm:leading-7">
            En AlgoLab no memorizas diagramas: conviertes la programación orientada a objetos en puertas, vehículos,
            robots y retos que puedes tocar en realidad mixta.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="student-primary-action" href="/estudiante/reportes">
              <BrainCircuit size={17} /> Ver mi diagnóstico <ArrowUpRight size={15} />
            </Link>
            <Link className="student-secondary-action" href="/estudiante/codigo">
              <Zap size={16} /> Entrenar con código
            </Link>
          </div>

          <div className="mt-7 max-w-2xl">
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="font-mono uppercase tracking-[.15em] text-slate-400">Ruta POO</span>
              <strong className="font-mono text-emerald-200">{porcentajeRuta}% dominado</strong>
            </div>
            <div className="student-progress-track mt-2" role="progressbar" aria-label="Progreso de la ruta POO" aria-valuemax={100} aria-valuemin={0} aria-valuenow={porcentajeRuta}>
              <span style={{ width: `${porcentajeRuta}%` }} />
            </div>
          </div>
        </div>

        <div className="student-mission-console relative z-10" aria-label={`Misión actual: ${objetoActual.nombre}`}>
          <div className="student-console-topline"><span>MISIÓN {String(nivelActual).padStart(2, "0")}</span><span>EN CURSO</span></div>
          <div className="student-object-stage">
            <span className="student-stage-ring student-stage-ring-one" />
            <span className="student-stage-ring student-stage-ring-two" />
            <span className="student-stage-axis student-stage-axis-x" />
            <span className="student-stage-axis student-stage-axis-y" />
            <div className={`student-stage-object student-stage-${objetoActual.accent}`}>
              <IconoActual className={objetoActual.color} size={48} strokeWidth={1.45} />
            </div>
            <span className="student-stage-chip student-stage-chip-a">OBJETO</span>
            <span className="student-stage-chip student-stage-chip-b">INTERACTIVO</span>
          </div>
          <div className="student-console-copy">
            <span>{objetoActual.pista}</span>
            <strong>{objetoActual.nombre}</strong>
            <small>Nivel {nivelActual} de 6 · listo en las gafas</small>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Zap size={17} />} label="Puntaje total" value={progreso?.puntajeTotal ?? usuarioActivo.puntaje ?? 0} note="Experiencia acumulada" tone="emerald" />
        <Metric icon={<BrainCircuit size={17} />} label="Dominio promedio" value={`${promedio}%`} note={reportes.length ? `${reportes.length} diagnósticos disponibles` : "Completa tu primer nivel"} tone="violet" />
        <Metric icon={<CheckCircle2 size={17} />} label="Niveles superados" value={`${completados}/6`} note={`${porcentajeRuta}% de la ruta`} tone="cyan" />
        <Metric icon={<Trophy size={17} />} label="Ranking" value={posicion ? `#${posicion}` : "—"} note={`${ranking?.total ?? 0} estudiantes`} tone="amber" />
      </section>

      <section className="student-route-panel mt-5">
        <div className="student-route-heading">
          <div>
            <p className="section-kicker flex items-center gap-2"><Target size={13} /> Mapa de aprendizaje</p>
            <h2 className="mt-2 text-xl font-semibold sm:text-2xl">Explora tus seis experiencias físicas</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Selecciona una misión para descubrir qué objeto representa el concepto y revisar tu estado.</p>
          </div>
          <span className="student-route-sync"><Radio size={12} /> Progreso en tiempo real</span>
        </div>

        <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(290px,.65fr)]">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
            {nivelesVisibles.map((nivel) => {
              const resultado = progreso?.niveles.find((item) => item.nivel === nivel.nivel);
              const actual = nivel.nivel === nivelActual;
              const bloqueado = !resultado?.completado && nivel.nivel > nivelActual;
              const experiencia = objetosPorNivel[Math.min(Math.max(nivel.nivel - 1, 0), objetosPorNivel.length - 1)];
              const IconoExperiencia = experiencia.icono;
              const seleccionado = nivel.nivel === detalleSeleccionado?.nivel;

              return (
                <button
                  aria-label={`Nivel ${nivel.nivel}: ${nivel.nombre || conceptos[nivel.nivel - 1]}. ${resultado?.completado ? "Completado" : actual ? "Misión actual" : bloqueado ? "Bloqueado" : "Disponible"}`}
                  aria-pressed={seleccionado}
                  className={`student-level-node student-level-${experiencia.accent} ${seleccionado ? "student-level-selected" : ""} ${resultado?.completado ? "student-level-complete" : actual ? "student-level-current" : bloqueado ? "student-level-locked" : ""}`}
                  key={nivel.id}
                  onClick={() => setNivelSeleccionado(nivel.nivel)}
                  type="button"
                >
                  <span className="student-level-icon"><IconoExperiencia size={20} /></span>
                  <span className="min-w-0 text-left">
                    <span className="student-level-meta">Nivel {String(nivel.nivel).padStart(2, "0")}</span>
                    <strong>{nivel.nombre || conceptos[nivel.nivel - 1]}</strong>
                    <small>{resultado?.completado ? `${resultado.puntaje} puntos · ${resultado.intentos} intento${resultado.intentos === 1 ? "" : "s"}` : actual ? experiencia.nombre : bloqueado ? "Completa la misión anterior" : "Disponible"}</small>
                  </span>
                  <span className="student-level-status" aria-hidden="true">
                    {resultado?.completado ? <CheckCircle2 size={17} /> : bloqueado ? <LockKeyhole size={15} /> : <ChevronRight size={17} />}
                  </span>
                </button>
              );
            })}
          </div>

          <aside className={`student-level-preview student-preview-${experienciaSeleccionada.accent}`} aria-live="polite">
            <div className="flex items-start justify-between gap-3">
              <span className="student-preview-badge">Nivel {String(detalleSeleccionado?.nivel ?? 1).padStart(2, "0")}</span>
              <span className={`student-preview-state ${resultadoSeleccionado?.completado ? "is-complete" : seleccionadoActual ? "is-current" : seleccionadoBloqueado ? "is-locked" : ""}`}>
                {resultadoSeleccionado?.completado ? "Completado" : seleccionadoActual ? "En curso" : seleccionadoBloqueado ? "Bloqueado" : "Disponible"}
              </span>
            </div>
            <div className="student-preview-object" aria-hidden="true">
              <span />
              <IconoSeleccionado className={experienciaSeleccionada.color} size={58} strokeWidth={1.3} />
            </div>
            <p className="section-kicker mt-5">{experienciaSeleccionada.nombre}</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{detalleSeleccionado?.nombre ?? conceptos[(detalleSeleccionado?.nivel ?? 1) - 1]}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300/75">{detalleSeleccionado?.descripcion || experienciaSeleccionada.experiencia}</p>
            <div className="student-preview-experience mt-4">
              <Headset size={16} />
              <p><span>Así se vive en MR</span>{experienciaSeleccionada.experiencia}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
              <span className="student-data-chip"><TimerReset size={12} /> {resultadoSeleccionado ? `${resultadoSeleccionado.intentos} intento${resultadoSeleccionado.intentos === 1 ? "" : "s"}` : "Sin intentos"}</span>
              <span className="student-data-chip"><Zap size={12} /> {resultadoSeleccionado?.puntaje ?? 0} puntos</span>
            </div>
            {resultadoSeleccionado?.completado ? (
              <Link className="student-preview-link" href="/estudiante/reportes">Revisar lo que aprendí <ArrowUpRight size={14} /></Link>
            ) : seleccionadoActual ? (
              <div className="student-preview-message"><span className="status-dot" /> Continúa esta misión desde tus gafas</div>
            ) : seleccionadoBloqueado ? (
              <div className="student-preview-message is-muted"><LockKeyhole size={13} /> Supera el nivel anterior para desbloquearla</div>
            ) : null}
          </aside>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <article className="student-mentor-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="section-kicker flex items-center gap-2"><Sparkles size={13} /> Mentor IA</p>
              <h2 className="mt-2 text-xl font-semibold sm:text-2xl">Tu diagnóstico más reciente</h2>
            </div>
            <span className="student-ai-status"><span /> Análisis pedagógico</span>
          </div>
          {ultimoReporte ? (
            <div className="mt-5 grid gap-5 md:grid-cols-[auto_1fr]">
              <div className="score-ring score-ring-large" style={{ "--score": `${ultimoReporte.dominio * 3.6}deg` } as CSSProperties}>
                <strong>{ultimoReporte.dominio}</strong><span>%</span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white">{ultimoReporte.tituloNivel}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[.14em] text-emerald-300">{ultimoReporte.generadoPorIa ? "Análisis personalizado por IA" : "Análisis pedagógico base"}</p>
                <p className="mt-4 text-sm leading-6 text-slate-300">{ultimoReporte.resumen}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <EvidenceList empty="Buen desempeño sin alertas" items={ultimoReporte.fortalezas} label="Fortalezas detectadas" tone="good" />
                  <EvidenceList empty="Sin dificultades registradas" items={ultimoReporte.aspectosMejora} label="Para reforzar" tone="improve" />
                </div>
                <div className="recommendation mt-4"><span>Próximo movimiento</span><p>{ultimoReporte.recomendaciones[0] ?? "Practica el concepto con un ejemplo propio y vuelve a intentarlo."}</p></div>
              </div>
            </div>
          ) : (
            <div className="student-ai-empty mt-5">
              <div aria-hidden="true"><BrainCircuit size={34} /></div>
              <p><strong>Tu mentor está esperando evidencia</strong><span>Completa un nivel en las gafas y recibirás un diagnóstico basado únicamente en tu desempeño real.</span></p>
            </div>
          )}
        </article>

        <article className="student-side-quest">
          <div className="student-side-quest-grid" aria-hidden="true" />
          <div className="relative z-10">
            <span className="student-side-label"><Zap size={12} /> Contenido adicional</span>
            <h2 className="mt-4 text-2xl font-bold tracking-[-.035em] text-white">Lleva la idea del mundo físico al código.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300/75">Programar POO es tu zona opcional de entrenamiento: resuelve desafíos cortos, prueba soluciones y fortalece lo aprendido en realidad mixta.</p>
            <div className="student-code-window mt-5" aria-hidden="true">
              <div><span /><span /><span /><small>robot.py</small></div>
              <code><i>class</i> Robot:<br /><b>&nbsp;&nbsp;def</b> reparar(self):<br /><em>&nbsp;&nbsp;&nbsp;&nbsp;return &quot;listo&quot;</em></code>
              <small>✓ salida verificada</small>
            </div>
            <Link className="student-side-link" href="/estudiante/codigo">Abrir laboratorio de código <ArrowUpRight size={15} /></Link>
          </div>
        </article>
      </section>
    </>
  );
}

function primerNombre(nombre?: string) {
  const limpio = nombre?.trim();
  return limpio ? limpio.split(/\s+/)[0] : "estudiante";
}

function Metric({ icon, label, value, note, tone }: { icon: ReactNode; label: string; value: string | number; note: string; tone: string }) {
  return (
    <article className={`metric-card metric-${tone} student-metric-card`}>
      <span className="flex items-center justify-between gap-3">{label}<span className="student-metric-icon">{icon}</span></span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function EvidenceList({ empty, items, label, tone }: { empty: string; items: string[]; label: string; tone: "good" | "improve" }) {
  const visibles = items.slice(0, 2);
  return (
    <div className={`student-evidence student-evidence-${tone}`}>
      <span>{label}</span>
      {visibles.length ? (
        <ul>{visibles.map((item) => <li key={item}>{item}</li>)}</ul>
      ) : (
        <p><CheckCircle2 size={13} /> {empty}</p>
      )}
    </div>
  );
}
