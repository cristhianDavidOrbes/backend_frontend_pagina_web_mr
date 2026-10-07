"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BrainCircuit, Eye } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { EASE_OUT } from "@/components/reveal";
import { EmptyState, Notice, PageHead, Segmented } from "@/components/ui";
import { apiRequest } from "@/lib/client-api";
import { RUTA_MR } from "@/lib/ruta-mr";
import type { ReporteNivel } from "@/lib/types";
import { useAuthSession } from "@/lib/use-auth-session";

const fecha = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });

export default function EstudianteReportesPage() {
  const reduce = useReducedMotion();
  const { hydrated, token, usuario } = useAuthSession();
  const [reportes, setReportes] = useState<ReporteNivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<number>(0);

  useEffect(() => {
    if (!hydrated || !token) return;
    apiRequest<ReporteNivel[]>("/api/reportes", token)
      .then((data) => {
        setReportes(Array.isArray(data) ? data : []);
        setError("");
      })
      .catch((err: unknown) => {
        setReportes([]);
        setError(err instanceof Error ? err.message : "No se pudieron cargar tus recomendaciones.");
      })
      .finally(() => setLoading(false));
  }, [hydrated, token]);

  const visibles = useMemo(
    () => [...reportes].reverse().filter((r) => !filtro || r.nivel === filtro),
    [reportes, filtro],
  );

  if (!usuario) return null;

  return (
    <div className="space-y-6">
      <PageHead
        description="Cada vez que terminas un nivel en las gafas, el tutor separa lo que comprendiste, lo que conviene reforzar y tu siguiente ejercicio."
        title="Recomendaciones del tutor"
      />

      {error ? <Notice tone="error">{error}</Notice> : null}
      {loading ? <div className="loading-card">Cargando tus recomendaciones…</div> : null}

      {!loading && reportes.length > 0 ? (
        <Segmented
          label="Filtrar por nivel"
          onChange={setFiltro}
          options={[{ value: 0, label: "Todos" }, ...RUTA_MR.map((n) => ({ value: n.nivel, label: `Nivel ${n.nivel}` }))]}
          value={filtro}
        />
      ) : null}

      {!loading && !error && reportes.length === 0 ? (
        <EmptyState icon={<BrainCircuit size={32} />} title="Aún no tienes recomendaciones">
          Completa un nivel en las gafas para recibir tu primer diagnóstico.
        </EmptyState>
      ) : null}

      <motion.section className="grid gap-5 lg:grid-cols-2" layout>
        <AnimatePresence initial={false} mode="popLayout">
          {visibles.map((reporte) => (
            <motion.article
              animate={{ opacity: 1, scale: 1 }}
              className="card card-pad"
              exit={{ opacity: 0, scale: 0.97 }}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.97 }}
              key={reporte.id}
              layout
              transition={{ duration: 0.3, ease: EASE_OUT }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="subtle text-sm">
                    Nivel {reporte.nivel}
                    {reporte.fechaGeneracion ? ` · ${fecha.format(new Date(reporte.fechaGeneracion))}` : ""}
                  </p>
                  <h2 className="title-md mt-1">{reporte.tituloNivel}</h2>
                  <span className={`badge mt-2 ${reporte.completado ? "badge-action" : "badge-progress"}`}>
                    {reporte.completado ? "Nivel superado" : "Para repetir"} · {reporte.puntaje} pts
                  </span>
                </div>
                <div className="score-ring" style={{ "--score": `${reporte.dominio * 3.6}deg` } as CSSProperties}>
                  <strong>{reporte.dominio}</strong><span>%</span>
                </div>
              </div>

              <p className="muted mt-4">{reporte.resumen}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Lista items={reporte.fortalezas} titulo="Lo que comprendiste" tono="action" />
                <Lista items={reporte.aspectosMejora} titulo="Lo que necesitas reforzar" tono="progress" />
              </div>

              {reporte.evidencias?.length ? (
                <details className="report-details">
                  <summary><Eye size={16} /> Evidencia observada ({reporte.evidencias.length})</summary>
                  <ul>{reporte.evidencias.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </details>
              ) : null}

              {reporte.recomendaciones.length > 0 ? (
                <p className="next-move"><ArrowRight size={16} /> {reporte.recomendaciones[0]}</p>
              ) : null}
              {reporte.proximoEjercicio ? (
                <p className="mt-3 text-sm"><span className="subtle">Próximo ejercicio sugerido: </span>{reporte.proximoEjercicio}</p>
              ) : null}
              <p className="subtle mt-4 text-xs">{reporte.generadoPorIa ? "Análisis personalizado por el tutor IA" : "Análisis pedagógico base"}</p>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.section>
    </div>
  );
}

function Lista({ titulo, items, tono }: { titulo: string; items: string[]; tono: "action" | "progress" }) {
  return (
    <div className={`evidence evidence-${tono}`}>
      <span>{titulo}</span>
      {items.length ? <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>Sin observaciones todavía.</p>}
    </div>
  );
}
