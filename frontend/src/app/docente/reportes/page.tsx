"use client";

import { useEffect, useState, useMemo } from "react";
import { apiRequest } from "@/lib/client-api";
import type { ReporteNivel } from "@/lib/types";
import { useAuthSession } from "@/lib/use-auth-session";
import { Search } from "lucide-react";

export default function DocenteReportesPage() {
  const { hydrated, token } = useAuthSession();
  const [reportes, setReportes] = useState<ReporteNivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (!hydrated || !token) return;
    apiRequest<ReporteNivel[]>("/api/reportes?todos=1", token)
      .then(setReportes)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [hydrated, token]);

  const reportesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return reportes;
    return reportes.filter(r => r.usuarioNombre?.toLowerCase().includes(q) || r.tituloNivel?.toLowerCase().includes(q) || `nivel ${r.nivel}`.includes(q));
  }, [busqueda, reportes]);

  if (loading) return <div className="loading-card">Cargando reportes...</div>;

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Todos los reportes</h2>
          <p className="text-sm text-slate-400">Revisa la evidencia de todo tu grupo</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por estudiante o nivel..." 
            className="field-input pl-10"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>
      
      {error && <div className="alert-error">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportesFiltrados.map(reporte => (
          <article key={reporte.id} className="report-card p-5 rounded-xl border border-white/10 bg-white/[.02]">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-xs font-semibold text-emerald-300">Nivel {reporte.nivel}</span>
                <h3 className="font-semibold">{reporte.tituloNivel}</h3>
                <p className="text-sm text-slate-300">{reporte.usuarioNombre}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-mono text-emerald-200">{reporte.dominio}%</span>
                <span className="block text-[10px] uppercase text-slate-500">Dominio</span>
              </div>
            </div>
            
            <p className="text-sm text-slate-400 line-clamp-3 mb-4">{reporte.resumen}</p>
            
            {reporte.fortalezas?.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-semibold text-emerald-400">Fortalezas:</span>
                <ul className="list-disc pl-4 text-xs text-slate-300">
                  {reporte.fortalezas.slice(0, 2).map((f, i) => <li key={i} className="truncate">{f}</li>)}
                </ul>
              </div>
            )}
            
            {reporte.aspectosMejora?.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-amber-400">Oportunidades:</span>
                <ul className="list-disc pl-4 text-xs text-slate-300">
                  {reporte.aspectosMejora.slice(0, 2).map((a, i) => <li key={i} className="truncate">{a}</li>)}
                </ul>
              </div>
            )}
          </article>
        ))}
      </div>
      
      {reportesFiltrados.length === 0 && (
        <div className="empty-state mt-6">
          <p>No se encontraron reportes{busqueda ? " para tu búsqueda" : ""}.</p>
        </div>
      )}
    </>
  );
}
