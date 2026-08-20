"use client";

import {
  Bot,
  Boxes,
  CarFront,
  Disc3,
  DoorOpen,
  GitBranch,
  ScanLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { apiRequest } from "@/lib/client-api";
import type { Nivel, ProgresoUsuario, Ranking, ReporteNivel } from "@/lib/types";
import { useAuthSession } from "@/lib/use-auth-session";

const conceptos = ["Clases y objetos", "Atributos y métodos", "Encapsulamiento", "Abstracción", "Herencia", "Polimorfismo"];

const objetosPorNivel: { nombre: string; pista: string; icono: LucideIcon; color: string }[] = [
  { nombre: "Puerta interactiva", pista: "Descubre clase y objeto", icono: DoorOpen, color: "text-cyan-200" },
  { nombre: "Vehículos", pista: "Manipula atributos y acciones", icono: CarFront, color: "text-amber-200" },
  { nombre: "Robot de taller", pista: "Protege su estado interno", icono: Bot, color: "text-emerald-200" },
  { nombre: "Libros físicos", pista: "Elige solo lo esencial", icono: Disc3, color: "text-violet-200" },
  { nombre: "Árbol de tipos", pista: "Conecta rasgos heredados", icono: GitBranch, color: "text-sky-200" },
  { nombre: "Formas mutables", pista: "Una acción, varios resultados", icono: Boxes, color: "text-rose-200" },
];

export default function EstudiantePage() {
  const { hydrated, token, usuario: sesion } = useAuthSession();
  const [progreso, setProgreso] = useState<ProgresoUsuario | null>(null);
  const [reportes, setReportes] = useState<ReporteNivel[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated || !token) return;
    Promise.all([
      apiRequest<ProgresoUsuario>("/api/progreso", token),
      apiRequest<ReporteNivel[]>("/api/reportes", token),
      apiRequest<Nivel[]>("/api/niveles", token),
      apiRequest<Ranking>("/api/ranking", token),
    ]).then(([avance, reportesData, nivelesData, rankingData]) => {
      setProgreso(avance);
      setReportes(reportesData);
      setNiveles([...nivelesData].sort((a, b) => a.nivel - b.nivel));
      setRanking(rankingData);
    }).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  }, [hydrated, token]);

  const usuarioActivo = sesion;
  const ultimoReporte = reportes.length ? reportes[reportes.length - 1] : null;
  const completados = progreso?.niveles.filter((nivel) => nivel.completado).length ?? 0;
  const posicion = ranking?.estudiantes.find((item) => item.usuarioId === usuarioActivo?.id)?.posicion;
  const nivelActual = Math.min(progreso?.nivelActual ?? usuarioActivo?.nivelActual ?? 1, 6);
  const objetoActual = objetosPorNivel[Math.max(nivelActual - 1, 0)];
  const IconoActual = objetoActual.icono;
  const promedio = useMemo(
    () => reportes.length ? Math.round(reportes.reduce((total, item) => total + item.dominio, 0) / reportes.length) : 0,
    [reportes],
  );

  if (!usuarioActivo) return null; // Let the layout handle it
  if (loading) return <div className="loading-card">Sincronizando tus métricas…</div>;

  return (
    <>
      {error ? <div className="alert-error mb-5">{error}</div> : null}
      <section className="hero-dashboard">
        <div className="relative z-10">
          <p className="section-kicker flex items-center gap-2"><ScanLine className="animate-pulse" size={14} /> Ruta POO activa</p>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold leading-tight sm:text-3xl">Convierte conceptos abstractos en decisiones que puedes ver, tocar y dominar.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Tus resultados de las gafas llegan aquí automáticamente. El mentor de IA analiza cada nivel y propone un siguiente paso concreto.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {objetosPorNivel.slice(0, 4).map(({ nombre, icono: Icono }, index) => (
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] transition ${
                  index + 1 === nivelActual
                    ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100 shadow-[0_0_25px_rgba(52,211,153,.1)]"
                    : "border-white/[.07] bg-white/[.025] text-slate-500"
                }`}
                key={nombre}
              >
                <Icono size={13} /> {nombre}
              </span>
            ))}
          </div>
        </div>
        <div className="relative z-10 min-w-[190px] border-l border-white/10 p-4">
          <div className="relative mx-auto grid h-24 w-24 place-items-center">
            <span className="absolute inset-0 animate-[spin_14s_linear_infinite] rounded-full border border-dashed border-emerald-300/25" />
            <span className="absolute inset-3 rounded-full border border-cyan-300/15 bg-slate-950/35" />
            <IconoActual className={objetoActual.color} size={34} />
          </div>
          <div className="mt-3 text-center">
            <span className="text-[10px] uppercase tracking-[.17em] text-slate-500">Misión {nivelActual}/6</span>
            <strong className="mt-1 block text-sm text-slate-100">{objetoActual.nombre}</strong>
            <small className="mt-1 block text-[11px] text-slate-500">{objetoActual.pista}</small>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Puntaje total" value={progreso?.puntajeTotal ?? usuarioActivo.puntaje ?? 0} note="Experiencia acumulada" tone="emerald" />
        <Metric label="Dominio promedio" value={`${promedio}%`} note={reportes.length ? `${reportes.length} reportes disponibles` : "Completa tu primer nivel"} tone="violet" />
        <Metric label="Niveles superados" value={`${completados}/6`} note={`${Math.round((completados / 6) * 100)}% de la ruta`} tone="cyan" />
        <Metric label="Ranking" value={posicion ? `#${posicion}` : "—"} note={`${ranking?.total ?? 0} estudiantes`} tone="amber" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <article className="panel-card p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">Mapa de aprendizaje</p><h2 className="mt-2 text-xl font-semibold">Los seis niveles de AlgoLab</h2></div><span className="text-sm text-slate-500">Progreso en tiempo real</span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(niveles.length ? niveles : conceptos.map((nombre, index) => ({ id: index + 1, nombre, descripcion: "Concepto fundamental de POO.", nivel: index + 1 }))).map((nivel) => {
              const resultado = progreso?.niveles.find((item) => item.nivel === nivel.nivel);
              const actual = nivel.nivel === (progreso?.nivelActual ?? usuarioActivo.nivelActual);
              const bloqueado = !resultado?.completado && nivel.nivel > (progreso?.nivelActual ?? usuarioActivo.nivelActual);
              const experiencia = objetosPorNivel[Math.min(Math.max(nivel.nivel - 1, 0), objetosPorNivel.length - 1)];
              const IconoExperiencia = experiencia.icono;
              return <article className={`level-card ${resultado?.completado ? "level-complete" : actual ? "level-current" : bloqueado ? "level-locked" : ""}`} key={nivel.id}>
                <span className="level-number">{String(nivel.nivel).padStart(2, "0")}</span>
                <div>
                  <strong className="flex items-center gap-2">
                    <IconoExperiencia className={experiencia.color} size={14} />
                    {nivel.nombre || conceptos[nivel.nivel - 1]}
                  </strong>
                  <p>{resultado?.completado ? `${resultado.puntaje} puntos · ${resultado.intentos} intento${resultado.intentos === 1 ? "" : "s"}` : actual ? `${experiencia.nombre} listo en las gafas` : "Se desbloquea al avanzar"}</p>
                </div>
                <span className="level-state">{resultado?.completado ? "✓" : actual ? "→" : "·"}</span>
              </article>;
            })}
          </div>
        </article>

        <article className="panel-card p-5 sm:p-6">
          <p className="section-kicker flex items-center gap-2"><Sparkles size={13} /> Mentor IA</p><h2 className="mt-2 text-xl font-semibold">Tu diagnóstico más reciente</h2>
          {ultimoReporte ? <div className="mt-5">
            <div className="flex items-center gap-4"><div className="score-ring" style={{ "--score": `${ultimoReporte.dominio * 3.6}deg` } as CSSProperties}><strong>{ultimoReporte.dominio}</strong><span>%</span></div><div><p className="font-semibold">{ultimoReporte.tituloNivel}</p><p className="mt-1 text-xs uppercase tracking-[.14em] text-emerald-300">{ultimoReporte.generadoPorIa ? "Análisis personalizado por IA" : "Análisis pedagógico base"}</p></div></div>
            <p className="mt-5 text-sm leading-6 text-slate-300">{ultimoReporte.resumen}</p>
            <div className="recommendation mt-4"><span>Próximo movimiento</span><p>{ultimoReporte.recomendaciones[0] ?? "Practica el concepto con un ejemplo propio y vuelve a intentarlo."}</p></div>
          </div> : <div className="empty-state mt-5"><span>AI</span><p>Completa un nivel en las gafas para activar tu primer diagnóstico.</p></div>}
        </article>
      </section>
    </>
  );
}

function Metric({ label, value, note, tone }: { label: string; value: string | number; note: string; tone: string }) {
  return <article className={`metric-card metric-${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

