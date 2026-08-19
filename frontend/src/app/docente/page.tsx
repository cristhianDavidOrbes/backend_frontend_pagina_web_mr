"use client";

import {
  Bot,
  BookOpen,
  BrainCircuit,
  DoorOpen,
  RadioTower,
  ScanLine,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AvatarDisplay } from "@/components/avatar-display";
import { ProfileEditor } from "@/components/profile-editor";
import { apiRequest } from "@/lib/client-api";
import type { Nivel, ProgresoUsuario, ReporteNivel, UsuarioSesion } from "@/lib/types";
import { saveAuthUser, useAuthSession } from "@/lib/use-auth-session";

export default function DocentePage() {
  const { hydrated, token, usuario: sesion } = useAuthSession();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(sesion);
  const [estudiantes, setEstudiantes] = useState<UsuarioSesion[]>([]);
  const [reportes, setReportes] = useState<ReporteNivel[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [seleccionado, setSeleccionado] = useState<UsuarioSesion | null>(null);
  const [progreso, setProgreso] = useState<ProgresoUsuario | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) return;
    Promise.all([
      apiRequest<UsuarioSesion>("/api/me", token),
      apiRequest<UsuarioSesion[]>("/api/usuarios", token),
      apiRequest<ReporteNivel[]>("/api/reportes?todos=1", token),
      apiRequest<Nivel[]>("/api/niveles", token),
    ]).then(([perfil, usuariosData, reportesData, nivelesData]) => {
      const alumnos = usuariosData.filter((item) => item.rol === "ESTUDIANTE");
      setUsuario(perfil); saveAuthUser(perfil); setEstudiantes(alumnos); setReportes(reportesData); setNiveles(nivelesData);
      if (alumnos.length) setSeleccionado(alumnos[0]);
    }).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  }, [hydrated, token]);

  useEffect(() => {
    if (!seleccionado || !token) return;
    apiRequest<ProgresoUsuario>(`/api/progreso?usuarioId=${seleccionado.id}`, token).then(setProgreso).catch(() => setProgreso(null));
  }, [seleccionado, token]);

  const usuarioActivo = usuario ?? sesion;
  const visibles = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    return query ? estudiantes.filter((item) => `${item.nombre} ${item.nombreUsuario ?? ""} ${item.correo}`.toLowerCase().includes(query)) : estudiantes;
  }, [busqueda, estudiantes]);
  const reportesSeleccionado = reportes.filter((item) => item.usuarioId === seleccionado?.id);
  const completados = reportes.filter((item) => item.completado).length;
  const dominioGrupo = reportes.length ? Math.round(reportes.reduce((sum, item) => sum + item.dominio, 0) / reportes.length) : 0;
  const necesitanApoyo = new Set(reportes.filter((item) => item.dominio < 60).map((item) => item.usuarioId)).size;

  if (!usuarioActivo) return <main className="app-surface grid min-h-screen place-items-center p-6"><div className="loading-card">{hydrated && !token ? "Inicia sesión como docente para consultar el grupo." : loading ? "Preparando el observatorio…" : error || "Sesión no disponible."}</div></main>;

  return (
    <AppShell eyebrow="Observatorio docente" title="Pulso del grupo" usuario={usuarioActivo}>
      {error ? <div className="alert-error">{error}</div> : null}
      <section className="hero-dashboard teacher-hero">
        <div className="relative z-10">
          <p className="section-kicker flex items-center gap-2"><RadioTower className="animate-pulse" size={14} /> Evidencia pedagógica en vivo</p>
          <h2 className="mt-3 max-w-3xl text-2xl font-semibold sm:text-3xl">Detecta quién avanza, quién necesita apoyo y qué concepto conviene reforzar.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Cada informe combina métricas registradas en realidad mixta con recomendaciones centradas únicamente en programación orientada a objetos.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <MissionChip icon={<DoorOpen size={13} />} label="Puertas y clases" />
            <MissionChip icon={<Bot size={13} />} label="Taller del robot" />
            <MissionChip icon={<BookOpen size={13} />} label="Biblioteca abstracta" />
          </div>
        </div>
        <div className="relative z-10 min-w-[190px] border-l border-white/10 p-4 text-center">
          <div className="relative mx-auto grid h-24 w-24 place-items-center">
            <span className="absolute inset-0 animate-[spin_16s_linear_infinite] rounded-full border border-dashed border-emerald-300/25" />
            <span className="absolute inset-3 rounded-full border border-violet-300/15 bg-slate-950/40" />
            <BrainCircuit className="text-emerald-200" size={34} />
          </div>
          <span className="mt-3 block text-[10px] uppercase tracking-[.17em] text-slate-500">Escáner del grupo</span>
          <strong className="mt-1 block font-mono text-2xl text-emerald-200">{estudiantes.length}</strong>
          <small className="text-[11px] text-slate-500">estudiantes conectados</small>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<ScanLine size={17} />} label="Dominio del grupo" value={`${dominioGrupo}%`} note="Promedio de reportes" />
        <Metric icon={<Sparkles size={17} />} label="Evidencias" value={reportes.length} note={`${completados} niveles completados`} />
        <Metric icon={<BrainCircuit size={17} />} label="Requieren acompañamiento" value={necesitanApoyo} note="Dominio inferior a 60%" />
        <Metric icon={<Trophy size={17} />} label="Ruta disponible" value={`${niveles.length || 6} niveles`} note="De clases a polimorfismo" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="panel-card p-5">
          <div className="flex items-center justify-between"><div><p className="section-kicker">Estudiantes</p><h2 className="mt-2 text-xl font-semibold">Tu grupo</h2></div><span className="count-badge">{visibles.length}</span></div>
          <input className="field-input mt-4" onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por nombre o correo" value={busqueda} />
          <div className="student-list mt-4">{visibles.map((item) => {
            const informes = reportes.filter((reporte) => reporte.usuarioId === item.id);
            const dominio = informes.length ? Math.round(informes.reduce((sum, reporte) => sum + reporte.dominio, 0) / informes.length) : 0;
            return <button className={`student-row ${seleccionado?.id === item.id ? "student-row-active" : ""}`} key={item.id} onClick={() => setSeleccionado(item)}><AvatarDisplay decorative usuario={item} /><span><strong>{item.nombre}</strong><small>Nivel {item.nivelActual} · {dominio || "—"}% dominio</small></span><span>›</span></button>;
          })}{!visibles.length ? <div className="empty-state"><p>No hay estudiantes que coincidan.</p></div> : null}</div>
        </aside>

        <article className="panel-card p-5 sm:p-6">
          {seleccionado ? <>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5"><div className="flex items-center gap-3"><div className="relative"><span className="absolute -inset-1 animate-pulse rounded-[20px] border border-emerald-300/15" /><AvatarDisplay className="!h-[52px] !w-[52px] !rounded-[17px]" usuario={seleccionado} /></div><div><p className="text-xl font-semibold">{seleccionado.nombre}</p><p className="mt-1 text-sm text-slate-400">{seleccionado.programa || "Ruta de programación orientada a objetos"}</p><span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[.06] px-2.5 py-1 text-[10px] uppercase tracking-[.12em] text-emerald-200"><ScanLine size={11} /> Perfil sincronizado</span></div></div><div className="text-right"><span className="section-kicker">Puntaje</span><strong className="mt-1 block text-2xl text-emerald-300">{progreso?.puntajeTotal ?? seleccionado.puntaje}</strong></div></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3"><MiniMetric label="Nivel actual" value={progreso?.nivelActual ?? seleccionado.nivelActual} /><MiniMetric label="Completados" value={progreso?.niveles.filter((item) => item.completado).length ?? 0} /><MiniMetric label="Informes IA" value={reportesSeleccionado.filter((item) => item.generadoPorIa).length} /></div>
            <div className="mt-6"><div className="flex items-center justify-between"><h3 className="font-semibold">Evolución por nivel</h3><span className="text-xs text-slate-500">Dominio / 100</span></div><div className="mastery-chart mt-4">{[1, 2, 3, 4, 5, 6].map((nivel) => { const reporte = reportesSeleccionado.find((item) => item.nivel === nivel); return <div key={nivel}><div className="mastery-track"><span style={{ height: `${Math.max(reporte?.dominio ?? 4, 4)}%` }} /></div><small>N{nivel}</small></div>; })}</div></div>
            <div className="mt-6"><h3 className="font-semibold">Informes y recomendaciones</h3><div className="mt-3 grid gap-3">{[...reportesSeleccionado].reverse().map((reporte) => <article className="teacher-report" key={reporte.id}><div><span>Nivel {reporte.nivel}</span><strong>{reporte.tituloNivel}</strong><p>{reporte.resumen}</p></div><div><strong>{reporte.dominio}%</strong><small>{reporte.recomendaciones[0] ?? "Continuar practicando"}</small></div></article>)}{!reportesSeleccionado.length ? <div className="empty-state"><span>∅</span><p>Este estudiante aún no tiene informes. Aparecerán al finalizar un nivel.</p></div> : null}</div></div>
          </> : <div className="empty-state"><p>Selecciona un estudiante para consultar su evidencia.</p></div>}
        </article>
      </section>

      <div className="mt-5"><ProfileEditor onSaved={setUsuario} token={token} usuario={usuarioActivo} /></div>
    </AppShell>
  );
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string | number; note: string }) { return <article className="metric-card metric-emerald transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/20"><span className="flex items-center justify-between gap-3">{label}<span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-300/[.08] text-emerald-200">{icon}</span></span><strong>{value}</strong><small>{note}</small></article>; }
function MiniMetric({ label, value }: { label: string; value: string | number }) { return <div className="mini-metric"><span>{label}</span><strong>{value}</strong></div>; }
function MissionChip({ icon, label }: { icon: React.ReactNode; label: string }) { return <span className="inline-flex items-center gap-2 rounded-full border border-white/[.08] bg-white/[.03] px-3 py-1.5 text-[11px] text-slate-400">{icon}{label}</span>; }
