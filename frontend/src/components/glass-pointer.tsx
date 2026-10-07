"use client";

import { useEffect } from "react";

/**
 * Hace que el brillo de los botones de vidrio siga al puntero.
 * Un único listener delegado: solo escribe dos variables CSS en el botón activo.
 */
export function GlassPointer() {
  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    let frame = 0;
    function onMove(event: PointerEvent) {
      const target = (event.target as Element | null)?.closest?.<HTMLElement>(".btn");
      if (!target) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        target.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        target.style.setProperty("--my", `${event.clientY - rect.top}px`);
      });
    }
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
    };
  }, []);
  return null;
}
