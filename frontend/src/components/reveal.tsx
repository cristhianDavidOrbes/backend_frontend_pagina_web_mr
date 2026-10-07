"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Sistema de movimiento de AlgoLab.
 * - Entradas: desplazamiento corto (16–24 px) + opacidad, una sola vez por sección.
 * - Secuencias: 60–80 ms entre elementos relacionados.
 * - Cambios de contexto (nivel, pestaña, detalle): fundido cruzado con leve desplazamiento.
 * Con "reducir movimiento" solo cambia la opacidad.
 */
export const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;

type Direction = "up" | "left" | "right" | "none";

function offset(direction: Direction, distance: number) {
  if (direction === "left") return { x: -distance, y: 0 };
  if (direction === "right") return { x: distance, y: 0 };
  if (direction === "none") return { x: 0, y: 0 };
  return { x: 0, y: distance };
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: Direction;
  as?: "div" | "section" | "article" | "li" | "header" | "aside";
  id?: string;
  label?: string;
};

export function Reveal({ children, className = "", delay = 0, direction = "up", as = "div", id, label }: RevealProps) {
  const reduce = useReducedMotion();
  const from = reduce ? { x: 0, y: 0 } : offset(direction, 22);
  const Tag = motion[as];
  return (
    <Tag
      aria-label={label}
      className={className}
      data-reveal=""
      id={id}
      initial={{ opacity: 0, ...from }}
      transition={{ duration: reduce ? 0.2 : 0.65, delay, ease: EASE_OUT }}
      viewport={{ once: true, amount: 0.18, margin: "0px 0px -8% 0px" }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
    >
      {children}
    </Tag>
  );
}

const groupVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export function Stagger({
  children,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol" | "section";
}) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial="hidden"
      variants={groupVariants}
      viewport={{ once: true, amount: 0.15 }}
      whileInView="visible"
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({
  children,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduce ? 0 : 16 },
        visible: { opacity: 1, y: 0, transition: { duration: reduce ? 0.2 : 0.55, ease: EASE_OUT } },
      }}
    >
      {children}
    </Tag>
  );
}

/** Transición continua al cambiar de nivel, objeto, pestaña o detalle. */
export function Swap({
  children,
  swapKey,
  className = "",
  direction = 1,
}: {
  children: ReactNode;
  swapKey: string | number;
  className?: string;
  direction?: 1 | -1;
}) {
  const reduce = useReducedMotion();
  const d = reduce ? 0 : 14 * direction;
  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        className={className}
        exit={{ opacity: 0, x: -d }}
        initial={{ opacity: 0, x: d }}
        key={swapKey}
        transition={{ duration: reduce ? 0.12 : 0.28, ease: EASE_OUT }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function FloatLayer({ children, className = "" }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      animate={reduce ? undefined : { y: [0, -6, 0] }}
      className={className}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}
