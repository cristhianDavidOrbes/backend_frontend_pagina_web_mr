"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, Medal, Trophy } from "lucide-react";

import { apiRequest } from "@/lib/client-api";
import type { Ranking } from "@/lib/types";
import { useAuthSession } from "@/lib/use-auth-session";

export default function EstudianteRankingPage() {
  const { hydrated, token, usuario } = useAuthSession();
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hydrated || !token) return;

    apiRequest<Ranking>("/api/ranking", token)
      .then(setRanking)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "No pudimos cargar el ranking.");
      })
      .finally(() => setLoading(false));
  }, [hydrated, token]);

  const miPosicion = useMemo(
    () => ranking?.estudiantes.find((item) => item.usuarioId === usuario?.id),
    [ranking, usuario?.id],
  );

  if (!usuario) return null;
  if (loading) return <div className="loading-card">Organizando la clasificación…</div>;

  return (
    <div className="space-y-5">
      {error ? <div className="alert-error">{error}</div> : null}

      <section className="relative overflow-hidden rounded-[1.75rem] border border-amber-300/20 bg-[radial-gradient(circle_at_82%_0%,rgba(251,191,36,.18),transparent_34%),linear-gradient(135deg,rgba(10,28,25,.98),rgba(7,17,22,.98))] p-5 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:p-7">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="section-kicker flex items-center gap-2 text-amber-200"><Crown size={14} /> Clasificación AlgoLab</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-[-.045em] text-white sm:text-4xl">Cada reto completado impulsa tu posición.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300/75 sm:text-base">Compara tu avance con otros estudiantes. El puntaje de las prácticas y los niveles superados actualizan esta tabla.</p>
          </div>
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[.08] px-5 py-4 text-center">
            <span className="block font-mono text-[10px] uppercase tracking-[.18em] text-amber-200/75">Tu posición</span>
            <strong className="mt-1 block text-4xl font-black text-amber-200">{miPosicion ? `#${miPosicion.posicion}` : "—"}</strong>
            <small className="text-xs text-slate-400">de {ranking?.total ?? 0} estudiantes</small>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#081614]/90">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><Trophy className="text-amber-300" size={19} /> Ranking general</h3>
            <p className="mt-1 text-xs text-slate-400">Ordenado por el puntaje acumulado en AlgoLab.</p>
          </div>
          <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[.07] px-3 py-1 font-mono text-[10px] uppercase tracking-[.14em] text-emerald-200">Actualizado</span>
        </header>

        {ranking?.estudiantes.length ? (
          <ol className="divide-y divide-white/[.07]">
            {ranking.estudiantes.map((item) => {
              const esActual = item.usuarioId === usuario.id;
              const top = item.posicion <= 3;
              return (
                <li className={`grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 transition sm:grid-cols-[58px_minmax(0,1fr)_110px_110px] sm:px-6 ${esActual ? "bg-emerald-300/[.09] shadow-[inset_3px_0_0_#34d399]" : "hover:bg-white/[.025]"}`} key={item.usuarioId}>
                  <span className={`grid h-9 w-9 place-items-center rounded-xl font-mono text-sm font-bold ${top ? "border border-amber-300/25 bg-amber-300/10 text-amber-200" : "bg-white/[.04] text-slate-400"}`}>
                    {top ? <Medal size={17} /> : item.posicion}
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-white sm:text-base">{item.nombre}{esActual ? " (Tú)" : ""}</strong>
                    <span className="block truncate text-xs text-slate-500">@{item.nombreUsuario || `estudiante-${item.usuarioId}`}</span>
                  </div>
                  <div className="hidden text-center sm:block"><span className="block text-[10px] uppercase tracking-wider text-slate-500">Nivel</span><strong className="text-sm text-cyan-200">{item.nivelActual}</strong></div>
                  <div className="text-right"><span className="hidden text-[10px] uppercase tracking-wider text-slate-500 sm:block">Puntos</span><strong className="font-mono text-sm text-emerald-200 sm:text-base">{item.puntaje}</strong></div>
                </li>
              );
            })}
          </ol>
        ) : !error ? (
          <div className="empty-state m-5"><Trophy className="mx-auto mb-3 opacity-40" size={36} /><p>El ranking aparecerá cuando existan puntajes registrados.</p></div>
        ) : null}
      </section>
    </div>
  );
}
