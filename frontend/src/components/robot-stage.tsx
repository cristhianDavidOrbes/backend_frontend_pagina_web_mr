"use client";

import { Component, Suspense, useMemo, useState, useEffect, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, ContactShadows, OrbitControls, Sparkles, useGLTF } from "@react-three/drei";
import { Bot, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import Image from "next/image";

class WebGLErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center text-center p-6">
          <div className="relative h-44 w-44 rounded-full border border-emerald-500/20 bg-emerald-500/5 p-4 backdrop-blur-md flex items-center justify-center">
            <Bot className="h-20 w-20 text-emerald-400/80 animate-pulse" />
          </div>
          <p className="mt-3 text-xs font-mono text-emerald-400">Modo Holográfico 2D Activo</p>
          <span className="text-[11px] text-slate-500">Robot de encapsulamiento Nivel 03</span>
        </div>
      );
    }
    return this.props.children;
  }
}

function RobotModel() {
  const { scene } = useGLTF("/models/algolab-robot.glb");
  const model = useMemo(() => scene.clone(true), [scene]);

  return (
    <group rotation={[0, -0.35, 0]}>
      <primitive object={model} />
    </group>
  );
}

function StageContent() {
  return (
    <>
      <ambientLight intensity={2.0} />
      <directionalLight color="#d6fff2" intensity={3.6} position={[4, 6, 5]} />
      <pointLight color="#21dca0" intensity={20} position={[-3, 2, 2]} />
      <pointLight color="#178cff" intensity={14} position={[3, 0, -1]} />
      <Sparkles color="#5dffc4" count={32} opacity={0.5} scale={[5, 4.5, 3.5]} size={2} speed={0.4} />
      <Bounds fit margin={1.22}>
        <RobotModel />
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

function StageLoader() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-sm pointer-events-none">
      <div className="relative flex items-center justify-center">
        <div className="h-16 w-16 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
        <Bot className="absolute h-7 w-7 text-emerald-400" />
      </div>
      <span className="mt-3 text-[11px] font-mono uppercase tracking-widest text-emerald-300/70">
        Cargando laboratorio 3D...
      </span>
    </div>
  );
}

export function RobotStage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="robot-stage" role="img" aria-label="Robot del taller de encapsulamiento de AlgoLab en tres dimensiones">
      {!mounted ? (
        <StageLoader />
      ) : (
        <WebGLErrorBoundary>
          <Suspense fallback={<StageLoader />}>
            <Canvas
              camera={{ fov: 36, position: [0, 1, 7] }}
              dpr={[1, 2]}
              gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
              style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
            >
              <StageContent />
            </Canvas>
          </Suspense>
        </WebGLErrorBoundary>
      )}
    </div>
  );
}

useGLTF.preload("/models/algolab-robot.glb");

