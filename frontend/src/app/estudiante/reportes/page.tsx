"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { apiRequest } from "@/lib/client-api";
import type { ReporteNivel } from "@/lib/types";
import { useAuthSession } from "@/lib/use-auth-session";
import { Bot } from "lucide-react";

export default function EstudianteReportesPage() {
  const { hydrated, token, usuario } = useAuthSession();
  const [reportes, setReportes] = useState<ReporteNivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hydrated || !token) return;
    
    apiRequest<ReporteNivel[]>("/api/reportes", token)
      .then((data) => setReportes(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [hydrated, token]);

  if (!usuario) return null;
  
  if (loading) {
    return <div className="loading-card mt-5">Cargando tus reportes de aprendizaje…</div>;
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Bitácora inteligente</h1>
        <p className="mt-2 text-slate-400 text-sm">
          Historial completo de tus evaluaciones y recomendaciones de IA.
        </p>
      </div>
      
      {error && <div className="alert-error mb-5">{error}</div>}

      {!loading && reportes.length === 0 && !error ? (
        <div className="empty-state">
          <Bot size={40} className="mx-auto mb-4 opacity-50" />
          <p>Aún no tienes reportes. Completa un nivel en las gafas para activar tu primer diagnóstico.</p>
        </div>
      ) : (
        <section className="grid gap-5 lg:grid-cols-2">
          {[...reportes].reverse().map((reporte) => (
            <article className="report-card" key={reporte.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs uppercase tracking-widest text-emerald-400">Nivel {reporte.nivel}</span>
                  <h3 className="mt-1 text-lg font-semibold">{reporte.tituloNivel}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="score-ring" style={{ "--score": `${reporte.dominio * 3.6}deg` } as CSSProperties}>
                    <strong>{reporte.dominio}</strong><span>%</span>
                  </div>
                </div>
              </div>
              
              <p className="mt-4 text-sm text-slate-300 leading-relaxed">{reporte.resumen}</p>
              
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Insight label="Lo que comprendiste" items={reporte.fortalezas} tone="positive" />
                <Insight label="Lo que necesitas reforzar" items={reporte.aspectosMejora} tone="growth" />
              </div>

              <div className="mt-4">
                <Insight label="Evidencia observada" items={reporte.evidencias ?? []} tone="positive" />
              </div>
              
              {reporte.recomendaciones.length > 0 && (
                <div className="recommendation mt-5">
                  <span>Próximo paso</span>
                  <p>{reporte.recomendaciones[0]}</p>
                </div>
              )}

              {reporte.proximoEjercicio && (
                <div className="recommendation mt-3">
                  <span>Próximo ejercicio sugerido</span>
                  <p>{reporte.proximoEjercicio}</p>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </>
  );
}

function Insight({ label, items, tone }: { label: string; items: string[]; tone: string }) {
  return (
    <div className={`insight insight-${tone}`}>
      <span>{label}</span>
      <ul>
        {(items.length ? items : ["Sin observaciones todavía."]).map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
