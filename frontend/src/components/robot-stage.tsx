"use client";

import { Component, Suspense, useMemo, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, ContactShadows, OrbitControls, Sparkles, useGLTF } from "@react-three/drei";
import { ShieldCheck } from "lucide-react";

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
        <div className="grid h-full w-full place-items-center text-center">
          <div>
            <ShieldCheck className="mx-auto text-emerald-300/40" size={48} />
            <p className="mt-3 text-sm text-slate-500">Visualización 3D no disponible</p>
          </div>
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
      <ambientLight intensity={1.8} />
      <directionalLight color="#d6fff2" intensity={3.4} position={[4, 6, 5]} />
      <pointLight color="#21dca0" intensity={18} position={[-3, 2, 2]} />
      <pointLight color="#178cff" intensity={12} position={[3, 0, -1]} />
      <Sparkles color="#5dffc4" count={28} opacity={0.45} scale={[4.4, 4, 3]} size={1.8} speed={0.35} />
      <Bounds fit clip margin={1.28} observe>
        <RobotModel />
      </Bounds>
      <ContactShadows blur={2.5} far={8} opacity={0.52} position={[0, -2.02, 0]} scale={7} />
      <OrbitControls autoRotate autoRotateSpeed={0.55} enablePan={false} enableZoom={false} maxPolarAngle={Math.PI / 1.75} minPolarAngle={Math.PI / 3.2} />
    </>
  );
}

export function RobotStage() {
  return (
    <div className="robot-stage" role="img" aria-label="Robot del taller de encapsulamiento de AlgoLab en tres dimensiones">
      <WebGLErrorBoundary>
        <Canvas camera={{ fov: 34, position: [0, 1, 7] }} dpr={[1, 1.55]} gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}>
          <Suspense fallback={null}>
            <StageContent />
          </Suspense>
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}

useGLTF.preload("/models/algolab-robot.glb");
