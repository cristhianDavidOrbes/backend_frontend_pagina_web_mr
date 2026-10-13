"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { usePathname } from "next/navigation";
import { AuthRobotMotion, type CompanionFrame, type PlacedScenery } from "@/lib/auth-robot-motion";
import { AuthScareAudio } from "@/lib/auth-robot-scare-audio";
import { finishAuthEasterEgg } from "@/lib/auth-robot-easter-egg";
import { RobotStage, type RobotSignal } from "./robot-stage";
import { RobotCar, RobotEffect, RobotProp } from "./auth-robot-props";
import { AuthRobotScare } from "./auth-robot-scare";
import type { AuthRobotAnchor } from "./auth-robot-provider";
import styles from "./auth-robot-companion.module.css";

type Drag = { id: number; dx: number; dy: number };
type VisualState = Pick<CompanionFrame, "pose" | "facing" | "vehicle" | "effect" | "carried">;

/** A real hole hides the same canvas behind the card, without remounting it. */
function occlusionPath(width: number, height: number, boxes: DOMRect[]) {
  let path = `M0 0H${width}V${height}H0Z`;
  for (const box of boxes) {
    const { left: l, right: r, top: t, bottom: b } = box;
    const radius = Math.min(30, box.height / 2);
    path += `M${l + radius} ${t}H${r - radius}Q${r} ${t} ${r} ${t + radius}V${b - radius}Q${r} ${b} ${r - radius} ${b}H${l + radius}Q${l} ${b} ${l} ${b - radius}V${t + radius}Q${l} ${t} ${l + radius} ${t}Z`;
  }
  return `path(evenodd, "${path}")`;
}

export function AuthRobotCompanion({ anchor, signal, eerie = false }: { anchor: AuthRobotAnchor | null; signal: RobotSignal | null; eerie?: boolean }) {
  const pathname = usePathname();
  const scareAudio = useRef<AuthScareAudio | null>(null);
  const engine = useRef(new AuthRobotMotion());
  const actor = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const gloom = useRef<HTMLDivElement>(null);
  const occlusion = useRef("none");
  const handle = useRef<HTMLButtonElement>(null);
  const drag = useRef<Drag | null>(null);
  const keyboardHeld = useRef(false);
  const measured = useRef(false);
  const rarePress = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const previousView = useRef("");
  const previousPosition = useRef("");
  const previousScenery = useRef<readonly PlacedScenery[]>([]);
  const [scenery, setScenery] = useState<readonly PlacedScenery[]>([]);
  const [view, setView] = useState<VisualState>({ pose: "sit", facing: 1, vehicle: null, effect: null, carried: null });
  const [scare, setScare] = useState(false);
  const dismissScare = useCallback(() => { scareAudio.current?.stop(); setScare(false); }, []);
  const revealScare = useCallback((onEnded: () => void) => scareAudio.current?.reveal(onEnded) ?? Promise.resolve(false), []);
  const completeScare = useCallback(() => { dismissScare(); finishAuthEasterEgg(); }, [dismissScare]);

  // Only transforms change per frame. Forms and the WebGL scene do not rerender at 60 Hz.
  const paint = useCallback(() => {
    const frame = engine.current.frame;
    const position = `${frame.x}:${frame.y}:${frame.pose}:${frame.rotation}:${frame.layer}:${frame.scene}:${eerie}`;
    if (actor.current && position !== previousPosition.current) {
      previousPosition.current = position;
      actor.current.style.transform = `translate3d(${frame.x - 110}px, ${frame.y - 170 - (eerie ? 20 : 0)}px, 0) rotate(${frame.rotation}deg)`;
      actor.current.dataset.pose = eerie ? "haunted" : frame.pose;
      actor.current.dataset.depth = frame.layer;
      actor.current.dataset.scene = eerie ? "evento-sombrio" : frame.scene;
      if (layer.current) layer.current.style.clipPath = frame.layer === "behind" ? occlusion.current : "none";
    }
    const key = `${frame.pose}:${frame.facing}:${frame.vehicle}:${frame.effect}:${frame.carried}`;
    if (key !== previousView.current) {
      previousView.current = key;
      setView({ pose: frame.pose, facing: frame.facing, vehicle: frame.vehicle, effect: frame.effect, carried: frame.carried });
    }
    if (engine.current.scenery !== previousScenery.current) {
      previousScenery.current = engine.current.scenery;
      setScenery(engine.current.scenery);
    }
  }, [eerie]);

  const release = useCallback((cancelled = false, edge?: "left" | "right" | "top" | "bottom") => {
    const pointer = drag.current;
    drag.current = null;
    keyboardHeld.current = false;
    if (pointer && handle.current?.hasPointerCapture(pointer.id)) handle.current.releasePointerCapture(pointer.id);
    if (cancelled) engine.current.home();
    else engine.current.drop(edge);
    paint();
  }, [paint]);

  useEffect(() => {
    if (!anchor) return;
    let measurementFrame = 0;
    const measure = () => {
      if (!anchor.mascot.isConnected || !anchor.card.isConnected) return;
      const mascot = anchor.mascot.getBoundingClientRect();
      const card = anchor.card.getBoundingClientRect();
      const protectedBoxes = [card];
      const footer = anchor.card.closest("main")?.querySelector(":scope > p");
      const header = anchor.card.closest("main")?.previousElementSibling;
      if (footer) protectedBoxes.push(footer.getBoundingClientRect());
      if (header) protectedBoxes.push(header.getBoundingClientRect());
      occlusion.current = occlusionPath(window.innerWidth, window.innerHeight, protectedBoxes);
      if (backdrop.current) backdrop.current.style.clipPath = occlusion.current;
      if (gloom.current) { gloom.current.style.clipPath = occlusion.current; gloom.current.style.visibility = "visible"; }
      // The seat is the card's top edge; folded legs hang into its existing padding.
      engine.current.setGeometry({ home: { x: mascot.left + mascot.width / 2, y: card.top + 40 }, top: card.top, bottom: card.bottom, left: card.left, right: card.right, width: window.innerWidth, height: window.innerHeight });
      if (layer.current) layer.current.style.clipPath = engine.current.frame.layer === "behind" ? occlusion.current : "none";
      measured.current = true;
      if (layer.current) layer.current.style.visibility = "visible";
      if (backdrop.current) backdrop.current.style.visibility = "visible";
      paint();
    };
    const schedule = () => {
      cancelAnimationFrame(measurementFrame);
      measurementFrame = requestAnimationFrame(measure);
    };
    schedule();
    const observer = new ResizeObserver(schedule);
    observer.observe(anchor.mascot);
    observer.observe(anchor.card);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(measurementFrame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, [anchor, paint]);

  useEffect(() => {
    if (!eerie) return;
    // Preload only on the rare path. Fetching does not create an audio context.
    const picture = new window.Image();
    picture.src = "/algolab/auth-rare-scare.png";
    const audio = new AuthScareAudio();
    scareAudio.current = audio;
    void audio.prepare();
    const visibility = () => { if (document.hidden) dismissScare(); };
    window.addEventListener("blur", dismissScare);
    window.addEventListener("pagehide", dismissScare);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", dismissScare);
      window.removeEventListener("pagehide", dismissScare);
      document.removeEventListener("visibilitychange", visibility);
      dismissScare();
      audio.dispose();
      if (scareAudio.current === audio) scareAudio.current = null;
    };
  }, [eerie, pathname, dismissScare]);

  useEffect(() => {
    const motion = engine.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => { motion.setReducedMotion(preference.matches); paint(); };
    let frame = 0;
    let last = 0;
    const animate = (now: number) => {
      if (eerie) { motion.home(); paint(); return; }
      const focused = document.activeElement;
      const editing = focused instanceof HTMLElement && (focused.matches("input, textarea, select") || focused.isContentEditable);
      const home = motion.geometry?.home;
      const onScreen = home && home.y > 100 && home.y < window.innerHeight;
      if (measured.current) { motion.tick(last ? (now - last) / 1000 : 0, Boolean(onScreen) && !editing && focused !== handle.current); paint(); }
      last = now;
      frame = requestAnimationFrame(animate);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      last = 0;
      if (document.hidden) release(true);
      else frame = requestAnimationFrame(animate);
    };
    const blur = () => release(true);
    updatePreference();
    visibility();
    preference.addEventListener("change", updatePreference);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    return () => {
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", updatePreference);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
    };
  }, [paint, release, eerie]);

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (eerie) {
      if (event.isPrimary && event.button === 0) {
        rarePress.current = { x: event.clientX, y: event.clientY, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      return;
    }
    if (!event.isPrimary || event.button !== 0 || drag.current || !measured.current) return;
    event.preventDefault();
    keyboardHeld.current = false;
    drag.current = { id: event.pointerId, dx: event.clientX - engine.current.frame.x, dy: event.clientY - engine.current.frame.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    engine.current.grab();
    paint();
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (eerie) {
      const press = rarePress.current;
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) press.moved = true;
      return;
    }
    const held = drag.current;
    if (!held || held.id !== event.pointerId) return;
    engine.current.drag({ x: event.clientX - held.dx, y: event.clientY - held.dy });
    paint();
  }

  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (eerie) return;
    if (drag.current?.id !== event.pointerId) return;
    pointerMove(event);
    const edge = event.clientX <= 0 ? "left" : event.clientX >= window.innerWidth ? "right" : event.clientY <= 0 ? "top" : event.clientY >= window.innerHeight ? "bottom" : undefined;
    release(false, edge);
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    // Native button click handles Enter/Space in the rare scene, never focus/hover.
    if (eerie) return;
    if (drag.current) return;
    if (event.key === "Escape") { event.preventDefault(); release(true); return; }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (event.repeat) return;
      if (keyboardHeld.current) release();
      else { keyboardHeld.current = true; engine.current.grab(); paint(); }
    } else if (keyboardHeld.current && event.key.startsWith("Arrow")) {
      event.preventDefault();
      const step = event.shiftKey ? 60 : 24;
      const current = engine.current.frame;
      engine.current.drag({ x: current.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0), y: current.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0) });
      paint();
    }
  }

  return (
    <>
    {eerie ? <div ref={gloom} className={styles.gloom} data-auth-eerie aria-hidden="true" /> : null}
    <div ref={backdrop} className={styles.backdrop} data-auth-scenery="true" aria-hidden="true" hidden={eerie}>
      {scenery.map((item) => (
        <div key={item.id} className={styles.sceneryItem} data-scenery-kind={item.kind}
          style={{ width: item.size, height: item.size, transform: `translate3d(${item.x - item.size / 2}px, ${item.y - item.size}px, 0) rotate(${item.rotation}deg)` }}>
          <RobotProp kind={item.kind} size={item.size} />
        </div>
      ))}
    </div>
    <div ref={layer} className={styles.layer} data-auth-companion="true">
      <div ref={actor} className={`${styles.actor}${!eerie && view.vehicle ? ` ${styles.driver}` : ""}${eerie ? ` ${styles.eerieActor}` : ""}`} data-pose={eerie ? "haunted" : "sit"}>
        <div className={styles.model} aria-hidden="true">
          <RobotStage draggable={false} presence="quiet" pose={eerie ? "haunted" : view.pose} facing={view.facing} signal={eerie ? null : signal} />
        </div>
        {!eerie && view.vehicle ? <div className={styles.vehicle} data-robot-vehicle="car" aria-hidden="true"><RobotCar facing={view.facing} moving={view.pose === "drive"} /></div> : null}
        {!eerie && view.carried && !(view.carried === "car" && view.vehicle) ? <div className={styles.carried} data-carried-kind={view.carried} data-facing={view.facing} aria-hidden="true"><RobotProp kind={view.carried} size={105} /></div> : null}
        {!eerie && view.effect ? <div className={`${styles.effect} ${styles[view.effect]}`} data-robot-effect={view.effect} aria-hidden="true"><RobotEffect kind={view.effect} /></div> : null}
        <button ref={handle} type="button" className={styles.handle}
          aria-label={eerie ? "Examinar el robot de AlgoLab" : "Mover el robot de AlgoLab"} aria-describedby="auth-robot-instructions"
          aria-pressed={!eerie && view.pose === "held"} title={eerie ? "Examinar el robot" : "Arrástrame y volveré a sentarme"}
          onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
          onClick={(event) => {
            if (eerie && !scare && (event.detail === 0 || !rarePress.current?.moved)) {
              scareAudio.current?.arm();
              setScare(true);
            }
            rarePress.current = null;
          }}
          onPointerCancel={(event) => { if (rarePress.current) rarePress.current.moved = true; if (drag.current?.id === event.pointerId) release(true); }}
          onLostPointerCapture={(event) => { if (drag.current?.id === event.pointerId) release(true); }}
          onKeyDown={keyDown}
          onFocus={() => { if (!drag.current && !keyboardHeld.current) { engine.current.home(); paint(); } }}
          onBlur={() => { if (keyboardHeld.current) release(true); }} />
      </div>
      <span id="auth-robot-instructions" className={styles.srOnly}>{eerie ? "Pulsa el robot o usa Intro o Espacio para descubrir una sorpresa con imagen y sonido. Escape cierra la sorpresa." : "Arrastra el robot para moverlo. Con teclado, pulsa Espacio o Intro para agarrarlo, usa las flechas y vuelve a pulsar para soltarlo. Escape lo devuelve a su sitio."}</span>
    </div>
    {eerie && scare ? <AuthRobotScare onDismiss={dismissScare} onReveal={revealScare} onComplete={completeScare} /> : null}
    </>
  );
}
