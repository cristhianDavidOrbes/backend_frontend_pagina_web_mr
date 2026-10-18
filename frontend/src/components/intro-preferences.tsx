"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { Film, Play } from "lucide-react";
import { getIntroPreference, saveIntroPreference, subscribeIntroPreference, type IntroPreference } from "@/lib/landing-intro";

const subscribeReady = () => () => {};

export function IntroPreferences() {
  const id = useId();
  const preference = useSyncExternalStore(subscribeIntroPreference, getIntroPreference, () => "once" as IntroPreference);
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const [notice, setNotice] = useState("");
  return (
    <section aria-labelledby={`${id}-title`} className="card overflow-hidden">
      <header className="flex items-start gap-3 border-b border-line/10 p-5">
        <Film aria-hidden className="mt-1 shrink-0 text-action" size={20} />
        <div>
          <h2 className="title-md" id={`${id}-title`}>Animación de entrada</h2>
          <p className="muted mt-1 text-sm">El robot te da la bienvenida a AlgoLab en una historia de 20 segundos.</p>
        </div>
      </header>
      <div className="space-y-4 p-5">
        <label className="field-label" htmlFor={`${id}-preference`}>
          <span id={`${id}-label`}>Cuándo mostrarla</span>
          <select aria-describedby={`${id}-help`} aria-labelledby={`${id}-label`} className="field-input" disabled={!ready} id={`${id}-preference`} onChange={event => {
            const next = event.target.value as IntroPreference;
            setNotice(saveIntroPreference(next) ? "Preferencia guardada en este navegador." : "No se pudo guardar. Permite el almacenamiento de este sitio e inténtalo de nuevo.");
          }} value={preference}>
            <option value="once">Solo la primera vez en este dispositivo</option>
            <option value="always">Siempre al abrir la página de inicio</option>
            <option value="never">No mostrar automáticamente</option>
          </select>
        </label>
        <p className="muted text-sm" id={`${id}-help`}>Se guarda en este navegador, no en tu cuenta. Si borras los datos del sitio o usas otro navegador, se considera una primera visita. Se respeta la reducción de movimiento y el ahorro de datos.</p>
        <Link className="btn btn-secondary" href="/?intro=preview"><Play aria-hidden size={17} /> Ver de nuevo</Link>
        <p aria-live="polite" className="muted text-sm" role="status">{notice}</p>
      </div>
    </section>
  );
}
