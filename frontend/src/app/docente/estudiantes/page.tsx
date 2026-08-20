"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/client-api";
import type { ProgresoUsuario, ReporteNivel, UsuarioSesion } from "@/lib/types";
import { useAuthSession } from "@/lib/use-auth-session";
import { AvatarDisplay } from "@/components/avatar-display";
import { ScanLine } from "lucide-react";

export default function DocenteEstudiantesPage() {
  const { hydrated, token } = useAuthSession();
  const [estudiantes, setEstudiantes] = useState<UsuarioSesion[]>([]);
  const [reportes, setReportes] = useState<ReporteNivel[]>([]);
  const [seleccionado, setSeleccionado] = useState<UsuarioSesion | null>(null);
  const [progreso, setProgreso] = useState<ProgresoUsuario | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated || !token) return;
    Promise.all([
      apiRequest<UsuarioSesion[]>("/api/usuarios", token),
      apiRequest<ReporteNivel[]>("/api/reportes?todos=1", token),
    ]).then(([usuariosData, reportesData]) => {
      const alumnos = usuariosData.filter((item) => item.rol === "ESTUDIANTE");
      setEstudiantes(alumnos);
      setReportes(reportesData);
      if (alumnos.length) setSeleccionado(alumnos[0]);
    }).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  }, [hydrated, token]);

  useEffect(() => {
    if (!seleccionado || !token) return;
    apiRequest<ProgresoUsuario>(`/api/progreso?usuarioId=${seleccionado.id}`, token)
      .then(setProgreso)
      .catch(() => setProgreso(null));
  }, [seleccionado, token]);

  const visibles = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    return query ? estudiantes.filter((item) => `${item.nombre} ${item.nombreUsuario ?? ""} ${item.correo}`.toLowerCase().includes(query)) : estudiantes;
  }, [busqueda, estudiantes]);
  
  const reportesSeleccionado = reportes.filter((item) => item.usuarioId === seleccionado?.id);

  if (loading) return <div className="loading-card">Cargando estudiantes...</div>;

  return (
    <>
      {error && <div className="alert-error">{error}</div>}
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="panel-card p-5 h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="flex items-center justify-between"><div><p className="section-kicker">Estudiantes</p><h2 className="mt-2 text-xl font-semibold">Tu grupo</h2></div><span className="count-badge">{visibles.length}</span></div>
          <input className="field-input mt-4" onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por nombre o correo" value={busqueda} />
          <div className="student-list mt-4">{visibles.map((item) => {
            const informes = reportes.filter((reporte) => reporte.usuarioId === item.id);
            const dominio = informes.length ? Math.round(informes.reduce((sum, reporte) => sum + reporte.dominio, 0) / informes.length) : 0;
            return <button className={`student-row ${seleccionado?.id === item.id ? "student-row-active" : ""}`} key={item.id} onClick={() => setSeleccionado(item)}><AvatarDisplay decorative usuario={item} /><span><strong>{item.nombre}</strong><small>Nivel {item.nivelActual} · {dominio || "—"}% dominio</small></span><span>›</span></button>;
          })}{!visibles.length ? <div className="empty-state"><p>No hay estudiantes que coincidan.</p></div> : null}</div>
        </aside>

        <article className="panel-card p-5 sm:p-6 h-[calc(100vh-8rem)] overflow-y-auto">
          {seleccionado ? <>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5"><div className="flex items-center gap-3"><div className="relative"><span className="absolute -inset-1 animate-pulse rounded-[20px] border border-emerald-300/15" /><AvatarDisplay className="!h-[52px] !w-[52px] !rounded-[17px]" usuario={seleccionado} /></div><div><p className="text-xl font-semibold">{seleccionado.nombre}</p><p className="mt-1 text-sm text-slate-400">{seleccionado.programa || "Ruta de programación orientada a objetos"}</p><span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[.06] px-2.5 py-1 text-[10px] uppercase tracking-[.12em] text-emerald-200"><ScanLine size={11} /> Perfil sincronizado</span></div></div><div className="text-right"><span className="section-kicker">Puntaje</span><strong className="mt-1 block text-2xl text-emerald-300">{progreso?.puntajeTotal ?? seleccionado.puntaje}</strong></div></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3"><MiniMetric label="Nivel actual" value={progreso?.nivelActual ?? seleccionado.nivelActual} /><MiniMetric label="Completados" value={progreso?.niveles.filter((item) => item.completado).length ?? 0} /><MiniMetric label="Informes IA" value={reportesSeleccionado.filter((item) => item.generadoPorIa).length} /></div>
            <div className="mt-6"><div className="flex items-center justify-between"><h3 className="font-semibold">Evolución por nivel</h3><span className="text-xs text-slate-500">Dominio / 100</span></div><div className="mastery-chart mt-4">{[1, 2, 3, 4, 5, 6].map((nivel) => { const reporte = reportesSeleccionado.find((item) => item.nivel === nivel); return <div key={nivel}><div className="mastery-track"><span style={{ height: `${Math.max(reporte?.dominio ?? 4, 4)}%` }} /></div><small>N{nivel}</small></div>; })}</div></div>
            <div className="mt-6"><h3 className="font-semibold">Informes y recomendaciones</h3><div className="mt-3 grid gap-3">{[...reportesSeleccionado].reverse().map((reporte) => <article className="teacher-report" key={reporte.id}><div><span>Nivel {reporte.nivel}</span><strong>{reporte.tituloNivel}</strong><p>{reporte.resumen}</p></div><div><strong>{reporte.dominio}%</strong><small>{reporte.recomendaciones[0] ?? "Continuar practicando"}</small></div></article>)}{!reportesSeleccionado.length ? <div className="empty-state"><span>∅</span><p>Este estudiante aún no tiene informes. Aparecerán al finalizar un nivel.</p></div> : null}</div></div>
          </> : <div className="empty-state"><p>Selecciona un estudiante para consultar su evidencia.</p></div>}
        </article>
      </div>
    </>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) { return <div className="mini-metric"><span>{label}</span><strong>{value}</strong></div>; }
