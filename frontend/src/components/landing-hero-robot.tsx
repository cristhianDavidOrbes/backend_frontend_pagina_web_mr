"use client";
import dynamic from "next/dynamic";
import { useContext, useEffect, useRef, type PointerEvent } from "react";
import { LandingRobotContext } from "./landing-robot-context";
import type { RobotSignal } from "./robot-stage";
const RobotStage = dynamic(() => import("./robot-stage").then(module => module.RobotStage), { ssr: false, loading: () => <div className="robot-stage robot-stage-checking" /> });

export function LandingHeroRobot({ signal }: { signal: RobotSignal | null }) {
  const { live, send } = useContext(LandingRobotContext);
  const pointer = useRef<{ x: number; y: number; dragging: boolean } | null>(null);
  useEffect(() => { if (live && signal) send({ type: "algolab:signal", kind: signal.kind }); }, [live, signal, send]);
  useEffect(() => {
    if (!live) return;
    const reset = () => { pointer.current = null; send({ type: "algolab:pointer", active: false }); };
    const visibility = () => { if (document.hidden) reset(); };
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("blur", reset); document.removeEventListener("visibilitychange", visibility); };
  }, [live, send]);
  const resetLook = () => send({ type: "algolab:pointer", active: false });
  const followPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    send({ type: "algolab:pointer", active: true, x: (event.clientX - rect.left) / rect.width * 2 - 1, y: 1 - (event.clientY - rect.top) / rect.height * 2 });
  };
  const releasePointer = (event: PointerEvent<HTMLDivElement>) => {
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    resetLook();
  };
  if (!live) return <RobotStage presence="hero" signal={signal} />;
  return <div aria-label="Robot de AlgoLab. Sigue el puntero. Arrastra para girarlo; pulsa Enter para saludar." className="robot-stage" role="img" style={{ touchAction: "pan-y" }} tabIndex={0}
    onKeyDown={event => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); send({ type: "algolab:rotate", delta: event.key === "ArrowLeft" ? -.2 : .2 }); }
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); send({ type: "algolab:signal", kind: "wave" }); }
    }}
    onPointerEnter={followPointer}
    onPointerDown={event => { pointer.current = { x: event.clientX, y: event.clientY, dragging: false }; }}
    onPointerMove={event => {
      const previous = pointer.current; if (!previous) { followPointer(event); return; }
      const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
      const canDrag = event.pointerType !== "touch" || Math.abs(dx) > Math.abs(dy) * 1.2;
      if (!previous.dragging && Math.hypot(dx, dy) > 8 && canDrag) { previous.dragging = true; event.currentTarget.setPointerCapture(event.pointerId); resetLook(); }
      if (previous.dragging) { send({ type: "algolab:rotate", delta: dx * .012, pitch: dy * .008 }); previous.x = event.clientX; previous.y = event.clientY; }
      else followPointer(event);
    }}
    onPointerLeave={() => { if (!pointer.current?.dragging) { pointer.current = null; resetLook(); } }}
    onPointerUp={releasePointer}
    onPointerCancel={releasePointer}
    onLostPointerCapture={() => { pointer.current = null; resetLook(); }}
    onBlur={resetLook} />;
}
