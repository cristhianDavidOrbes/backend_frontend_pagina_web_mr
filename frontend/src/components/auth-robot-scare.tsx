"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import styles from "./auth-robot-companion.module.css";

/** One quick image approach, full recording, then three still/silent seconds. */
export function AuthRobotScare({ onDismiss, onReveal, onComplete }: {
  onDismiss: () => void;
  onReveal: (onEnded: () => void) => Promise<boolean>;
  onComplete: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<number | null>(null);
  const loaded = useRef(false);
  const started = useRef(false);
  const silenceUntil = useRef<number | null>(null);
  const soundEnded = useCallback(() => {
    if (!dialog.current?.open) return;
    silenceUntil.current = performance.now() + 3000;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(onComplete, 3000);
  }, [onComplete]);
  const reveal = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    // Re-running effects cannot replay the clip or shorten the silent interval.
    timer.current = silenceUntil.current !== null
      ? window.setTimeout(onComplete, Math.max(0, silenceUntil.current - performance.now()))
      : window.setTimeout(onDismiss, 15000);
    if (started.current) return;
    started.current = true;
    // Start the single zoom only after the image is decoded and the dialog is open.
    // Keeping this on the existing element also avoids replaying it in Strict Mode.
    if (dialog.current) dialog.current.dataset.revealed = "true";
    void onReveal(soundEnded).then((playing) => {
      if (!playing && dialog.current?.open) onDismiss();
    }).catch(() => { if (dialog.current?.open) onDismiss(); });
  }, [onComplete, onDismiss, onReveal, soundEnded]);
  const imageReady = useCallback(() => {
    loaded.current = true;
    if (dialog.current?.open) reveal();
  }, [reveal]);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    if (loaded.current) reveal();
    // A stalled image still has an escape timeout, independent of the recording.
    timer.current ??= window.setTimeout(onDismiss, 5000);
    return () => { if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null; element?.close(); };
  }, [onDismiss, reveal]);
  return (
    <dialog ref={dialog} className={styles.scare} aria-label="Sorpresa de AlgoLab" data-auth-jumpscare
      onCancel={(event) => { event.preventDefault(); onDismiss(); }}>
      <Image src="/algolab/auth-rare-scare.png" alt="Rostro ficticio de terror de la sorpresa de AlgoLab"
        width={224} height={245} unoptimized loading="eager" onLoad={imageReady} onError={onDismiss} className={styles.scareImage} />
      <button type="button" className={styles.scareClose} onClick={onDismiss}>Cerrar · Esc</button>
    </dialog>
  );
}
