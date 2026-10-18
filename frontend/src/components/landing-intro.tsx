"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { markIntroSeen, readIntroState, shouldShowIntro } from "@/lib/landing-intro";
import { createLandingAssembly, type LandingAnchors } from "@/lib/landing-assembly";
import { LandingRobotContext } from "./landing-robot-context";
import styles from "./landing-intro.module.css";

type Connection = { saveData?: boolean };

/** One 3D scene and one protagonist, from the room through the real landing. */
export function LandingIntro({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [live, setLive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const scene = useRef<HTMLIFrameElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const pieces = useRef<HTMLDivElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const assembly = useRef<ReturnType<typeof createLandingAssembly> | null>(null);
  const waiting = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const started = useRef(false);
  const ready = useRef(false);
  const userPaused = useRef(false);
  const lastSent = useRef(-1);
  const timeline = useRef(0);
  const lastTick = useRef<number | null>(null);

  const send = useCallback((message: Record<string, unknown>) => {
    scene.current?.contentWindow?.postMessage(message, location.origin);
  }, []);
  const target = useCallback(() => {
    const stage = content.current?.querySelector(".hero-stage")?.getBoundingClientRect();
    return stage ? { x: (stage.left + stage.width / 2) / innerWidth, y: (stage.bottom - stage.height * .1) / innerHeight, height: stage.height * .78 / innerHeight } : { x: .334, y: .702, height: .394 };
  }, []);
  const clearWaiting = useCallback(() => { clearTimeout(waiting.current); waiting.current = undefined; }, []);
  const finish = useCallback((seen = true) => {
    clearWaiting(); video.current?.pause();
    if (seen) markIntroSeen();
    if (ready.current) send({ type: "algolab:land", target: target() });
    setActive(false);
  }, [clearWaiting, send, target]);
  const robotContext = useMemo(() => ({ live, send }), [live, send]);

  useEffect(() => {
    let state;
    try { state = readIntroState(window.localStorage); }
    catch { state = { preference: "once" as const, seen: true }; }
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    if (!shouldShowIntro({ ...state, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches, saveData: connection?.saveData, preview: new URLSearchParams(location.search).get("intro") === "preview" })) return;
    const frame = requestAnimationFrame(() => setActive(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function message(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== scene.current?.contentWindow) return;
      if (event.data?.type === "algolab:ready" && active) {
        ready.current = true; setLive(true); clearWaiting();
        if (!started.current) { started.current = true; markIntroSeen(); }
        send({ type: "algolab:render", time: video.current?.currentTime ?? 0, target: target() });
        if (!userPaused.current && !document.hidden) void video.current?.play().catch(() => { /* The visual clock never depends on autoplay permission. */ });
      }
      if (event.data?.type === "algolab:error") {
        ready.current = false; setLive(false); finish(false);
      }
      if (event.data?.type === "algolab:frame" && active) {
        if (content.current && pieces.current && event.data.time >= 17.2) {
          assembly.current ??= createLandingAssembly(content.current, pieces.current);
          assembly.current.update(event.data.time, event.data.anchors as LandingAnchors);
        }
      }
    }
    window.addEventListener("message", message);
    return () => window.removeEventListener("message", message);
  }, [active, clearWaiting, finish, send, target]);

  useEffect(() => {
    if (!live || active) return;
    let frame = 0;
    const updateTarget = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = content.current?.querySelector(".hero-stage")?.getBoundingClientRect();
        send({ type: "algolab:target", target: target(), visible: Boolean(rect && rect.bottom > 0 && rect.top < innerHeight) });
      });
    };
    updateTarget();
    window.addEventListener("scroll", updateTarget, { passive: true, capture: true });
    window.addEventListener("resize", updateTarget);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", updateTarget, true); window.removeEventListener("resize", updateTarget); };
  }, [active, live, send, target]);

  useEffect(() => {
    if (!active) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const contentElement = content.current;
    const bodyOverflow = document.body.style.overflow, htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden"; document.documentElement.style.overflow = "hidden";
    skip.current?.focus({ preventScroll: true });
    let resumeAfterVisibility = false;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const reduceMotion = () => { if (motion.matches) finish(false); };
    function resize() { assembly.current?.dispose(); assembly.current = null; lastSent.current = -1; }
    function visibility() {
      clearWaiting();
      lastTick.current = null;
      if (document.hidden) { resumeAfterVisibility = Boolean(video.current && !video.current.paused); video.current?.pause(); }
      else if (resumeAfterVisibility && !userPaused.current && ready.current) void video.current?.play().catch(() => setBlocked(true));
    }
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); finish(); return; }
      if (event.key !== "Tab") return;
      const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    window.addEventListener("resize", resize);
    motion.addEventListener("change", reduceMotion);
    document.addEventListener("visibilitychange", visibility); document.addEventListener("keydown", keyboard);
    const loadDeadline = setTimeout(() => { if (!ready.current) finish(false); }, 15000);
    let frame = 0;
    function update(now: number) {
      if (lastTick.current === null) lastTick.current = now;
      if (ready.current && !userPaused.current && !document.hidden) timeline.current += (now - lastTick.current) / 1000;
      lastTick.current = now;
      const time = Math.min(20, timeline.current);
      if (time >= 20 && ready.current) { finish(); return; }
      shell.current?.style.setProperty("--intro-time", String(Math.min(1, time / 20)));
      if (ready.current && (Math.abs(time - lastSent.current) >= 1 / 30 || lastSent.current < 0)) {
        lastSent.current = time;
        send({ type: "algolab:render", time, target: target() });
      }
      frame = requestAnimationFrame(update);
    }
    frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame); clearTimeout(loadDeadline); clearWaiting();
      assembly.current?.dispose(); assembly.current = null;
      window.removeEventListener("resize", resize); motion.removeEventListener("change", reduceMotion);
      document.removeEventListener("visibilitychange", visibility); document.removeEventListener("keydown", keyboard);
      document.body.style.overflow = bodyOverflow; document.documentElement.style.overflow = htmlOverflow;
      if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus({ preventScroll: true });
      else { const title = contentElement?.querySelector("h1"); if (title) { title.setAttribute("tabindex", "-1"); title.focus({ preventScroll: true }); title.removeAttribute("tabindex"); } }
    };
  }, [active, clearWaiting, finish, send, target]);

  function waitForMedia() {
    clearWaiting();
    if (!ready.current || userPaused.current || document.hidden) return;
    waiting.current = setTimeout(() => finish(false), 8000);
  }
  function togglePlayback() {
    const element = video.current; if (!element) return;
    if (!element.paused && !blocked) { userPaused.current = true; element.pause(); clearWaiting(); setPaused(true); }
    else { userPaused.current = false; if (ready.current) void element.play().then(() => { setPaused(false); setBlocked(false); }).catch(() => setBlocked(true)); }
  }

  return <LandingRobotContext.Provider value={robotContext}>
    <div className={styles.experience} data-intro-active={active || undefined} data-live-robot={live || undefined} ref={shell}>
      <div className={styles.content} inert={active || undefined} ref={content}>{children}</div>
      {active || live ? <div className={styles.sceneLayer} data-playing={active || undefined}>
        {active && !live ? <div aria-hidden className={styles.backdrop} /> : null}
        <iframe aria-hidden className={styles.scene} ref={scene} src="/intro-scene/index.html?site=1" tabIndex={-1} title="Escena continua y personaje 3D de AlgoLab" />
        {active ? <>
          <div aria-hidden className={styles.assembly} inert ref={pieces} />
          <div aria-describedby="intro-description" aria-label="Bienvenida a AlgoLab" aria-modal="true" className={styles.overlay} ref={dialog} role="dialog">
            <p className="sr-only" id="intro-description">Animación de 20 segundos. El robot transforma objetos en un cuarto de realidad mixta y permanece en la página de inicio. Puedes pausarla, activar el sonido u omitirla.</p>
            <video aria-hidden autoPlay={live && !paused} className={styles.clock} disablePictureInPicture muted={muted}
              onSeeked={() => { if (video.current) timeline.current = Math.min(20, video.current.currentTime); lastTick.current = null; lastSent.current = -1; }}
              onCanPlay={() => { clearWaiting(); if (ready.current && !userPaused.current && !document.hidden) void video.current?.play().catch(() => { /* Sound remains opt-in; the visual scene continues. */ }); }}
              onEnded={() => finish()} onError={() => finish(false)}
              onLoadedMetadata={() => { if (video.current) video.current.volume = .65; }}
              onLoadStart={waitForMedia} onWaiting={waitForMedia}
              onPlaying={() => { clearWaiting(); setBlocked(false); setPaused(false); if (!started.current) { started.current = true; markIntroSeen(); } }}
              playsInline preload="auto" ref={video} src="/media/intro/algolab-soundtrack.mp3" />
            {!live ? <p className={styles.loading} role="status">Preparando el cuarto…</p> : null}
            <div className={styles.controls}>
              <button aria-label={paused || blocked ? "Reproducir animación" : "Pausar animación"} onClick={togglePlayback} type="button">
                {paused || blocked ? <Play aria-hidden size={18} /> : <Pause aria-hidden size={18} />}<span>{paused || blocked ? "Reproducir" : "Pausar"}</span>
              </button>
              <button aria-label={muted ? "Activar sonido" : "Silenciar sonido"} aria-pressed={!muted} onClick={() => { if (video.current) { video.current.muted = !muted; video.current.volume = .65; if (muted && !userPaused.current) { video.current.currentTime = timeline.current; void video.current.play().catch(() => setBlocked(true)); } } setMuted(!muted); }} type="button">
                {muted ? <VolumeX aria-hidden size={18} /> : <Volume2 aria-hidden size={18} />}<span>{muted ? "Sonido" : "Silenciar"}</span>
              </button>
              <button className={styles.skip} onClick={() => finish()} ref={skip} type="button">Omitir <ArrowRight aria-hidden size={18} /></button>
            </div>
            <div aria-hidden className={styles.progress}><span /></div>
          </div>
        </> : null}
      </div> : null}
    </div>
  </LandingRobotContext.Provider>;
}
