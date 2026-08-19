"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
};

export function Reveal({ children, className, delay = 0, direction = "up" }: RevealProps) {
  const reduceMotion = useReducedMotion();
  const offset = direction === "left" ? { x: -34, y: 0 } : direction === "right" ? { x: 34, y: 0 } : direction === "none" ? { x: 0, y: 0 } : { x: 0, y: 34 };

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, ...offset, filter: "blur(8px)" }}
      transition={{ duration: 0.68, delay, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ amount: 0.16, once: true }}
      whileInView={reduceMotion ? undefined : { opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
    >
      {children}
    </motion.div>
  );
}

export function FloatLayer({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      animate={reduceMotion ? undefined : { y: [0, -10, 0], rotate: [0, 0.7, 0] }}
      className={className}
      transition={{ delay, duration: 4.8, ease: "easeInOut", repeat: Infinity }}
    >
      {children}
    </motion.div>
  );
}

