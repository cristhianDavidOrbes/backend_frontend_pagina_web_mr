"use client";

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Box3, Color, Group, Mesh, MeshStandardMaterial, Vector3, type Object3D } from "three";

/**
 * Robot de AlgoLab (modelo GLB exportado desde Unity) con reacciones.
 * El GLB no trae esqueleto: cada extremidad es una malla independiente. Para
 * animarla sin separarla del cuerpo se crea un pivote en la articulación
 * (hombro, cuello, cadera) y solo se aplican rotaciones moderadas.
 */
export type RobotReaction = "wave" | "attention" | "charge" | "cool" | "celebrate" | "shutdown";
export type RobotSignal = { kind: RobotReaction; id: number };
type StageMode = "checking" | "loading" | "ready" | "fallback";

type Props = {
  /** Cada cambio de `id` reproduce la reacción indicada. */
  signal?: RobotSignal | null;
  /** "hero": más presente (saludo inicial, seguimiento del puntero). "quiet": discreto. */
  presence?: "hero" | "quiet";
  /** Permite girar el robot arrastrando. */
  draggable?: boolean;
  className?: string;
  label?: string;
};

const MODEL_URL = "/models/algolab-robot.glb";
const ACTION = new Color("#38d6a2");
const INFO = new Color("#29c3e7");
const BLACK = new Color("#000000");

/* ---------------- Alternativa ligera (SVG) ---------------- */

function RobotPoster({ visible, reaction, reactionId }: { visible: boolean; reaction?: RobotReaction; reactionId?: number }) {
  return (
    <div
      aria-hidden="true"
      className={`robot-poster${visible ? " is-visible" : ""}`}
      data-reaction={reaction ?? "idle"}
      key={reactionId}
    >
      <svg viewBox="0 0 360 500" role="presentation">
        <defs>
          <linearGradient id="rp-body" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#b6efff" />
            <stop offset="1" stopColor="#5fbfd9" />
          </linearGradient>
          <radialGradient id="rp-glow">
            <stop offset="0" stopColor="#38d6a2" stopOpacity=".35" />
            <stop offset="1" stopColor="#38d6a2" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse className="rp-shadow" cx="180" cy="474" fill="#000" opacity=".35" rx="110" ry="14" />
        <g className="rp-body">
          <ellipse className="rp-aura" cx="180" cy="260" fill="url(#rp-glow)" rx="170" ry="210" />
          {/* Piernas */}
          <g className="rp-leg rp-leg-l">
            <circle cx="140" cy="388" fill="#e9d84d" r="21" />
            <path d="M140 404v46" stroke="#dceceb" strokeLinecap="round" strokeWidth="22" />
            <path d="M118 458h44" stroke="#eef5f3" strokeLinecap="round" strokeWidth="20" />
          </g>
          <g className="rp-leg rp-leg-r">
            <circle cx="220" cy="388" fill="#e9d84d" r="21" />
            <path d="M220 404v46" stroke="#dceceb" strokeLinecap="round" strokeWidth="22" />
            <path d="M198 458h44" stroke="#eef5f3" strokeLinecap="round" strokeWidth="20" />
          </g>
          {/* Brazos con pivote en el hombro */}
          <g className="rp-arm rp-arm-l">
            <circle cx="88" cy="232" fill="#f2d84f" r="21" />
            <path d="M84 248v96" stroke="#dbe9e8" strokeLinecap="round" strokeWidth="21" />
            <path d="M84 340v18" stroke="#f3f7f6" strokeLinecap="round" strokeWidth="27" />
          </g>
          <g className="rp-arm rp-arm-r">
            <circle cx="272" cy="232" fill="#f2d84f" r="21" />
            <path d="M276 248v96" stroke="#dbe9e8" strokeLinecap="round" strokeWidth="21" />
            <path d="M276 340v18" stroke="#f3f7f6" strokeLinecap="round" strokeWidth="27" />
          </g>
          {/* Torso */}
          <rect fill="url(#rp-body)" height="178" rx="26" stroke="#dbfbff" strokeOpacity=".55" strokeWidth="4" width="152" x="104" y="200" />
          <circle cx="138" cy="232" fill="#111a1a" r="12" stroke="#d4e5e3" strokeWidth="4" />
          <circle className="rp-core" cx="180" cy="232" fill="#f1bb39" r="12" stroke="#ffe196" strokeWidth="4" />
          <circle cx="222" cy="232" fill="#111a1a" r="12" stroke="#d4e5e3" strokeWidth="4" />
          <rect fill="#19363a" height="84" rx="12" stroke="#6ee9cd" strokeOpacity=".5" strokeWidth="4" width="92" x="134" y="264" />
          <g className="rp-meter">
            <path d="M150 288h60" stroke="#61e7ba" strokeLinecap="round" strokeWidth="7" />
            <path d="M150 306h42" stroke="#61e7ba" strokeLinecap="round" strokeWidth="7" />
            <path d="M150 324h50" stroke="#61e7ba" strokeLinecap="round" strokeWidth="7" />
          </g>
          {/* Cabeza con pivote en el cuello */}
          <g className="rp-head">
            <path d="M180 58V30" stroke="#ccebf0" strokeLinecap="round" strokeWidth="8" />
            <circle className="rp-antenna" cx="180" cy="24" fill="#edf8f7" r="12" />
            <rect fill="url(#rp-body)" height="128" rx="24" stroke="#dbfbff" strokeOpacity=".58" strokeWidth="4" width="166" x="97" y="58" />
            <g className="rp-eyes">
              <circle cx="141" cy="108" fill="#f7df64" r="19" stroke="#fff3b0" strokeWidth="5" />
              <circle cx="219" cy="108" fill="#f7df64" r="19" stroke="#fff3b0" strokeWidth="5" />
            </g>
            <rect fill="#eef9f8" height="20" rx="6" stroke="#cce6e7" strokeWidth="4" width="84" x="138" y="146" />
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
};

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
  grupo.position.copy(pivote);
  objeto.parent?.add(grupo);
  objeto.position.sub(pivote);
  grupo.add(objeto);
  return grupo;
}

function construirRig(escena: Object3D): Rig {
  const root = new Group();
  const copia = escena.clone(true);
  root.add(copia);
  root.updateMatrixWorld(true);

  const materials: MeshStandardMaterial[] = [];
  copia.traverse((nodo) => {
    if (nodo instanceof Mesh) {
      const lista = Array.isArray(nodo.material) ? nodo.material : [nodo.material];
      const clonados = lista.map((material) => {
        const propio = material.clone();
        if (propio instanceof MeshStandardMaterial) materials.push(propio);
        return propio;
      });
      nodo.material = Array.isArray(nodo.material) ? clonados : clonados[0];
    }
  });

  const partes = new Map<string, Object3D>();
  copia.traverse((nodo) => {
    const k = clave(nodo.name);
    if (k.startsWith("brazol")) partes.set("armL", nodo);
    else if (k.startsWith("brazor")) partes.set("armR", nodo);
    else if (k.startsWith("cabeza")) partes.set("head", nodo);
    else if (k.startsWith("piernal")) partes.set("legL", nodo);
    else if (k.startsWith("piernar")) partes.set("legR", nodo);
  });

  const rig: Rig = { root, materials };
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
  signal,
  presence,
  reduceMotion,
}: {
  onReady: () => void;
  signal?: RobotSignal | null;
  presence: "hero" | "quiet";
  reduceMotion: boolean;
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
    const r = reaction.current;
    const local = r ? t - r.start : 99;
    const amp = reduceMotion ? 0 : 1;
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

    // Atención: la cabeza sigue al puntero cuando está sobre el escenario.
    if (!quiet && amp) {
      headYaw = state.pointer.x * 0.45;
      headPitch += -state.pointer.y * 0.16;
      bodyYaw = state.pointer.x * 0.12;
    }

    if (r) {
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
    if (shutdown.current) {
      headPitch = 0.32;
      headYaw *= 0.2;
      armL = 0.06;
      armR = -0.06;
      lift = -0.03;
    }

    const lerp = (a: number, b: number, k = 0.18) => a + (b - a) * k;
    if (body.current) {
      body.current.position.y = lerp(body.current.position.y, lift, 0.3);
      body.current.position.x = shake;
      body.current.rotation.y = lerp(body.current.rotation.y, bodyYaw, 0.08);
    }
    if (g.armL) g.armL.rotation.z = lerp(g.armL.rotation.z, armL);
    if (g.armR) g.armR.rotation.z = lerp(g.armR.rotation.z, armR);
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
  });

  return (
    <group ref={body} rotation={[0, -0.2, 0]}>
      <primitive object={rig.root} />
    </group>
  );
}

function StageContent({
  onReady,
  signal,
  presence,
  draggable,
  reduceMotion,
}: {
  onReady: () => void;
  signal?: RobotSignal | null;
  presence: "hero" | "quiet";
  draggable: boolean;
  reduceMotion: boolean;
}) {
  return (
    <>
      <ambientLight intensity={1.5} />
      <hemisphereLight color="#dffcf2" groundColor="#0b2a23" intensity={1.2} />
      <directionalLight color="#fff6e6" intensity={3.2} position={[3.5, 6, 5]} />
      <pointLight color="#38d6a2" intensity={14} position={[-3, 1.5, 2.5]} />
      <pointLight color="#29c3e7" intensity={10} position={[3, 0.5, -1.5]} />
      <Bounds fit margin={1.18}>
        <RobotModel onReady={onReady} presence={presence} reduceMotion={reduceMotion} signal={signal} />
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

export function RobotStage({ signal = null, presence = "hero", draggable = true, className = "", label }: Props) {
  const [mode, setMode] = useState<StageMode>("checking");
  const [visible, setVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const showFallback = useCallback(() => setMode("fallback"), []);
  const showModel = useCallback(() => setMode("ready"), []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);

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
      ? "Robot de AlgoLab en tres dimensiones. Puedes arrastrar para girarlo."
      : "Robot de AlgoLab");

  return (
    <div
      aria-label={descripcion}
      className={`robot-stage robot-stage-${mode} robot-presence-${presence} ${className}`}
      ref={hostRef}
      role="img"
    >
      <RobotPoster reaction={signal?.kind} reactionId={signal?.id} visible={mode !== "ready"} />
      {mode === "loading" || mode === "ready" ? (
        <WebGLErrorBoundary onError={showFallback}>
          <Suspense fallback={null}>
            <Canvas
              camera={{ fov: 34, position: [0, 0.6, 7] }}
              dpr={[1, 1.6]}
              frameloop={visible ? "always" : "never"}
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
                transition: "opacity 420ms ease",
                touchAction: draggable ? "pan-y" : "auto",
              }}
            >
              <StageContent
                draggable={draggable}
                onReady={showModel}
                presence={presence}
                reduceMotion={reduceMotion}
                signal={signal}
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
