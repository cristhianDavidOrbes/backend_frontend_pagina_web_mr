"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AvatarDisplay } from "@/components/avatar-display";
import { EASE_OUT, Reveal } from "@/components/reveal";
import { Dialog, EmptyState, Notice, PageHead, Spinner } from "@/components/ui";
import { apiRequest } from "@/lib/client-api";
import type { PerfilPublico, Ranking, RankingItem } from "@/lib/types";
import { useAuthSession } from "@/lib/use-auth-session";

const MEDALLAS = ["#f3c74f", "#c9d4d1", "#d39563"];

export default function EstudianteRankingPage() {
  const reduce = useReducedMotion();
  const { hydrated, token, usuario } = useAuthSession();
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [perfil, setPerfil] = useState<PerfilPublico | null>(null);
  const [cargandoPerfil, setCargandoPerfil] = useState<number | null>(null);

  async function abrirPerfil(id: number) {
    if (!token) return;
    setCargandoPerfil(id);
    setError("");
    try {
      const datos = await apiRequest<PerfilPublico>(`/api/usuarios/${id}/publico`, token);
      setPerfil(datos);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo abrir el perfil.");
    } finally {
      setCargandoPerfil(null);
    }
  }

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

  const estudiantes = ranking?.estudiantes ?? [];
  const podio = estudiantes.filter((e) => e.posicion <= 3).sort((a, b) => a.posicion - b.posicion);

  const fila = (item: RankingItem, index: number) => {
    const esActual = item.usuarioId === usuario.id;
    const medalla = item.posicion <= 3 ? MEDALLAS[item.posicion - 1] : null;
    return (
      <motion.li
        animate={{ opacity: 1, y: 0 }}
        className={`rank-row ${esActual ? "is-me" : ""}`}
        initial={{ opacity: 0, y: reduce ? 0 : 10 }}
        key={item.usuarioId}
        transition={{ duration: 0.35, delay: Math.min(index, 12) * 0.035, ease: EASE_OUT }}
      >
        <span className="rank-pos" style={medalla ? { color: "#1d1600", background: medalla } : undefined}>{item.posicion}</span>
        <button
          aria-label={`Ver el perfil público de ${item.nombre}`}
          className="rank-person"
          disabled={cargandoPerfil !== null}
          onClick={() => void abrirPerfil(item.usuarioId)}
          type="button"
        >
          <AvatarDisplay decorative usuario={item} />
          <span className="min-w-0">
            <strong>{item.nombre}{esActual ? " (tú)" : ""}</strong>
            <small>@{item.nombreUsuario || `estudiante-${item.usuarioId}`}</small>
          </span>
          {cargandoPerfil === item.usuarioId ? <Spinner /> : null}
        </button>
        <span className="rank-level">Nivel {Math.min(item.nivelActual, 4)}</span>
        <strong className="rank-points num">{item.puntaje}<small> pts</small></strong>
      </motion.li>
    );
  };

  return (
    <div className="space-y-6">
      <PageHead
        actions={
          <div className="rank-me">
            <span>Tu posición</span>
            <strong>{miPosicion ? `#${miPosicion.posicion}` : "—"}</strong>
            <small>de {ranking?.total ?? 0}</small>
          </div>
        }
        description="Se ordena por puntaje. Cada nivel cuenta tu mejor resultado, así que repetir una práctica solo suma si mejoras."
        title="Ranking"
      />

      {error ? <Notice tone="error">{error}</Notice> : null}
      {loading ? <div className="loading-card">Cargando la clasificación…</div> : null}

      {podio.length >= 3 ? (
        <Reveal as="section" className="podium" label="Primeros tres puestos">
          {[podio[1], podio[0], podio[2]].map((item, i) => (
            <motion.button
              animate={{ opacity: 1, y: 0 }}
              className={`podium-step podium-${item.posicion}`}
              initial={{ opacity: 0, y: reduce ? 0 : 30 }}
              key={item.usuarioId}
              onClick={() => void abrirPerfil(item.usuarioId)}
              transition={{ duration: 0.6, delay: [0.15, 0, 0.3][i], ease: EASE_OUT }}
              type="button"
            >
              <AvatarDisplay decorative usuario={item} />
              <strong>{item.nombre.split(" ")[0]}</strong>
              <span className="num">{item.puntaje} pts</span>
              <span className="podium-block" style={{ background: MEDALLAS[item.posicion - 1] }}>{item.posicion}</span>
            </motion.button>
          ))}
        </Reveal>
      ) : null}

      <section className="card overflow-hidden">
        {estudiantes.length ? (
          <ol className="rank-list">{estudiantes.map(fila)}</ol>
        ) : !loading && !error ? (
          <div className="p-5">
            <EmptyState icon={<Trophy size={30} />} title="Todavía no hay puntajes">
              El ranking aparecerá cuando los estudiantes completen prácticas en las gafas.
            </EmptyState>
          </div>
        ) : null}
      </section>

      <Dialog onClose={() => setPerfil(null)} open={Boolean(perfil)} title="Perfil público" width={420}>
        {perfil ? (
          <div className="grid justify-items-center text-center">
            <AvatarDisplay className="!h-24 !w-24 text-3xl" usuario={perfil} />
            <h3 className="title-md mt-4">{perfil.nombre}</h3>
            <p className="subtle text-sm">@{perfil.nombreUsuario || `estudiante-${perfil.id}`}</p>
            <div className="mt-5 grid w-full grid-cols-2 gap-3">
              <div className="stat"><span className="stat-label">Nivel</span><strong className="stat-value text-info">{Math.min(perfil.nivelActual, 4)}</strong></div>
              <div className="stat"><span className="stat-label">Puntos</span><strong className="stat-value text-action">{perfil.puntaje}</strong></div>
            </div>
            <p className="subtle mt-5 text-sm">Solo se muestra información pública de aprendizaje. El correo y otros datos privados no se comparten.</p>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
