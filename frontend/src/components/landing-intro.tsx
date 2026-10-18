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
  const [muted, setMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [preparing, setPreparing] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const video = useRef<HTMLAudioElement>(null);
  const scene = useRef<HTMLIFrameElement>(null);
  const sceneLayer = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const pieces = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const anchors = useRef<LandingAnchors>({});
  const targetSnapshot = useRef({ x: .334, y: .702, height: .394 });
  const skip = useRef<HTMLButtonElement>(null);
  const assembly = useRef<ReturnType<typeof createLandingAssembly> | null>(null);
  const waiting = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const started = useRef(false);
  const ready = useRef(false);
  const mediaReady = useRef(false);
  const clockStarted = useRef(false);
  const userPaused = useRef(false);
  const lastSent = useRef(-1);
  const timeline = useRef(0);
  const lastTick = useRef<number | null>(null);

  const send = useCallback((message: Record<string, unknown>) => {
    scene.current?.contentWindow?.postMessage(message, location.origin);
  }, []);
  const measureTarget = useCallback(() => {
    const stage = content.current?.querySelector(".hero-stage")?.getBoundingClientRect();
    const viewport = scene.current?.getBoundingClientRect();
    if (stage && viewport?.width && viewport.height) targetSnapshot.current = { x: (stage.left + stage.width / 2 - viewport.left) / viewport.width, y: (stage.bottom - stage.height * .1 - viewport.top) / viewport.height, height: stage.height * .78 / viewport.height };
    return targetSnapshot.current;
  }, []);
  const target = useCallback(() => targetSnapshot.current, []);
  const clearWaiting = useCallback(() => { clearTimeout(waiting.current); waiting.current = undefined; }, []);
  const beginClock = useCallback(() => {
    if (!ready.current || clockStarted.current) return;
    clockStarted.current = true;
    timeline.current = 0; lastTick.current = null;
    setPreparing(false);
    if (!started.current) { started.current = true; markIntroSeen(); }
  }, []);
  const playSound = useCallback(() => {
    const element = video.current;
    if (!element || !ready.current || userPaused.current || document.hidden) return;
    element.volume = .65;
    // Keep audio aligned even when autoplay was denied while the visual clock continued.
    if (clockStarted.current && Math.abs(element.currentTime - timeline.current) > .15) element.currentTime = timeline.current;
    void element.play().then(() => {
      if (video.current === element) { beginClock(); setAudioBlocked(false); }
    }).catch((error: unknown) => {
      if (video.current !== element) return;
      clearWaiting();
      if (!element.muted && error instanceof DOMException && error.name === "NotAllowedError") { setAudioBlocked(true); if (mediaReady.current) beginClock(); }
    });
  }, [beginClock, clearWaiting]);
  const startWhenReady = useCallback(() => {
    if (!ready.current || !mediaReady.current || clockStarted.current) return;
    beginClock();
    playSound();
  }, [beginClock, playSound]);
  const finish = useCallback((seen = true) => {
    clearWaiting(); video.current?.pause();
    if (seen) markIntroSeen();
    if (ready.current) send({ type: "algolab:land", target: target() });
    setActive(false);
  }, [clearWaiting, send, target]);
  const robotContext = useMemo(() => ({ live, loading: initializing || (active && !live), send }), [active, initializing, live, send]);

  useEffect(() => {
    let state;
    try { state = readIntroState(window.localStorage); }
    catch { state = { preference: "once" as const, seen: true }; }
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const show = shouldShowIntro({ ...state, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches, saveData: connection?.saveData, preview: new URLSearchParams(location.search).get("intro") === "preview" });
    const frame = requestAnimationFrame(() => { setActive(show); setInitializing(false); });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function message(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== scene.current?.contentWindow) return;
      if (event.data?.type === "algolab:ready" && active) {
        ready.current = true; setLive(true); clearWaiting();
        send({ type: "algolab:render", time: 0, target: measureTarget() });
        if (mediaReady.current) startWhenReady(); else playSound();
      }
      if (event.data?.type === "algolab:error") {
        ready.current = false; setLive(false); finish(false);
      }
      if (event.data?.type === "algolab:frame" && active) {
        anchors.current = event.data.anchors as LandingAnchors;
      }
    }
    window.addEventListener("message", message);
    return () => window.removeEventListener("message", message);
  }, [active, clearWaiting, finish, measureTarget, playSound, send, startWhenReady]);

  useEffect(() => {
    if (!live || active) return;
    let frame = 0;
    const updateTarget = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = content.current?.querySelector(".hero-stage")?.getBoundingClientRect();
        const layer = sceneLayer.current;
        if (rect && layer) layer.style.height = `${Math.ceil(Math.max(innerHeight, rect.bottom - layer.getBoundingClientRect().top + 48))}px`;
        send({ type: "algolab:target", target: measureTarget(), visible: Boolean(rect && rect.bottom > 0 && rect.top < innerHeight) });
      });
    };
    updateTarget();
    const observer = new ResizeObserver(updateTarget);
    if (content.current) observer.observe(content.current);
    const stage = content.current?.querySelector(".hero-stage");
    if (stage) observer.observe(stage);
    window.addEventListener("scroll", updateTarget, { passive: true, capture: true });
    window.addEventListener("resize", updateTarget);
    window.visualViewport?.addEventListener("resize", updateTarget);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", updateTarget, true); window.removeEventListener("resize", updateTarget); window.visualViewport?.removeEventListener("resize", updateTarget); };
  }, [active, live, measureTarget, send]);

  useEffect(() => {
    if (!active) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const contentElement = content.current;
    const bodyOverflow = document.body.style.overflow, htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden"; document.documentElement.style.overflow = "hidden";
    skip.current?.focus({ preventScroll: true });
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const reduceMotion = () => { if (motion.matches) finish(false); };
    let disposed = false;
    let warmIdle: number | undefined, warmTimer: number | undefined;
    const cancelWarmup = () => { if (warmIdle !== undefined) window.cancelIdleCallback(warmIdle); if (warmTimer !== undefined) window.clearTimeout(warmTimer); };
    function warmAssembly() {
      cancelWarmup();
      const prepare = () => { if (!disposed && content.current && pieces.current) assembly.current ??= createLandingAssembly(content.current, pieces.current); };
      if (typeof window.requestIdleCallback === "function") warmIdle = window.requestIdleCallback(prepare, { timeout: 1500 });
      else warmTimer = window.setTimeout(prepare, 120);
    }
    function resize() { assembly.current?.dispose(); assembly.current = null; measureTarget(); lastSent.current = -1; warmAssembly(); }
    measureTarget(); warmAssembly();
    const layoutObserver = new ResizeObserver(resize);
    const hero = content.current?.querySelector(".hero-stage");
    if (hero) layoutObserver.observe(hero);
    void document.fonts.ready.then(() => { if (!disposed) resize(); });
    function visibility() {
      clearWaiting();
      lastTick.current = null;
      if (document.hidden) video.current?.pause();
      else playSound();
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
    const loadDeadline = setTimeout(() => { if (!clockStarted.current) finish(false); }, 20000);
    let frame = 0;
    function update(now: number) {
      if (lastTick.current === null) lastTick.current = now;
      if (clockStarted.current && !userPaused.current && !document.hidden) {
        const audio = video.current;
        // Once playing, audio is the master clock: slow frames or buffering cannot desync the film.
        if (audio && !audio.paused) timeline.current = Math.min(20, audio.currentTime);
        else timeline.current += (now - lastTick.current) / 1000;
      }
      lastTick.current = now;
      const time = Math.min(20, timeline.current);
      if (time >= 20 && ready.current) { finish(); return; }
      if (progress.current) progress.current.style.transform = `scaleX(${Math.min(1, time / 20)})`;
      if (time >= 17.2 && content.current && pieces.current) {
        assembly.current ??= createLandingAssembly(content.current, pieces.current);
        assembly.current.update(time, anchors.current);
      }
      if (ready.current && (Math.abs(time - lastSent.current) >= 1 / 30 || lastSent.current < 0)) {
        lastSent.current = time;
        send({ type: "algolab:render", time, target: target() });
      }
      frame = requestAnimationFrame(update);
    }
    frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame); clearTimeout(loadDeadline); clearWaiting();
      disposed = true; cancelWarmup(); layoutObserver.disconnect();
      assembly.current?.dispose(); assembly.current = null;
      window.removeEventListener("resize", resize); motion.removeEventListener("change", reduceMotion);
      document.removeEventListener("visibilitychange", visibility); document.removeEventListener("keydown", keyboard);
      document.body.style.overflow = bodyOverflow; document.documentElement.style.overflow = htmlOverflow;
      if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus({ preventScroll: true });
      else { const title = contentElement?.querySelector("h1"); if (title) { title.setAttribute("tabindex", "-1"); title.focus({ preventScroll: true }); title.removeAttribute("tabindex"); } }
    };
  }, [active, clearWaiting, finish, measureTarget, playSound, send, target]);

  function waitForMedia() {
    clearWaiting();
    if (!ready.current || userPaused.current || document.hidden) return;
    waiting.current = setTimeout(() => finish(false), 8000);
  }
  function togglePlayback() {
    const element = video.current; if (!element) return;
    userPaused.current = !userPaused.current;
    setPaused(userPaused.current);
    lastTick.current = null;
    if (userPaused.current) { element.pause(); clearWaiting(); }
    else playSound();
  }
  function toggleSound() {
    const element = video.current; if (!element) return;
    const nextMuted = !muted && !audioBlocked;
    element.muted = nextMuted;
    setMuted(nextMuted);
    setAudioBlocked(false);
    if (!userPaused.current) playSound();
  }

  return <LandingRobotContext.Provider value={robotContext}>
    <div className={styles.experience} data-intro-active={active || undefined} data-live-robot={live || undefined} ref={shell}>
      <div className={styles.content} inert={active || undefined} ref={content}>{children}</div>
      {active || live ? <div className={styles.sceneLayer} data-playing={active || undefined} ref={sceneLayer}>
        {active && !live ? <div aria-hidden className={styles.backdrop} /> : null}
        <iframe aria-hidden className={styles.scene} ref={scene} src="/intro-scene/index.html?site=1" tabIndex={-1} title="Escena continua y personaje 3D de AlgoLab" />
        {active ? <>
          <div aria-hidden className={styles.assembly} data-intro-assembly inert ref={pieces} />
          <div aria-describedby="intro-description" aria-label="Bienvenida a AlgoLab" aria-modal="true" className={styles.overlay} ref={dialog} role="dialog">
            <p className="sr-only" id="intro-description">Animación de 20 segundos con sonido. El robot transforma objetos en un cuarto de realidad mixta y permanece en la página de inicio. Puedes pausarla, silenciar el sonido u omitirla.</p>
            <audio aria-hidden autoPlay={live && !paused} className={styles.clock} data-intro-soundtrack muted={muted}
              onSeeked={() => { if (video.current) timeline.current = Math.min(20, video.current.currentTime); lastTick.current = null; lastSent.current = -1; }}
              onCanPlay={() => { clearWaiting(); mediaReady.current = Boolean(video.current && video.current.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA); if (clockStarted.current) playSound(); else startWhenReady(); }}
              onCanPlayThrough={() => { mediaReady.current = true; clearWaiting(); startWhenReady(); }}
              onEnded={() => finish()} onError={() => finish(false)}
              onLoadedMetadata={() => { if (video.current) video.current.volume = .65; }}
              onLoadStart={waitForMedia} onWaiting={waitForMedia}
              onPlaying={() => { clearWaiting(); beginClock(); setAudioBlocked(false); }}
              preload="auto" ref={video} src="/media/intro/algolab-soundtrack.mp3" />
            {!live || preparing ? <p className={styles.loading} role="status">Preparando el cuarto y el sonido…</p> : null}
            {audioBlocked && !muted ? <p className={styles.audioNotice} role="status">Toca «Activar sonido» para escuchar la animación.</p> : null}
            <div className={styles.controls}>
              <button aria-label={paused ? "Reproducir animación" : "Pausar animación"} onClick={togglePlayback} type="button">
                {paused ? <Play aria-hidden size={18} /> : <Pause aria-hidden size={18} />}<span>{paused ? "Reproducir" : "Pausar"}</span>
              </button>
              <button aria-label={muted || audioBlocked ? "Activar sonido" : "Silenciar sonido"} aria-pressed={!muted && !audioBlocked} onClick={toggleSound} type="button">
                {muted || audioBlocked ? <VolumeX aria-hidden size={18} /> : <Volume2 aria-hidden size={18} />}<span>{audioBlocked ? "Activar sonido" : muted ? "Sonido" : "Silenciar"}</span>
              </button>
              <button className={styles.skip} onClick={() => finish()} ref={skip} type="button">Omitir <ArrowRight aria-hidden size={18} /></button>
            </div>
            <div aria-hidden className={styles.progress}><span ref={progress} /></div>
          </div>
        </> : null}
      </div> : null}
    </div>
  </LandingRobotContext.Provider>;
}
