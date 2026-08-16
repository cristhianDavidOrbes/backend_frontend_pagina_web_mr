"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AppShell } from "@/components/app-shell";
import { ProfileEditor } from "@/components/profile-editor";
import { apiRequest } from "@/lib/client-api";
import type { Nivel, ProgresoUsuario, Ranking, ReporteNivel, UsuarioSesion } from "@/lib/types";
import { saveAuthUser, useAuthSession } from "@/lib/use-auth-session";

const conceptos = ["Clases y objetos", "Atributos y métodos", "Encapsulamiento", "Abstracción", "Herencia", "Polimorfismo"];

export default function EstudiantePage() {
  const { hydrated, token, usuario: sesion } = useAuthSession();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(sesion);
  const [progreso, setProgreso] = useState<ProgresoUsuario | null>(null);
  const [reportes, setReportes] = useState<ReporteNivel[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) return;
    Promise.all([
      apiRequest<UsuarioSesion>("/api/me", token),
      apiRequest<ProgresoUsuario>("/api/progreso", token),
      apiRequest<ReporteNivel[]>("/api/reportes", token),
      apiRequest<Nivel[]>("/api/niveles", token),
      apiRequest<Ranking>("/api/ranking", token),
    ]).then(([perfil, avance, reportesData, nivelesData, rankingData]) => {
      setUsuario(perfil);
      saveAuthUser(perfil);
      setProgreso(avance);
      setReportes(reportesData);
      setNiveles([...nivelesData].sort((a, b) => a.nivel - b.nivel));
      setRanking(rankingData);
    }).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  }, [hydrated, token]);

  const usuarioActivo = usuario ?? sesion;
  const ultimoReporte = reportes.length ? reportes[reportes.length - 1] : null;
  const completados = progreso?.niveles.filter((nivel) => nivel.completado).length ?? 0;
  const posicion = ranking?.estudiantes.find((item) => item.usuarioId === usuarioActivo?.id)?.posicion;
  const promedio = useMemo(
    () => reportes.length ? Math.round(reportes.reduce((total, item) => total + item.dominio, 0) / reportes.length) : 0,
    [reportes],
  );

  if (!usuarioActivo) {
    return <main className="app-surface grid min-h-screen place-items-center p-6"><div className="loading-card">{hydrated && !token ? "Inicia sesión para consultar tu ruta de aprendizaje." : loading ? "Sincronizando tu cabina…" : error || "Sesión no disponible."}</div></main>;
  }

  return (
    <AppShell eyebrow="Cabina del estudiante" title={`Hola, ${usuarioActivo.nombre.split(" ")[0]}`} usuario={usuarioActivo}>
      {error ? <div className="alert-error">{error}</div> : null}
      <section className="hero-dashboard">
        <div>
          <p className="section-kicker">Ruta POO activa</p>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold leading-tight sm:text-3xl">Convierte conceptos abstractos en decisiones que puedes ver, tocar y dominar.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Tus resultados de las gafas llegan aquí automáticamente. El mentor de IA analiza cada nivel y propone un siguiente paso concreto.</p>
        </div>
        <div className="hero-level"><span>Nivel actual</span><strong>{Math.min(progreso?.nivelActual ?? usuarioActivo.nivelActual ?? 1, 6)}</strong><small>de 6</small></div>
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
              return <article className={`level-card ${resultado?.completado ? "level-complete" : actual ? "level-current" : bloqueado ? "level-locked" : ""}`} key={nivel.id}>
                <span className="level-number">{String(nivel.nivel).padStart(2, "0")}</span>
                <div><strong>{nivel.nombre || conceptos[nivel.nivel - 1]}</strong><p>{resultado?.completado ? `${resultado.puntaje} puntos · ${resultado.intentos} intento${resultado.intentos === 1 ? "" : "s"}` : actual ? "Listo para continuar en las gafas" : "Se desbloquea al avanzar"}</p></div>
                <span className="level-state">{resultado?.completado ? "✓" : actual ? "→" : "·"}</span>
              </article>;
            })}
          </div>
        </article>

        <article className="panel-card p-5 sm:p-6">
          <p className="section-kicker">Mentor IA</p><h2 className="mt-2 text-xl font-semibold">Tu diagnóstico más reciente</h2>
          {ultimoReporte ? <div className="mt-5">
            <div className="flex items-center gap-4"><div className="score-ring" style={{ "--score": `${ultimoReporte.dominio * 3.6}deg` } as CSSProperties}><strong>{ultimoReporte.dominio}</strong><span>%</span></div><div><p className="font-semibold">{ultimoReporte.tituloNivel}</p><p className="mt-1 text-xs uppercase tracking-[.14em] text-emerald-300">{ultimoReporte.generadoPorIa ? "Análisis personalizado por IA" : "Análisis pedagógico base"}</p></div></div>
            <p className="mt-5 text-sm leading-6 text-slate-300">{ultimoReporte.resumen}</p>
            <div className="recommendation mt-4"><span>Próximo movimiento</span><p>{ultimoReporte.recomendaciones[0] ?? "Practica el concepto con un ejemplo propio y vuelve a intentarlo."}</p></div>
          </div> : <div className="empty-state mt-5"><span>AI</span><p>Completa un nivel en las gafas para activar tu primer diagnóstico.</p></div>}
        </article>
      </section>

      {reportes.length ? <section className="mt-5 panel-card p-5 sm:p-6"><p className="section-kicker">Bitácora inteligente</p><h2 className="mt-2 text-xl font-semibold">Fortalezas y oportunidades por nivel</h2><div className="mt-5 grid gap-4 lg:grid-cols-2">{[...reportes].reverse().map((reporte) => <article className="report-card" key={reporte.id}><div className="flex items-start justify-between gap-4"><div><span>Nivel {reporte.nivel}</span><h3>{reporte.tituloNivel}</h3></div><strong>{reporte.dominio}%</strong></div><p>{reporte.resumen}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Insight label="Lo que destacas" items={reporte.fortalezas} tone="positive" /><Insight label="Para mejorar" items={reporte.aspectosMejora} tone="growth" /></div></article>)}</div></section> : null}

      <div className="mt-5"><ProfileEditor onSaved={setUsuario} token={token} usuario={usuarioActivo} /></div>
    </AppShell>
  );
}

function Metric({ label, value, note, tone }: { label: string; value: string | number; note: string; tone: string }) {
  return <article className={`metric-card metric-${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function Insight({ label, items, tone }: { label: string; items: string[]; tone: string }) {
  return <div className={`insight insight-${tone}`}><span>{label}</span><ul>{(items.length ? items : ["Sin observaciones todavía."]).slice(0, 2).map((item) => <li key={item}>{item}</li>)}</ul></div>;
}
