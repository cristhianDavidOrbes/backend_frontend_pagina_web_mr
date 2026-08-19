"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, ContactShadows, OrbitControls, Sparkles, useGLTF } from "@react-three/drei";
import type { Group } from "three";

function RobotModel() {
  const { scene } = useGLTF("/models/algolab-robot.glb");
  const group = useRef<Group>(null);
  const model = useMemo(() => scene.clone(true), [scene]);

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.13;
  });

  return (
    <group ref={group} rotation={[0, -0.35, 0]}>
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
      <Canvas camera={{ fov: 34, position: [0, 1, 7] }} dpr={[1, 1.55]} gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}>
        <Suspense fallback={null}>
          <StageContent />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/algolab-robot.glb");

