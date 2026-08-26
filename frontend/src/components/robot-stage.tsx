"use client";

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, ContactShadows, OrbitControls, Sparkles, useGLTF } from "@react-three/drei";

type StageMode = "checking" | "loading" | "ready" | "fallback";

function RobotPoster({ visible = true }: { visible?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`robot-stage-poster${visible ? " is-visible" : ""}`}
    >
      <svg viewBox="0 0 360 520" role="presentation">
        <defs>
          <linearGradient id="robotBody" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#9be9ff" />
            <stop offset="1" stopColor="#4dbbd9" />
          </linearGradient>
          <radialGradient id="robotGlow">
            <stop offset="0" stopColor="#54efb5" stopOpacity=".32" />
            <stop offset="1" stopColor="#54efb5" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="180" cy="466" rx="154" ry="38" fill="url(#robotGlow)" />
        <ellipse cx="180" cy="466" rx="120" ry="17" fill="none" stroke="#47e6b0" strokeOpacity=".46" strokeWidth="2" />
        <path d="M180 54V26" stroke="#ccebf0" strokeWidth="9" strokeLinecap="round" />
        <circle cx="180" cy="20" r="13" fill="#edf8f7" />
        <rect x="95" y="54" width="170" height="134" rx="22" fill="url(#robotBody)" stroke="#dbfbff" strokeOpacity=".58" strokeWidth="4" />
        <circle cx="140" cy="105" r="20" fill="#f7df64" stroke="#fff3b0" strokeWidth="5" />
        <circle cx="220" cy="105" r="20" fill="#f7df64" stroke="#fff3b0" strokeWidth="5" />
        <rect x="136" y="145" width="88" height="21" rx="5" fill="#eef9f8" stroke="#cce6e7" strokeWidth="4" />
        <rect x="102" y="203" width="156" height="190" rx="25" fill="url(#robotBody)" stroke="#dbfbff" strokeOpacity=".52" strokeWidth="4" />
        <circle cx="136" cy="238" r="13" fill="#111a1a" stroke="#d4e5e3" strokeWidth="5" />
        <circle cx="180" cy="238" r="13" fill="#f1bb39" stroke="#ffe196" strokeWidth="5" />
        <circle cx="224" cy="238" r="13" fill="#111a1a" stroke="#d4e5e3" strokeWidth="5" />
        <rect x="132" y="273" width="96" height="91" rx="12" fill="#19363a" stroke="#6ee9cd" strokeOpacity=".52" strokeWidth="4" />
        <path d="M150 298h60M150 318h42M150 338h50" stroke="#61e7ba" strokeWidth="7" strokeLinecap="round" opacity=".72" />
        <circle cx="85" cy="237" r="22" fill="#f2d84f" />
        <circle cx="275" cy="237" r="22" fill="#f2d84f" />
        <path d="M79 252v105M281 252v105" stroke="#dbe9e8" strokeWidth="22" strokeLinecap="round" />
        <path d="M79 351v20M281 351v20" stroke="#f3f7f6" strokeWidth="28" strokeLinecap="round" />
        <circle cx="136" cy="403" r="23" fill="#e9d84d" />
        <circle cx="224" cy="403" r="23" fill="#e9d84d" />
        <path d="M136 424v48M224 424v48" stroke="#dceceb" strokeWidth="23" strokeLinecap="round" />
        <path d="M112 479h48M200 479h48" stroke="#e8f2f0" strokeWidth="22" strokeLinecap="round" />
      </svg>
      <span>Vista ligera del robot</span>
    </div>
  );
}

class WebGLErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
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
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function RobotModel({ onReady }: { onReady: () => void }) {
  const { scene } = useGLTF("/models/algolab-robot.glb");
  const model = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    onReady();
  }, [model, onReady]);

  return (
    <group rotation={[0, -0.35, 0]}>
      <primitive object={model} />
    </group>
  );
}

function StageContent({ onReady }: { onReady: () => void }) {
  return (
    <>
      <ambientLight intensity={2.0} />
      <directionalLight color="#d6fff2" intensity={3.6} position={[4, 6, 5]} />
      <pointLight color="#21dca0" intensity={20} position={[-3, 2, 2]} />
      <pointLight color="#178cff" intensity={14} position={[3, 0, -1]} />
      <Sparkles color="#5dffc4" count={32} opacity={0.5} scale={[5, 4.5, 3.5]} size={2} speed={0.4} />
      <Bounds fit margin={1.22}>
        <RobotModel onReady={onReady} />
      </Bounds>
      <ContactShadows blur={2.8} far={8} opacity={0.55} position={[0, -2.02, 0]} scale={7} />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.65}
        enablePan={false}
        enableZoom={false}
        maxPolarAngle={Math.PI / 1.75}
        minPolarAngle={Math.PI / 3.2}
      />
    </>
  );
}

export function RobotStage() {
  const [mode, setMode] = useState<StageMode>("checking");
  const showFallback = useCallback(() => setMode("fallback"), []);
  const showModel = useCallback(() => setMode("ready"), []);

  useEffect(() => {
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;

    let supportsWebGL = !connection?.saveData;
    try {
      const probe = document.createElement("canvas");
      const webgl = probe.getContext("webgl2") ?? probe.getContext("webgl");
      supportsWebGL = supportsWebGL && Boolean(webgl);
      const loseContext = webgl?.getExtension("WEBGL_lose_context");
      loseContext?.loseContext();
    } catch {
      supportsWebGL = false;
    }

    const capabilityId = window.setTimeout(
      () => setMode(supportsWebGL ? "loading" : "fallback"),
      0,
    );
    return () => window.clearTimeout(capabilityId);
  }, []);

  useEffect(() => {
    if (mode !== "loading") {
      return;
    }

    const timeoutId = window.setTimeout(showFallback, 9000);
    return () => window.clearTimeout(timeoutId);
  }, [mode, showFallback]);

  return (
    <div
      className={`robot-stage robot-stage-${mode}`}
      role="img"
      aria-label={mode === "ready"
        ? "Robot del taller de encapsulamiento de AlgoLab en tres dimensiones"
        : "Robot del taller de encapsulamiento de AlgoLab"}
    >
      <RobotPoster visible={mode !== "ready"} />
      {mode === "loading" || mode === "ready" ? (
        <WebGLErrorBoundary onError={showFallback}>
          <Suspense fallback={null}>
            <Canvas
              camera={{ fov: 36, position: [0, 1, 7] }}
              dpr={[1, 1.5]}
              gl={{ alpha: true, antialias: true, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false }}
              onCreated={({ gl }) => {
                gl.domElement.addEventListener("webglcontextlost", showFallback, { once: true });
              }}
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
                inset: 0,
                opacity: mode === "ready" ? 1 : 0,
                transition: "opacity 280ms ease",
              }}
            >
              <StageContent onReady={showModel} />
            </Canvas>
          </Suspense>
        </WebGLErrorBoundary>
      ) : null}
      {mode === "checking" || mode === "loading" ? (
        <span className="robot-stage-loading" role="status" aria-live="polite">
          Preparando vista 3D…
        </span>
      ) : null}
    </div>
  );
}
