"use client";

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bounds, ContactShadows, OrbitControls, useBounds, useGLTF } from "@react-three/drei";
import { Box3, Color, Group, Mesh, MeshStandardMaterial, Vector3, type BufferGeometry, type Material, type Object3D } from "three";

/**
 * Robot de AlgoLab (modelo GLB exportado desde Unity) con reacciones.
 * El GLB no trae esqueleto: cada extremidad es una malla independiente. Para
 * animarla sin separarla del cuerpo se crea un pivote en la articulación
 * (hombro, cuello, cadera) y solo se aplican rotaciones moderadas.
 */
export type RobotReaction = "wave" | "attention" | "charge" | "cool" | "celebrate" | "shutdown";
export type RobotSignal = { kind: RobotReaction; id: number };
export type RobotPose =
  | "stand" | "sit" | "held" | "fall" | "walk" | "jump" | "climb" | "pull" | "dance" | "look" | "stretch"
  | "tumble" | "bonk" | "dizzy" | "getup" | "tiptoe" | "run" | "drive" | "carry" | "push" | "peek" | "bow" | "wave" | "juggle" | "sleep" | "haunted";
type StageMode = "checking" | "loading" | "ready" | "fallback";

type Props = {
  /** Cada cambio de `id` reproduce la reacción indicada. */
  signal?: RobotSignal | null;
  /** "hero": más presente (saludo inicial, seguimiento del puntero). "quiet": discreto. */
  presence?: "hero" | "quiet";
  /** Permite girar el robot arrastrando. */
  draggable?: boolean;
  /** Postura del acompañante; el desplazamiento por la página pertenece al contenedor. */
  pose?: RobotPose;
  facing?: -1 | 1;
  className?: string;
  label?: string;
};

const MODEL_URL = "/models/algolab-robot.glb";
const ACTION = new Color("#38d6a2");
const INFO = new Color("#29c3e7");
const BLACK = new Color("#000000");
const HAUNTED_TURN_SECONDS = 0.7;
const HAUNTED_FRONT_HOLD_SECONDS = 0.1;
type TurnReporter = (phase: "turning" | "settled", yaw: number) => void;

const smoothStep = (value: number) => {
  const t = Math.max(0, Math.min(value, 1));
  return t * t * (3 - 2 * t);
};

/* ---------------- Alternativa ligera (SVG) ---------------- */

function RobotPoster({ visible, reaction, reactionId, pose, facing, animated, hauntedFallback, reduceMotion, onTurn }: {
  visible: boolean;
  reaction?: RobotReaction;
  reactionId?: number;
  pose: RobotPose;
  facing: -1 | 1;
  animated: boolean;
  hauntedFallback: boolean;
  reduceMotion: boolean;
  onTurn: TurnReporter;
}) {
  const poster = useRef<HTMLDivElement>(null);
  const turnElapsed = useRef(0);
  const gradientId = useId().replace(/:/g, "");
  useEffect(() => {
    const host = poster.current;
    if (!host || pose === "stand" || pose === "haunted") return;
    const body = host.querySelector<SVGGElement>(".rp-body");
    const head = host.querySelector<SVGGElement>(".rp-head");
    const armL = host.querySelector<SVGGElement>(".rp-arm-l");
    const armR = host.querySelector<SVGGElement>(".rp-arm-r");
    const legL = host.querySelector<SVGGElement>(".rp-leg-l");
    const legR = host.querySelector<SVGGElement>(".rp-leg-r");
    let frame = 0;
    let elapsed = 0;
    let previous: number | null = null;
    const paint = (now: number) => {
      if (previous !== null) elapsed += Math.min((now - previous) / 1000, 0.05);
      previous = now;
      const value = posture(pose, animated ? elapsed : 0, facing, animated ? 1 : 0);
      const degrees = 180 / Math.PI;
      if (body) body.style.transform = `translateY(${-value.lift * 60}px) rotate(${-value.bodyRoll * degrees}deg) scaleY(${1 - Math.abs(value.bodyPitch) * 0.22})`;
      if (head) head.style.transform = `rotate(${-value.headRoll * degrees}deg) translate(${value.headYaw * 7}px, ${value.headPitch * 14}px) scaleY(${1 - Math.abs(value.headPitch) * 0.35})`;
      if (armL) armL.style.transform = `rotate(${-value.armL * degrees - value.armPitchL * 30}deg)`;
      if (armR) armR.style.transform = `rotate(${-value.armR * degrees + value.armPitchR * 30}deg)`;
      if (legL) legL.style.transform = `rotate(${value.legL * 27 + value.legRollL * degrees}deg)`;
      if (legR) legR.style.transform = `rotate(${-value.legR * 27 + value.legRollR * degrees}deg)`;
      if (animated && visible) frame = window.requestAnimationFrame(paint);
    };
    paint(0);
    return () => {
      window.cancelAnimationFrame(frame);
      for (const part of [body, head, armL, armR, legL, legR]) part?.style.removeProperty("transform");
    };
  }, [pose, facing, animated, visible, reactionId]);
  useEffect(() => {
    const host = poster.current;
    if (!host) return;
    if (pose !== "haunted") {
      turnElapsed.current = 0;
      return;
    }
    // Keep the loading poster facing forwards: the GLB performs its own visible
    // entrance once ready. Only the permanent SVG fallback turns here.
    if (!hauntedFallback && !reduceMotion) return;
    const body = host.querySelector<SVGGElement>(".rp-body");
    const front = host.querySelectorAll<SVGGElement>(".rp-front");
    const back = host.querySelectorAll<SVGGElement>(".rp-back");
    let frame = 0;
    let previous: number | null = null;
    const paint = (now: number) => {
      if (previous !== null) turnElapsed.current += Math.min((now - previous) / 1000, 0.05);
      previous = now;
      const elapsed = reduceMotion ? HAUNTED_TURN_SECONDS : turnElapsed.current;
      const progress = smoothStep((elapsed - HAUNTED_FRONT_HOLD_SECONDS) / (HAUNTED_TURN_SECONDS - HAUNTED_FRONT_HOLD_SECONDS));
      const yaw = Math.PI * progress;
      // Compress through a narrow side profile, changing visible details only
      // when the front has turned away; no mirrored face or second robot.
      if (body) body.style.transform = `scaleX(${0.16 + 0.84 * Math.abs(Math.cos(yaw))})`;
      for (const face of front) face.style.opacity = yaw < Math.PI / 2 ? "1" : "0";
      for (const face of back) face.style.opacity = yaw >= Math.PI / 2 ? "1" : "0";
      if (hauntedFallback) onTurn(progress < 1 ? "turning" : "settled", yaw);
      if (progress < 1 && animated && visible) frame = window.requestAnimationFrame(paint);
    };
    paint(performance.now());
    return () => {
      window.cancelAnimationFrame(frame);
      body?.style.removeProperty("transform");
      for (const face of front) face.style.opacity = "1";
      for (const face of back) face.style.opacity = "0";
    };
  }, [pose, hauntedFallback, reduceMotion, animated, visible, onTurn]);
  const still = { animation: "none" };
  const playback = { animationPlayState: animated && pose !== "haunted" ? "running" as const : "paused" as const };
  const limbStyle = pose === "stand" ? playback : still;
  const seated = pose === "sit" || pose === "sleep" || pose === "drive";
  const handsForward = pose === "drive" || pose === "carry" || pose === "push" || pose === "juggle";
  const backView = pose === "haunted" && reduceMotion;
  return (
    <div
      aria-hidden="true"
      className={`robot-poster${visible ? " is-visible" : ""}`}
      data-reaction={reaction ?? "idle"}
      data-pose={pose}
      data-reaction-id={reactionId}
      key={reactionId}
      ref={poster}
      style={pose === "haunted" ? { transition: reduceMotion ? "none" : "opacity 100ms ease" } : undefined}
    >
      <svg viewBox="0 0 360 500" role="presentation">
        <defs>
          <linearGradient id={`${gradientId}-body`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#b6efff" />
            <stop offset="1" stopColor="#5fbfd9" />
          </linearGradient>
          <radialGradient id={`${gradientId}-glow`}>
            <stop offset="0" stopColor="#38d6a2" stopOpacity=".35" />
            <stop offset="1" stopColor="#38d6a2" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse className="rp-shadow" cx="180" cy="474" fill="#000" opacity=".35" rx="110" ry="14" />
        <g className="rp-body" style={limbStyle}>
          <ellipse className="rp-aura" cx="180" cy="260" fill={`url(#${gradientId}-glow)`} rx="170" ry="210" style={playback} />
          {/* Piernas */}
          <g className="rp-leg rp-leg-l" style={{ transformOrigin: "140px 388px" }}>
            <circle cx="140" cy="388" fill="#e9d84d" r="21" />
            <path d={seated ? "M140 399l-22 14v31" : "M140 404v46"} stroke="#dceceb" strokeLinecap="round" strokeWidth="22" />
            <path d={seated ? "M98 451h40" : "M118 458h44"} stroke="#eef5f3" strokeLinecap="round" strokeWidth="20" />
          </g>
          <g className="rp-leg rp-leg-r" style={{ transformOrigin: "220px 388px" }}>
            <circle cx="220" cy="388" fill="#e9d84d" r="21" />
            <path d={seated ? "M220 399l22 14v31" : "M220 404v46"} stroke="#dceceb" strokeLinecap="round" strokeWidth="22" />
            <path d={seated ? "M222 451h40" : "M198 458h44"} stroke="#eef5f3" strokeLinecap="round" strokeWidth="20" />
          </g>
          {/* Brazos con pivote en el hombro */}
          <g className="rp-arm rp-arm-l" style={limbStyle}>
            <circle cx="88" cy="232" fill="#f2d84f" r="21" />
            <path d={handsForward ? "M84 248v44l43 -13" : "M84 248v96"} stroke="#dbe9e8" strokeLinecap="round" strokeWidth="21" />
            <path d={handsForward ? "M127 279l12 -4" : "M84 340v18"} stroke="#f3f7f6" strokeLinecap="round" strokeWidth="27" />
          </g>
          <g className="rp-arm rp-arm-r" style={limbStyle}>
            <circle cx="272" cy="232" fill="#f2d84f" r="21" />
            <path d={handsForward ? "M276 248v44l-43 -13" : "M276 248v96"} stroke="#dbe9e8" strokeLinecap="round" strokeWidth="21" />
            <path d={handsForward ? "M233 279l-12 -4" : "M276 340v18"} stroke="#f3f7f6" strokeLinecap="round" strokeWidth="27" />
          </g>
          {/* Torso */}
          <rect fill={`url(#${gradientId}-body)`} height="178" rx="26" stroke="#dbfbff" strokeOpacity=".55" strokeWidth="4" width="152" x="104" y="200" />
          <g className="rp-back" style={{ opacity: backView ? 1 : 0 }}>
            <rect fill="#459fb8" height="114" rx="10" stroke="#c7eff2" strokeOpacity=".55" strokeWidth="3" width="102" x="129" y="231" />
            <path d="M151 258h58m-58 16h58m-58 16h58" stroke="#286678" strokeLinecap="round" strokeWidth="6" />
            <circle cx="143" cy="331" fill="#dceceb" r="3" />
            <circle cx="217" cy="331" fill="#dceceb" r="3" />
          </g>
          <g className="rp-front" style={{ opacity: backView ? 0 : 1 }}>
            <circle cx="138" cy="232" fill="#111a1a" r="12" stroke="#d4e5e3" strokeWidth="4" />
            <circle className="rp-core" cx="180" cy="232" fill="#f1bb39" r="12" stroke="#ffe196" strokeWidth="4" />
            <circle cx="222" cy="232" fill="#111a1a" r="12" stroke="#d4e5e3" strokeWidth="4" />
            <rect fill="#19363a" height="84" rx="12" stroke="#6ee9cd" strokeOpacity=".5" strokeWidth="4" width="92" x="134" y="264" />
            <g className="rp-meter" style={playback}>
              <path d="M150 288h60" stroke="#61e7ba" strokeLinecap="round" strokeWidth="7" />
              <path d="M150 306h42" stroke="#61e7ba" strokeLinecap="round" strokeWidth="7" />
              <path d="M150 324h50" stroke="#61e7ba" strokeLinecap="round" strokeWidth="7" />
            </g>
          </g>
          {/* Cabeza con pivote en el cuello */}
          <g className="rp-head" style={limbStyle}>
            <path d="M180 58V30" stroke="#ccebf0" strokeLinecap="round" strokeWidth="8" />
            <circle className="rp-antenna" cx="180" cy="24" fill="#edf8f7" r="12" />
            <rect fill={`url(#${gradientId}-body)`} height="128" rx="24" stroke="#dbfbff" strokeOpacity=".58" strokeWidth="4" width="166" x="97" y="58" />
            <g className="rp-back" style={{ opacity: backView ? 1 : 0 }}>
              <rect fill="#459fb8" height="62" rx="8" stroke="#c7eff2" strokeOpacity=".45" strokeWidth="3" width="102" x="129" y="92" />
            </g>
            <g className="rp-front" style={{ opacity: backView ? 0 : 1 }}>
              <g className="rp-eyes" style={pose === "sleep" ? { animation: "none", transform: "scaleY(0.14)" } : playback}>
                <circle cx="141" cy="108" fill="#f7df64" r="19" stroke="#fff3b0" strokeWidth="5" />
                <circle cx="219" cy="108" fill="#f7df64" r="19" stroke="#fff3b0" strokeWidth="5" />
              </g>
              <rect fill="#eef9f8" height="20" rx="6" stroke="#cce6e7" strokeWidth="4" width="84" x="138" y="146" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

/* ---------------- Recuperación ante errores ---------------- */

class WebGLErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/* ---------------- Modelo animado ---------------- */

type Rig = {
  root: Group;
  armL?: Group;
  armR?: Group;
  head?: Group;
  legL?: Group;
  legR?: Group;
  materials: MeshStandardMaterial[];
  ownedMaterials: Material[];
  knees: { left?: Knee; right?: Knee };
  neutralBounds: Box3;
};

type Knee = {
  geometry: BufferGeometry;
  positions: Float32Array;
  normals: Float32Array;
  y: number;
  z: number;
  angle: number;
};

/** La pierna original es una sola malla: solo esta copia local se flexiona. */
function createKnee(part: Object3D | undefined): Knee | undefined {
  if (!(part instanceof Mesh)) return;
  const geometry = part.geometry.clone();
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  part.geometry = geometry;
  return {
    geometry,
    positions: new Float32Array(geometry.attributes.position.array),
    normals: new Float32Array(geometry.attributes.normal.array),
    y: box.min.y + (box.max.y - box.min.y) * 0.32,
    z: (box.min.z + box.max.z) * 0.5,
    angle: 0,
  };
}

function bendKnee(knee: Knee | undefined, target: number, smoothing: number) {
  if (!knee) return;
  const angle = knee.angle + (target - knee.angle) * smoothing;
  if (Math.abs(angle - knee.angle) < 0.00001 && Math.abs(target - angle) < 0.00001) return;
  knee.angle = angle;
  const position = knee.geometry.attributes.position;
  const normal = knee.geometry.attributes.normal;
  for (let index = 0; index < position.count; index++) {
    const offset = index * 3;
    const y = knee.positions[offset + 1];
    const weight = Math.min(1, Math.max(0, (knee.y + 0.04 - y) / 0.08));
    const rotation = angle * weight;
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    const dy = y - knee.y;
    const dz = knee.positions[offset + 2] - knee.z;
    position.setXYZ(index, knee.positions[offset], knee.y + dy * c - dz * s, knee.z + dy * s + dz * c);
    const ny = knee.normals[offset + 1];
    const nz = knee.normals[offset + 2];
    normal.setXYZ(index, knee.normals[offset], ny * c - nz * s, ny * s + nz * c);
  }
  position.needsUpdate = true;
  normal.needsUpdate = true;
  // El volumen de recorte debe incluir la rodilla flexionada.
  knee.geometry.computeBoundingSphere();
}

function posture(pose: RobotPose, t: number, facing: -1 | 1, motion: number) {
  const cycle = Math.sin(t * 8) * motion;
  const value = {
    lift: 0, bodyYaw: 0, bodyPitch: 0, bodyRoll: 0,
    armL: 0, armR: 0, armPitchL: 0, armPitchR: 0,
    legL: 0, legR: 0, legRollL: 0, legRollR: 0, kneeL: 0, kneeR: 0,
    headYaw: 0, headPitch: 0, headRoll: 0,
  };
  if (pose === "haunted") {
    // Inmóvil, erguido y de espaldas: sin balanceo ni reacción a la mirada.
    value.bodyYaw = Math.PI;
  } else if (pose === "sit" || pose === "drive" || pose === "sleep") {
    value.legL = -1.5 + Math.sin(t * 2) * 0.035 * motion;
    value.legR = -1.5 - Math.sin(t * 2) * 0.035 * motion;
    value.kneeL = value.kneeR = 1.54;
    value.legRollL = 0.12;
    value.legRollR = -0.12;
    // Un ligero tres cuartos permite ver el muslo horizontal y la rodilla.
    value.bodyYaw = -0.48;
    value.armPitchL = value.armPitchR = -0.22;
    value.armL = 0.07;
    value.armR = -0.07;
    value.headYaw = 0.24 + Math.sin(t * 0.55) * 0.13 * motion;
    if (pose === "drive") {
      const steering = Math.sin(t * 2.8) * 0.12 * motion;
      value.bodyYaw = facing * 0.58;
      value.armPitchL = -1.05 + steering;
      value.armPitchR = -1.05 - steering;
      value.armL = 0.2 + steering;
      value.armR = -0.2 + steering;
      value.headYaw = -facing * 0.1;
      value.headPitch = -0.06;
      value.lift = Math.sin(t * 11) * 0.015 * motion;
    } else if (pose === "sleep") {
      value.legL = value.legR = -1.5;
      value.armPitchL = value.armPitchR = 0.04;
      value.armL = 0.04;
      value.armR = -0.04;
      value.headPitch = 0.42 + Math.sin(t * 1.1) * 0.035 * motion;
      value.headRoll = -0.14;
      value.headYaw = 0.1;
      value.bodyPitch = 0.05;
      value.lift = Math.sin(t * 1.1) * 0.018 * motion;
    }
  } else if (pose === "look") {
    value.bodyYaw = facing * 0.22;
    value.headYaw = Math.sin(t * 1.4) * 0.65 * motion;
    value.headRoll = Math.sin(t * 1.7) * 0.1 * motion;
    value.headPitch = 0.06 + Math.sin(t * 0.8) * 0.09 * motion;
    value.armL = 0.05;
    value.armR = -0.05;
    value.armPitchL = value.armPitchR = -0.05;
  } else if (pose === "held" || pose === "fall") {
    value.armL = pose === "fall" ? 2.25 : 0.72;
    value.armR = -value.armL;
    value.legL = cycle * 0.22;
    value.legR = -cycle * 0.22;
    value.legRollL = 0.18;
    value.legRollR = -0.18;
    value.kneeL = value.kneeR = 0.16;
    value.bodyRoll = Math.sin(t * 5) * 0.06 * motion;
    value.headPitch = -0.12;
  } else if (pose === "walk" || pose === "pull") {
    value.bodyYaw = facing * (pose === "pull" ? -0.65 : 0.85);
    value.legL = cycle * 0.55;
    value.legR = -cycle * 0.55;
    value.kneeL = Math.max(0, cycle) * 0.5;
    value.kneeR = Math.max(0, -cycle) * 0.5;
    value.armPitchL = pose === "pull" ? -1.15 : -cycle * 0.45;
    value.armPitchR = pose === "pull" ? -1.15 : cycle * 0.45;
    value.bodyPitch = pose === "pull" ? -0.14 : 0.08;
    value.lift = Math.abs(cycle) * 0.04;
    value.headYaw = pose === "pull" ? facing * 0.3 : 0;
  } else if (pose === "jump") {
    value.armL = 2.4;
    value.armR = -2.4;
    value.legL = value.legR = -0.48;
    value.kneeL = value.kneeR = 0.85;
    value.headPitch = -0.18;
  } else if (pose === "climb") {
    value.armL = 2.55 + cycle * 0.28;
    value.armR = -2.55 + cycle * 0.28;
    value.armPitchL = value.armPitchR = -0.2;
    value.legL = -0.35 - cycle * 0.3;
    value.legR = -0.35 + cycle * 0.3;
    value.kneeL = 0.45 + Math.max(0, cycle) * 0.6;
    value.kneeR = 0.45 + Math.max(0, -cycle) * 0.6;
    value.bodyRoll = cycle * 0.035;
    value.headPitch = -0.25;
  } else if (pose === "dance") {
    value.armL = 1.05 + cycle * 0.65;
    value.armR = -1.05 + cycle * 0.65;
    value.bodyRoll = cycle * 0.11;
    value.bodyYaw = Math.sin(t * 4) * 0.22 * motion;
    value.legL = Math.max(0, cycle) * -0.22;
    value.legR = Math.max(0, -cycle) * -0.22;
    value.kneeL = Math.max(0, cycle) * 0.4;
    value.kneeR = Math.max(0, -cycle) * 0.4;
    value.lift = Math.abs(cycle) * 0.1;
    value.headRoll = -cycle * 0.08;
  } else if (pose === "stretch") {
    value.armL = 2.7;
    value.armR = -2.7;
    value.bodyRoll = Math.sin(t * 1.6) * 0.12 * motion;
    value.headPitch = -0.13;
    value.legRollL = 0.08;
    value.legRollR = -0.08;
  } else if (pose === "tumble") {
    value.armL = 1.45 + cycle * 0.22;
    value.armR = -1.45 + cycle * 0.22;
    value.legL = -0.72;
    value.legR = -0.48;
    value.kneeL = 1.12;
    value.kneeR = 0.88;
    value.bodyRoll = facing * (0.2 + Math.sin(t * 9) * 0.18 * motion);
    value.bodyPitch = 0.14;
    value.headRoll = -facing * 0.17;
    value.headPitch = 0.12;
  } else if (pose === "bonk") {
    const recoil = Math.exp(-t * 4) * motion;
    value.lift = -0.22;
    value.legL = value.legR = -0.42;
    value.kneeL = value.kneeR = 0.88;
    value.armL = 1.8;
    value.armR = -1.8;
    value.armPitchL = value.armPitchR = -0.55;
    value.bodyPitch = 0.13;
    value.bodyRoll = facing * Math.sin(t * 21) * 0.12 * recoil;
    value.headPitch = 0.28;
    value.headRoll = -facing * 0.22 + Math.sin(t * 24) * 0.13 * recoil;
  } else if (pose === "dizzy") {
    value.armL = 0.4 + Math.sin(t * 3.2) * 0.18 * motion;
    value.armR = -0.65 + Math.cos(t * 3.2) * 0.18 * motion;
    value.bodyRoll = Math.sin(t * 3.2) * 0.09 * motion;
    value.bodyYaw = Math.sin(t * 2.6) * 0.18 * motion;
    value.headYaw = Math.sin(t * 5) * 0.35 * motion;
    value.headRoll = Math.cos(t * 5) * 0.2 * motion;
    value.headPitch = 0.12;
    value.kneeL = 0.22 + Math.max(0, cycle) * 0.1;
    value.kneeR = 0.22 + Math.max(0, -cycle) * 0.1;
  } else if (pose === "getup") {
    const recovering = motion ? 1 - ease(t / 1.1) : 0;
    value.lift = -0.26 * recovering;
    value.bodyPitch = 0.3 * recovering;
    value.bodyRoll = -facing * 0.13 * recovering;
    value.legL = -0.65 * recovering;
    value.legR = -0.32 * recovering;
    value.kneeL = 1.2 * recovering;
    value.kneeR = 0.88 * recovering;
    value.armL = 0.92 * recovering;
    value.armR = -0.55 * recovering;
    value.armPitchL = value.armPitchR = -0.7 * recovering;
    value.headPitch = 0.2 * recovering;
  } else if (pose === "tiptoe" || pose === "run") {
    const running = pose === "run";
    const step = Math.sin(t * (running ? 15 : 5)) * motion;
    value.bodyYaw = facing * 0.85;
    value.bodyPitch = running ? 0.17 : 0.09;
    value.legL = step * (running ? 0.85 : 0.3);
    value.legR = -value.legL;
    value.kneeL = (running ? 0.08 : 0.36) + Math.max(0, step) * (running ? 0.95 : 0.4);
    value.kneeR = (running ? 0.08 : 0.36) + Math.max(0, -step) * (running ? 0.95 : 0.4);
    value.armPitchL = running ? -step * 0.88 : -0.65 - step * 0.16;
    value.armPitchR = running ? step * 0.88 : -0.65 + step * 0.16;
    value.armL = running ? 0.12 : 0.3;
    value.armR = -value.armL;
    value.lift = running ? Math.abs(step) * 0.12 : 0.06 + Math.abs(step) * 0.025;
    value.headYaw = running ? 0 : -facing * 0.25;
    value.headPitch = running ? -0.09 : 0.08;
  } else if (pose === "carry" || pose === "push") {
    const pushing = pose === "push";
    value.bodyYaw = facing * (pushing ? 0.92 : 0.64);
    value.bodyPitch = pushing ? 0.22 : -0.05;
    value.legL = cycle * (pushing ? 0.32 : 0.42);
    value.legR = -value.legL;
    value.kneeL = Math.max(0, cycle) * 0.4;
    value.kneeR = Math.max(0, -cycle) * 0.4;
    value.armPitchL = value.armPitchR = pushing ? -1.35 : -1.12;
    value.armL = pushing ? 0.12 : 0.33;
    value.armR = -value.armL;
    value.headPitch = pushing ? 0.08 : -0.06;
    value.lift = Math.abs(cycle) * 0.025;
  } else if (pose === "peek") {
    value.bodyYaw = facing * 0.48;
    value.bodyRoll = -facing * 0.1;
    value.headYaw = facing * (0.45 + Math.sin(t * 2) * 0.13 * motion);
    value.headRoll = -facing * 0.16;
    value.armL = facing > 0 ? 0.82 : 0.1;
    value.armR = facing < 0 ? -0.82 : -0.1;
    value.armPitchL = value.armPitchR = -0.25;
    value.kneeL = value.kneeR = 0.12;
  } else if (pose === "bow") {
    const bow = motion ? bell(t / 1.4) : 1;
    value.bodyPitch = 0.35 * bow;
    value.headPitch = 0.34 * bow;
    value.armPitchL = value.armPitchR = 0.15 * bow;
    value.armL = 0.12;
    value.armR = -0.12;
    value.lift = -0.07 * bow;
  } else if (pose === "wave") {
    value.armL = 2.3 + Math.sin(t * 10) * 0.26 * motion;
    value.armR = -0.08;
    value.headRoll = -0.1;
    value.headYaw = 0.16;
  } else if (pose === "juggle") {
    const toss = Math.sin(t * 6) * motion;
    value.armPitchL = -1.12 + toss * 0.42;
    value.armPitchR = -1.12 - toss * 0.42;
    value.armL = 0.35 + toss * 0.2;
    value.armR = -0.35 + toss * 0.2;
    value.headPitch = -0.13 - Math.abs(toss) * 0.12;
    value.headYaw = toss * 0.16;
    value.kneeL = value.kneeR = 0.09;
    value.lift = Math.abs(toss) * 0.025;
  }
  return value;
}

function clave(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

/** Envuelve una malla en un grupo cuyo origen está en la articulación indicada. */
function pivotar(objeto: Object3D, ancla: "arriba" | "abajo"): Group {
  const caja = new Box3().setFromObject(objeto);
  const centro = caja.getCenter(new Vector3());
  const alto = caja.max.y - caja.min.y;
  const pivote = new Vector3(
    centro.x,
    ancla === "arriba" ? caja.max.y - alto * 0.12 : caja.min.y + alto * 0.04,
    centro.z,
  );
  const grupo = new Group();
  const parent = objeto.parent;
  if (!parent) return grupo;
  parent.updateWorldMatrix(true, false);
  grupo.position.copy(parent.worldToLocal(pivote));
  parent.add(grupo);
  grupo.updateWorldMatrix(true, false);
  // attach conserva la transformación global, incluso si el padre está escalado.
  grupo.attach(objeto);
  return grupo;
}

function construirRig(escena: Object3D): Rig {
  const root = new Group();
  const copia = escena.clone(true);
  root.add(copia);
  root.updateMatrixWorld(true);

  const materials: MeshStandardMaterial[] = [];
  const ownedMaterials: Material[] = [];
  copia.traverse((nodo) => {
    if (nodo instanceof Mesh) {
      const lista = Array.isArray(nodo.material) ? nodo.material : [nodo.material];
      const clonados = lista.map((material) => {
        const propio = material.clone();
        ownedMaterials.push(propio);
        if (propio instanceof MeshStandardMaterial) materials.push(propio);
        return propio;
      });
      nodo.material = Array.isArray(nodo.material) ? clonados : clonados[0];
    }
  });

  const partes = new Map<string, Object3D>();
  copia.traverse((nodo) => {
    const k = clave(nodo.name);
    const part = k.startsWith("brazol") ? "armL" : k.startsWith("brazor") ? "armR" : k.startsWith("cabeza") ? "head" : k.startsWith("piernal") ? "legL" : k.startsWith("piernar") ? "legR" : null;
    // traverse visita al padre antes que sus primitivas: conserva toda la extremidad.
    if (part && !partes.has(part)) partes.set(part, nodo);
  });

  const rig: Rig = {
    root, materials, ownedMaterials,
    knees: { left: createKnee(partes.get("legL")), right: createKnee(partes.get("legR")) },
    neutralBounds: new Box3().setFromObject(root),
  };
  const arm = (k: "armL" | "armR") => (partes.get(k) ? pivotar(partes.get(k)!, "arriba") : undefined);
  rig.armL = arm("armL");
  rig.armR = arm("armR");
  rig.legL = partes.get("legL") ? pivotar(partes.get("legL")!, "arriba") : undefined;
  rig.legR = partes.get("legR") ? pivotar(partes.get("legR")!, "arriba") : undefined;
  rig.head = partes.get("head") ? pivotar(partes.get("head")!, "abajo") : undefined;
  return rig;
}

const ease = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
const bell = (t: number) => Math.sin(Math.min(Math.max(t, 0), 1) * Math.PI);

function RobotModel({
  onReady,
  onTurn,
  signal,
  presence,
  reduceMotion,
  pose,
  facing,
}: {
  onReady: () => void;
  onTurn: TurnReporter;
  signal?: RobotSignal | null;
  presence: "hero" | "quiet";
  reduceMotion: boolean;
  pose: RobotPose;
  facing: -1 | 1;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const rig = useMemo(() => construirRig(scene), [scene]);
  // Three.js se anima mutando objetos en cada cuadro; se leen desde una ref
  // para no modificar valores que React considera inmutables.
  const rigRef = useRef<Rig | null>(null);
  const body = useRef<Group>(null);
  const reaction = useRef<{ kind: RobotReaction | "intro"; start: number } | null>(null);
  const lastSignal = useRef<number | null>(null);
  const shutdown = useRef(false);
  const clock = useRef(0);
  const postureClock = useRef({ pose, start: 0 });
  const poseInitialized = useRef(false);
  const hauntedTurn = useRef<{ elapsed: number; from: ReturnType<typeof posture> } | null>(null);
  const bounds = useBounds();
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  // Se calcula con la postura neutral, nunca con brazos levantados o piernas dobladas.
  // Cambiar de gesto no acerca ni aleja la cámara.
  useEffect(() => {
    bounds.refresh(rig.neutralBounds).reset().fit();
  }, [bounds, rig, width, height]);

  useEffect(() => () => {
    for (const material of rig.ownedMaterials) material.dispose();
    rig.knees.left?.geometry.dispose();
    rig.knees.right?.geometry.dispose();
    // Las texturas y las demás geometrías pertenecen a la caché compartida de useGLTF.
  }, [rig]);

  useEffect(() => {
    rigRef.current = rig;
    onReady();
    if (presence === "hero" && !reduceMotion) reaction.current = { kind: "intro", start: 0.35 };
  }, [rig, onReady, presence, reduceMotion]);

  useEffect(() => {
    if (!signal || signal.id === lastSignal.current) return;
    lastSignal.current = signal.id;
    shutdown.current = signal.kind === "shutdown" ? !shutdown.current : false;
    reaction.current = { kind: signal.kind, start: clock.current };
  }, [signal]);

  useFrame((state, delta) => {
    const g = rigRef.current;
    if (!g) return;
    clock.current += Math.min(delta, 0.05);
    const t = clock.current;
    if (postureClock.current.pose !== pose) postureClock.current = { pose, start: t };
    const r = reaction.current;
    const local = r ? t - r.start : 99;
    const frozen = pose === "haunted";
    const amp = reduceMotion || frozen ? 0 : 1;
    const quiet = presence === "quiet";

    // Postura base: respiración suave.
    let lift = Math.sin(t * 1.6) * 0.025 * amp * (quiet ? 0.5 : 1);
    let armL = Math.sin(t * 1.6) * 0.035 * amp;
    let armR = -Math.sin(t * 1.6) * 0.035 * amp;
    let headYaw = 0;
    let headPitch = Math.sin(t * 0.8) * 0.03 * amp;
    let headRoll = 0;
    let bodyYaw = 0;
    let shake = 0;
    let glow = 0;
    let glowColor = ACTION;
    const position = posture(pose, t - postureClock.current.start, facing, amp);
    if (frozen) {
      if (!hauntedTurn.current) {
        // Capture the displayed rig when entering from a normal animation. On
        // initial/lazy mount show the familiar seated pose before turning.
        const from = posture("sit", 0, facing, 0);
        if (poseInitialized.current && body.current) {
          from.lift = body.current.position.y;
          from.bodyYaw = body.current.rotation.y;
          from.bodyPitch = body.current.rotation.x;
          from.bodyRoll = body.current.rotation.z;
          from.armL = g.armL?.rotation.z ?? 0;
          from.armR = g.armR?.rotation.z ?? 0;
          from.armPitchL = g.armL?.rotation.x ?? 0;
          from.armPitchR = g.armR?.rotation.x ?? 0;
          from.legL = g.legL?.rotation.x ?? 0;
          from.legR = g.legR?.rotation.x ?? 0;
          from.legRollL = g.legL?.rotation.z ?? 0;
          from.legRollR = g.legR?.rotation.z ?? 0;
          from.kneeL = g.knees.left?.angle ?? 0;
          from.kneeR = g.knees.right?.angle ?? 0;
          from.headYaw = g.head?.rotation.y ?? 0;
          from.headPitch = g.head?.rotation.x ?? 0;
          from.headRoll = g.head?.rotation.z ?? 0;
        }
        hauntedTurn.current = { elapsed: 0, from };
        reaction.current = null;
      } else {
        hauntedTurn.current.elapsed += Math.min(delta, 0.05);
      }
      const turn = hauntedTurn.current;
      const elapsed = reduceMotion ? HAUNTED_TURN_SECONDS : turn.elapsed;
      const progress = smoothStep((elapsed - HAUNTED_FRONT_HOLD_SECONDS) / (HAUNTED_TURN_SECONDS - HAUNTED_FRONT_HOLD_SECONDS));
      const rise = smoothStep(elapsed / 0.35);
      for (const name of Object.keys(position) as (keyof typeof position)[]) {
        const blend = name === "bodyYaw" ? progress : rise;
        position[name] = turn.from[name] + (position[name] - turn.from[name]) * blend;
      }
      onTurn(progress < 1 ? "turning" : "settled", position.bodyYaw);
      // A haunted canvas is demand-driven: invalidate only during this finite
      // turn, then leave the back-facing robot completely still and idle.
      if (progress < 1) state.invalidate();
    } else {
      hauntedTurn.current = null;
    }
    lift += position.lift;
    armL += position.armL;
    armR += position.armR;
    headYaw += position.headYaw;
    headPitch += position.headPitch;
    headRoll += position.headRoll;
    bodyYaw += position.bodyYaw;

    // Atención: la cabeza sigue al puntero cuando está sobre el escenario.
    if (!quiet && amp && pose === "stand") {
      headYaw += state.pointer.x * 0.45;
      headPitch += -state.pointer.y * 0.16;
      bodyYaw += state.pointer.x * 0.12;
    }

    // Un saludo de formulario no debe duplicar brazos ni interrumpir una caída o siesta.
    if (r && (pose === "stand" || pose === "sit")) {
      const kind = r.kind;
      if (kind === "intro" || kind === "wave") {
        const dur = 2.1;
        const p = local / dur;
        const raise = ease(p * 3.2) * (1 - ease((p - 0.78) * 4.5));
        armL += raise * 2.35 * (amp || 0.4) + Math.sin(local * 11) * 0.28 * raise * amp;
        headRoll = -0.12 * raise * amp;
        headYaw += 0.15 * raise * amp;
        if (p > 1) reaction.current = null;
      } else if (kind === "attention") {
        const p = local / 0.9;
        headPitch -= 0.18 * bell(p) * (amp || 0.4);
        lift += 0.05 * bell(p) * amp;
        if (p > 1) reaction.current = null;
      } else if (kind === "charge") {
        const p = local / 1.4;
        glow = 0.55 * bell(p);
        lift += 0.12 * bell(p * 2) * amp;
        armL += 0.5 * bell(p) * amp;
        armR -= 0.5 * bell(p) * amp;
        if (p > 1) reaction.current = null;
      } else if (kind === "cool") {
        const p = local / 1.3;
        glow = 0.5 * bell(p);
        glowColor = INFO;
        shake = Math.sin(local * 48) * 0.02 * bell(p) * amp;
        headPitch += 0.08 * bell(p) * amp;
        if (p > 1) reaction.current = null;
      } else if (kind === "celebrate") {
        const p = local / 1.8;
        const hop = Math.abs(Math.sin(p * Math.PI * 2)) * (1 - ease((p - 0.6) * 2.5));
        lift += 0.28 * hop * amp;
        const up = ease(p * 4) * (1 - ease((p - 0.75) * 4));
        armL += 2.5 * up * (amp || 0.3);
        armR -= 2.5 * up * (amp || 0.3);
        glow = 0.25 * bell(p);
        if (p > 1) reaction.current = null;
      }
    }

    // Apagado: cabeza baja y brazos relajados mientras siga apagado.
    if (shutdown.current && !frozen) {
      headPitch = 0.32;
      headYaw *= 0.2;
      armL = 0.06;
      armR = -0.06;
      lift = -0.03;
    }

    const snap = reduceMotion || frozen || !poseInitialized.current;
    const lerp = (a: number, b: number, k = 0.18) =>
      snap ? b : a + (b - a) * (1 - Math.pow(1 - k, Math.min(delta, 0.05) * 60));
    if (body.current) {
      body.current.position.y = lerp(body.current.position.y, lift, 0.3);
      body.current.position.x = shake;
      body.current.rotation.y = lerp(body.current.rotation.y, bodyYaw, 0.08);
      body.current.rotation.x = lerp(body.current.rotation.x, position.bodyPitch);
      body.current.rotation.z = lerp(body.current.rotation.z, position.bodyRoll);
    }
    if (g.armL) {
      g.armL.rotation.z = lerp(g.armL.rotation.z, armL);
      g.armL.rotation.x = lerp(g.armL.rotation.x, position.armPitchL);
    }
    if (g.armR) {
      g.armR.rotation.z = lerp(g.armR.rotation.z, armR);
      g.armR.rotation.x = lerp(g.armR.rotation.x, position.armPitchR);
    }
    if (g.legL) {
      g.legL.rotation.x = lerp(g.legL.rotation.x, position.legL);
      g.legL.rotation.z = lerp(g.legL.rotation.z, position.legRollL);
    }
    if (g.legR) {
      g.legR.rotation.x = lerp(g.legR.rotation.x, position.legR);
      g.legR.rotation.z = lerp(g.legR.rotation.z, position.legRollR);
    }
    const kneeSmoothing = snap ? 1 : 1 - Math.pow(0.82, Math.min(delta, 0.05) * 60);
    bendKnee(g.knees.left, position.kneeL, kneeSmoothing);
    bendKnee(g.knees.right, position.kneeR, kneeSmoothing);
    if (g.head) {
      g.head.rotation.y = lerp(g.head.rotation.y, headYaw, 0.1);
      g.head.rotation.x = lerp(g.head.rotation.x, headPitch, 0.12);
      g.head.rotation.z = lerp(g.head.rotation.z, headRoll, 0.12);
    }
    const intensity = shutdown.current ? 0 : glow;
    for (const material of g.materials) {
      material.emissive.copy(intensity > 0.001 ? glowColor : BLACK);
      material.setValues({ emissiveIntensity: intensity });
    }
    poseInitialized.current = true;
  });

  return (
    <group ref={body} rotation={[0, -0.2, 0]} dispose={null}>
      <primitive object={rig.root} dispose={null} />
    </group>
  );
}

function StageContent({
  onReady,
  onTurn,
  signal,
  presence,
  draggable,
  reduceMotion,
  pose,
  facing,
}: {
  onReady: () => void;
  onTurn: TurnReporter;
  signal?: RobotSignal | null;
  presence: "hero" | "quiet";
  draggable: boolean;
  reduceMotion: boolean;
  pose: RobotPose;
  facing: -1 | 1;
}) {
  return (
    <>
      <ambientLight intensity={1.5} />
      <hemisphereLight color="#dffcf2" groundColor="#0b2a23" intensity={1.2} />
      <directionalLight color="#fff6e6" intensity={3.2} position={[3.5, 6, 5]} />
      <pointLight color="#38d6a2" intensity={14} position={[-3, 1.5, 2.5]} />
      <pointLight color="#29c3e7" intensity={10} position={[3, 0.5, -1.5]} />
      <Bounds margin={1.18} maxDuration={0}>
        <RobotModel facing={facing} onReady={onReady} onTurn={onTurn} pose={pose} presence={presence} reduceMotion={reduceMotion} signal={signal} />
      </Bounds>
      <ContactShadows blur={2.6} far={6} opacity={0.5} position={[0, -2.3, 0]} scale={7} />
      {draggable ? (
        <OrbitControls
          enableDamping
          enablePan={false}
          enableZoom={false}
          maxAzimuthAngle={Math.PI / 2.4}
          maxPolarAngle={Math.PI / 1.85}
          minAzimuthAngle={-Math.PI / 2.4}
          minPolarAngle={Math.PI / 3}
        />
      ) : null}
    </>
  );
}

/* ---------------- Escenario ---------------- */

export function RobotStage({ signal = null, presence = "hero", draggable = true, pose = "stand", facing = 1, className = "", label }: Props) {
  const [mode, setMode] = useState<StageMode>("checking");
  const [visible, setVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const hostRef = useRef<HTMLDivElement>(null);
  const reportTurn = useCallback<TurnReporter>((phase, yaw) => {
    if (!hostRef.current) return;
    hostRef.current.dataset.hauntedTurn = phase;
    hostRef.current.dataset.robotYaw = yaw.toFixed(4);
  }, []);
  const showFallback = useCallback(() => setMode("fallback"), []);
  const showModel = useCallback(() => setMode("ready"), []);
  const frozen = pose === "haunted";
  const canRotate = draggable && !frozen;
  const activeSignal = frozen ? null : signal;

  useEffect(() => {
    if (frozen || !hostRef.current) return;
    delete hostRef.current.dataset.hauntedTurn;
    delete hostRef.current.dataset.robotYaw;
  }, [frozen]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    update();
    updateVisibility();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", updateVisibility);

    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    let supportsWebGL = !connection?.saveData;
    try {
      const probe = document.createElement("canvas");
      const webgl = probe.getContext("webgl2") ?? probe.getContext("webgl");
      supportsWebGL = supportsWebGL && Boolean(webgl);
      webgl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      supportsWebGL = false;
    }
    const id = window.setTimeout(() => setMode(supportsWebGL ? "loading" : "fallback"), 0);
    return () => {
      window.clearTimeout(id);
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  // Si el modelo no llega a tiempo, se mantiene la vista ligera.
  useEffect(() => {
    if (mode !== "loading") return;
    const id = window.setTimeout(showFallback, 12000);
    return () => window.clearTimeout(id);
  }, [mode, showFallback]);

  // No se dibuja mientras el escenario está fuera de la pantalla.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "120px" });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const descripcion =
    label ??
    (mode === "ready"
      ? canRotate ? "Robot de AlgoLab en tres dimensiones. Puedes arrastrar para girarlo." : "Robot de AlgoLab en tres dimensiones."
      : "Robot de AlgoLab");

  return (
    <div
      aria-label={descripcion}
      className={`robot-stage robot-stage-${mode} robot-presence-${presence} ${className}`}
      data-pose={pose}
      data-facing={facing}
      ref={hostRef}
      role="img"
    >
      <RobotPoster animated={visible && documentVisible && !reduceMotion} facing={facing} hauntedFallback={mode === "fallback"} onTurn={reportTurn} pose={pose} reaction={activeSignal?.kind} reactionId={activeSignal?.id} reduceMotion={reduceMotion} visible={mode !== "ready"} />
      {mode === "loading" || mode === "ready" ? (
        <WebGLErrorBoundary onError={showFallback}>
          <Suspense fallback={null}>
            <Canvas
              camera={{ fov: 34, position: [0, 0.6, 7] }}
              dpr={[1, 1.6]}
              frameloop={!visible || !documentVisible ? "never" : reduceMotion || frozen ? "demand" : "always"}
              gl={{ alpha: true, antialias: true, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false }}
              onCreated={({ gl }) => {
                gl.setClearColor(0x000000, 0);
                gl.domElement.addEventListener("webglcontextlost", showFallback, { once: true });
              }}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                opacity: mode === "ready" ? 1 : 0,
                transition: reduceMotion ? "none" : frozen ? "opacity 100ms ease" : "opacity 420ms ease",
                touchAction: canRotate ? "pan-y" : "auto",
              }}
            >
              <StageContent
                draggable={canRotate}
                facing={facing}
                onReady={showModel}
                onTurn={reportTurn}
                pose={pose}
                presence={presence}
                reduceMotion={reduceMotion}
                signal={activeSignal}
              />
            </Canvas>
          </Suspense>
        </WebGLErrorBoundary>
      ) : null}
      {mode === "checking" || mode === "loading" ? (
        <span className="robot-stage-loading" role="status">
          Preparando el robot…
        </span>
      ) : null}
    </div>
  );
}
