import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Central pulsing core — cheap standard material, no transmission. */
function Core() {
  const ref = useRef();
  useFrame((s) => {
    const t = s.clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 2) * 0.05;
    if (ref.current) ref.current.scale.setScalar(pulse);
  });
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial color="#d9ff4d" emissive="#d9ff4d" emissiveIntensity={0.5} transparent opacity={0.18} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshStandardMaterial color="#f5efe0" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.16, 20, 20]} />
        <meshStandardMaterial color="#d9ff4d" emissive="#d9ff4d" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

/** Lightweight ring — thin torus + a handful of nodes. No transmission. */
function LoopRing({ radius, tube, color, speed, tilt = [0, 0, 0] }) {
  const g = useRef();
  useFrame((s) => { if (g.current) g.current.rotation.y = s.clock.getElapsedTime() * speed; });
  const nodes = 5;
  return (
    <group ref={g} rotation={tilt}>
      <mesh>
        <torusGeometry args={[radius, tube, 16, 96]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} emissive={color} emissiveIntensity={0.15} />
      </mesh>
      {Array.from({ length: nodes }).map((_, i) => {
        const a = (i / nodes) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * radius, 0, Math.sin(a) * radius]}>
            <sphereGeometry args={[tube * 2, 12, 12]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function Cluster() {
  const g = useRef();
  useFrame((s, dt) => { if (g.current) g.current.rotation.y += dt * 0.12; });
  return (
    <group ref={g}>
      <Core />
      <LoopRing radius={1.1}  tube={0.02}  color="#d9ff4d" speed={0.30}  tilt={[0.4, 0, 0.1]} />
      <LoopRing radius={1.55} tube={0.018} color="#7fdcff" speed={-0.24} tilt={[0.2, 0.5, 0.3]} />
      <LoopRing radius={2.0}  tube={0.014} color="#ffb254" speed={0.18}  tilt={[-0.3, 0.2, -0.4]} />
    </group>
  );
}

/** Pause rendering when the canvas isn't in view — biggest scroll-jank fix. */
function useVisibility(ref) {
  const [visible, setVisible] = React.useState(true);
  React.useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}

export default function LoopScene() {
  const holder = React.useRef(null);
  const visible = useVisibility(holder);
  return (
    <div ref={holder} className="absolute inset-0 pointer-events-none" data-testid="hero-3d-scene">
      <Canvas
        camera={{ position: [0, 0.3, 5.4], fov: 40 }}
        dpr={[1, 1.5]}
        frameloop={visible ? "always" : "demand"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false, depth: true }}
        style={{ pointerEvents: "none" }}
      >
        <color attach="background" args={["#0a0a0c"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 4, 3]} intensity={1.0} color="#f5efe0" />
        <pointLight position={[-3, -2, -2]} intensity={0.6} color="#7fdcff" />
        <Suspense fallback={null}>
          <Cluster />
        </Suspense>
      </Canvas>
    </div>
  );
}
