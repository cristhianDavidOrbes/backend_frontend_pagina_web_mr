import { ViewTransition, type ReactNode } from "react";

/**
 * Transición entre páginas con la View Transitions API (vía React).
 * - Por defecto: la página anterior se desvanece rápido y la nueva sube con suavidad.
 * - Con `transitionTypes={["nav-forward"]}` o `["nav-back"]` en un <Link>, se desliza
 *   horizontalmente para comunicar avance o regreso.
 * Sin soporte del navegador, la navegación funciona igual, sin animar.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      default="none"
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-in" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-out" }}
    >
      {children}
    </ViewTransition>
  );
}

/** Elemento compartido que se transforma de una página a otra (logo, tarjeta de acceso…). */
export function Shared({ name, children }: { name: string; children: ReactNode }) {
  return (
    <ViewTransition default="none" name={name} share="morph">
      {children}
    </ViewTransition>
  );
}
