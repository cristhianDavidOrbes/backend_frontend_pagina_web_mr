"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import styles from "@/app/auth-pages.module.css";
import { Shared } from "@/components/page-transition";
import { ProgressBar } from "@/components/ui";
import type { RobotSignal } from "@/components/robot-stage";

const RobotStage = dynamic(() => import("@/components/robot-stage").then((m) => m.RobotStage), {
  ssr: false,
  loading: () => <div className="robot-stage robot-stage-checking" />,
});

/**
 * Marco de acceso, registro y bienvenida: una tarjeta de vidrio centrada, la
 * mascota asomándose y, si hay pasos, una barra de progreso arriba.
 * La tarjeta y el logo se transforman entre páginas (View Transitions).
 */
export function AuthLayout({
  title,
  intro,
  children,
  footer,
  signal,
  steps,
}: {
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  signal?: RobotSignal | null;
  steps?: { current: number; total: number };
  /** Se conserva por compatibilidad. */
  aside?: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Shared name="brand">
          <Link aria-label="AlgoLab, inicio" className="brand" href="/" transitionTypes={["nav-back"]}>
            <span className="brand-mark">A</span>
            <span className="brand-name">AlgoLab</span>
          </Link>
        </Shared>
        {steps ? (
          <div className={styles.progress}>
            <ProgressBar label={`Paso ${steps.current} de ${steps.total}`} tone="action" value={(steps.current / steps.total) * 100} />
          </div>
        ) : <span className="flex-1" />}
        <Link aria-label="Volver al inicio" className="btn btn-ghost btn-icon" href="/" transitionTypes={["nav-back"]}>
          <X size={22} />
        </Link>
      </header>

      <main className={styles.body} id="contenido">
        <div className={styles.mascot} aria-hidden="true">
          <RobotStage draggable={false} presence="quiet" signal={signal} />
        </div>
        <Shared name="auth-card">
          <section className={`glass ${styles.card}`}>
            <h1 className={styles.title}>{title}</h1>
            {intro ? <p className={styles.intro}>{intro}</p> : null}
            {children}
          </section>
        </Shared>
        {footer ? <p className={styles.footer}>{footer}</p> : null}
      </main>
    </div>
  );
}
