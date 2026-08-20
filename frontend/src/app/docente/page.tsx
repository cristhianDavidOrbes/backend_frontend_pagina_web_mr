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
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/client-api";
import type { Nivel, ReporteNivel, UsuarioSesion } from "@/lib/types";
import { useAuthSession } from "@/lib/use-auth-session";
import { AvatarDisplay } from "@/components/avatar-display";
import Link from "next/link";

export default function DocentePage() {
  const { hydrated, token } = useAuthSession();
  const [estudiantes, setEstudiantes] = useState<UsuarioSesion[]>([]);
  const [reportes, setReportes] = useState<ReporteNivel[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated || !token) return;
    Promise.all([
      apiRequest<UsuarioSesion[]>("/api/usuarios", token),
      apiRequest<ReporteNivel[]>("/api/reportes?todos=1", token),
      apiRequest<Nivel[]>("/api/niveles", token),
    ]).then(([usuariosData, reportesData, nivelesData]) => {
      setEstudiantes(usuariosData.filter((item) => item.rol === "ESTUDIANTE"));
      setReportes(reportesData);
      setNiveles(nivelesData);
    }).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  }, [hydrated, token]);

  const completados = reportes.filter((item) => item.completado).length;
  const dominioGrupo = reportes.length ? Math.round(reportes.reduce((sum, item) => sum + item.dominio, 0) / reportes.length) : 0;
  
  const estudiantesBajoDominio = reportes.filter((item) => item.dominio < 60);
  const necesitanApoyoIds = new Set(estudiantesBajoDominio.map((item) => item.usuarioId));
  const necesitanApoyo = necesitanApoyoIds.size;

  const topApoyo = estudiantes.filter(e => necesitanApoyoIds.has(e.id)).slice(0, 5);

  if (loading) return <div className="loading-card">Cargando métricas...</div>;

  return (
    <>
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

      {topApoyo.length > 0 && (
        <section className="mt-5 panel-card p-5">
          <p className="section-kicker">Atención requerida</p>
          <h3 className="mt-2 text-xl font-semibold">Estudiantes con dominio bajo</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topApoyo.map(est => {
               const informes = reportes.filter(r => r.usuarioId === est.id);
               const dom = informes.length ? Math.round(informes.reduce((sum, r) => sum + r.dominio, 0) / informes.length) : 0;
               return (
                 <Link href="/docente/estudiantes" key={est.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[.02] p-3 transition hover:bg-white/[.04]">
                   <AvatarDisplay decorative usuario={est} />
                   <div>
                     <strong className="block text-sm">{est.nombre}</strong>
                     <span className="text-xs text-rose-300">Dominio: {dom}%</span>
                   </div>
                 </Link>
               )
            })}
          </div>
        </section>
      )}
    </>
  );
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string | number; note: string }) { return <article className="metric-card metric-emerald transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/20"><span className="flex items-center justify-between gap-3">{label}<span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-300/[.08] text-emerald-200">{icon}</span></span><strong>{value}</strong><small>{note}</small></article>; }
function MissionChip({ icon, label }: { icon: React.ReactNode; label: string }) { return <span className="inline-flex items-center gap-2 rounded-full border border-white/[.08] bg-white/[.03] px-3 py-1.5 text-[11px] text-slate-400">{icon}{label}</span>; }
