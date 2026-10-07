"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Check, LockKeyhole, Trophy } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { EASE_OUT } from "@/components/reveal";
import { LevelObject } from "@/components/level-object";
import { RUTA_MR, type NivelRuta } from "@/lib/ruta-mr";

export type EstadoNodo = "completado" | "actual" | "disponible" | "bloqueado" | "invitado";

/** Desplazamiento horizontal de cada nodo: dibuja el zigzag del camino. */
const OFFSETS = [0, 1, 0, -1];

/**
 * Camino de aprendizaje de cuatro niveles (estilo "camino de lecciones").
 * El trazo se dibuja al hacer scroll y cada nodo abre un globo con su detalle.
 */
export function LearningPath({
  estado,
  detalle,
  meta,
}: {
  estado: (nivel: NivelRuta) => EstadoNodo;
  detalle: (nivel: NivelRuta, estado: EstadoNodo) => ReactNode;
  meta?: { titulo: string; logrado: boolean };
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState<number | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 90%", "end 75%"] });
  const trazo = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    if (abierto === null) return;
    function cerrar(event: KeyboardEvent | MouseEvent) {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof MouseEvent && (event.target as Element).closest?.(".path-node-wrap")) return;
      setAbierto(null);
    }
    document.addEventListener("keydown", cerrar);
    document.addEventListener("mousedown", cerrar);
    return () => {
      document.removeEventListener("keydown", cerrar);
      document.removeEventListener("mousedown", cerrar);
    };
  }, [abierto]);

  return (
    <div className="path" ref={ref}>
      <svg aria-hidden="true" className="path-line" preserveAspectRatio="none" viewBox="0 0 200 1000">
        <path className="path-line-bg" d="M100 100 C 100 200, 160 200, 160 300 S 100 400, 100 500 S 40 600, 40 700 S 100 800, 100 900" />
        <motion.path
          className="path-line-fg"
          d="M100 100 C 100 200, 160 200, 160 300 S 100 400, 100 500 S 40 600, 40 700 S 100 800, 100 900"
          style={{ pathLength: reduce ? 1 : trazo }}
        />
      </svg>

      <ol className="path-list">
        {RUTA_MR.map((nivel, i) => {
          const e = estado(nivel);
          const open = abierto === nivel.nivel;
          return (
            <motion.li
              className="path-step"
              initial={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
              key={nivel.nivel}
              style={{ "--offset": OFFSETS[i] } as React.CSSProperties}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
              viewport={{ once: true, amount: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
            >
              <div className="path-node-wrap">
                {e === "actual" ? <span aria-hidden="true" className="path-ping" /> : null}
                <button
                  aria-expanded={open}
                  aria-label={`Nivel ${nivel.nivel}: ${nivel.concepto}`}
                  className={`path-node is-${e}`}
                  onClick={() => setAbierto(open ? null : nivel.nivel)}
                  type="button"
                >
                  <LevelObject muted={e === "bloqueado"} objeto={nivel.objeto} size={66} />
                  <span aria-hidden="true" className="path-node-badge">
                    {e === "completado" ? <Check size={15} strokeWidth={3.5} /> : e === "bloqueado" ? <LockKeyhole size={13} strokeWidth={3} /> : nivel.nivel}
                  </span>
                </button>
                <span className="path-label">
                  <small>Nivel {nivel.nivel}</small>
                  {nivel.concepto}
                </span>
                <AnimatePresence>
                  {open ? (
                    <motion.div
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="path-bubble"
                      exit={{ opacity: 0, y: reduce ? 0 : 6, scale: 0.96 }}
                      initial={{ opacity: 0, y: reduce ? 0 : 10, scale: 0.94 }}
                      role="dialog"
                      aria-label={`Detalle del nivel ${nivel.nivel}`}
                      transition={{ duration: 0.26, ease: EASE_OUT }}
                    >
                      {detalle(nivel, e)}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </motion.li>
          );
        })}
        {meta ? (
          <motion.li
            className="path-step path-goal"
            initial={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
            viewport={{ once: true, amount: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
          >
            <span className={`path-trophy ${meta.logrado ? "is-done" : ""}`}><Trophy size={34} /></span>
            <span className="path-label">{meta.titulo}</span>
          </motion.li>
        ) : null}
      </ol>
    </div>
  );
}
