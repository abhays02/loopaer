import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Central pulsing core (the "runtime") */
function Core() {
  const ref = useRef();
  const inner = useRef();
  useFrame((s) => {
    const t = s.clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 2.4) * 0.06;
    if (ref.current) { ref.current.scale.setScalar(pulse); ref.current.rotation.y = t * 0.3; }
    if (inner.current) inner.current.material.emissiveIntensity = 1.6 + Math.sin(t * 3) * 0.6;
  });
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.75, 48, 48]} />
        <meshStandardMaterial color="#d9ff4d" emissive="#d9ff4d" emissiveIntensity={0.7} transparent opacity={0.18} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.5, 48, 48]} />
        <meshPhysicalMaterial
          color="#f5efe0"
          roughness={0.15}
          metalness={0.55}
          transmission={0.6}
          thickness={0.5}
          clearcoat={1}
          clearcoatRoughness={0.05}
          ior={1.4}
        />
      </mesh>
      <mesh ref={inner}>
        <sphereGeometry args={[0.24, 32, 32]} />
        <meshStandardMaterial color="#d9ff4d" emissive="#d9ff4d" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

/** A single glass torus ring representing one loop, with animated satellite nodes. */
function LoopRing({ radius, tube, color, speed, tilt = [0, 0, 0], nodeCount = 6 }) {
  const g = useRef();
  const nodeRefs = useRef([]);
  useFrame((s) => {
    const t = s.clock.getElapsedTime();
    if (g.current) g.current.rotation.y = t * speed;
    nodeRefs.current.forEach((n, i) => {
      if (!n?.material) return;
      const off = i * 0.5;
      n.material.emissiveIntensity = 0.8 + Math.sin(t * 2 + off) * 0.3;
    });
  });
  return (
    <group ref={g} rotation={tilt}>
      <mesh>
        <torusGeometry args={[radius, tube, 40, 200]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.08}
          metalness={0.25}
          transmission={0.75}
          thickness={0.6}
          clearcoat={1}
          clearcoatRoughness={0.03}
          ior={1.4}
          reflectivity={0.6}
          transparent
          opacity={0.92}
        />
      </mesh>
      {Array.from({ length: nodeCount }).map((_, i) => {
        const a = (i / nodeCount) * Math.PI * 2;
        return (
          <mesh
            key={i}
            ref={(el) => (nodeRefs.current[i] = el)}
            position={[Math.cos(a) * radius, 0, Math.sin(a) * radius]}
          >
            <sphereGeometry args={[tube * 1.9, 20, 20]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Ambient float particles (like data motes). */
function Particles({ count = 90 }) {
  const ref = useRef();
  const positions = React.useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() - 0.5) * 8;
      a[i * 3 + 1] = (Math.random() - 0.5) * 6;
      a[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return a;
  }, [count]);
  useFrame((s) => {
    const t = s.clock.getElapsedTime();
    if (ref.current) ref.current.rotation.y = t * 0.05;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.028} color="#f5efe0" transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** Interactive cluster — pointer drives rotation smoothly (drei-less orbit). */
function Cluster({ pointer }) {
  const g = useRef();
  const target = useRef({ x: 0, y: 0 });
  useFrame((s, dt) => {
    if (!g.current) return;
    // Base auto-rotation
    g.current.rotation.y += dt * 0.12;
    // Pointer-driven tilt (smooth)
    target.current.x += ((pointer.current.y * 0.6) - g.current.rotation.x) * 0.06;
    target.current.y += ((pointer.current.x * 0.9) - g.current.rotation.z) * 0.06;
    g.current.rotation.x = target.current.x;
    g.current.rotation.z = target.current.y;
  });
  return (
    <group ref={g}>
      <Core />
      <LoopRing radius={1.15} tube={0.02}  color="#d9ff4d" speed={0.35}  tilt={[0.4,  0,    0.1]} />
      <LoopRing radius={1.55} tube={0.018} color="#7fdcff" speed={-0.28} tilt={[0.2,  0.5,  0.3]} />
      <LoopRing radius={1.95} tube={0.014} color="#ffb254" speed={0.22}  tilt={[-0.3, 0.2, -0.4]} />
      <LoopRing radius={2.35} tube={0.012} color="#f5efe0" speed={-0.16} tilt={[0.15,-0.4,  0.5]} />
      <Particles count={100} />
    </group>
  );
}

export default function LoopScene() {
  const pointer = React.useRef({ x: 0, y: 0 });
  const dragging = React.useRef(false);
  const last = React.useRef({ x: 0, y: 0 });
  const manual = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    const move = (e) => {
      const w = window.innerWidth, h = window.innerHeight;
      // Base pointer position → drives subtle parallax when NOT dragging
      pointer.current.x = manual.current.x + ((e.clientX / w) - 0.5) * 0.4;
      pointer.current.y = manual.current.y + ((e.clientY / h) - 0.5) * 0.3;
      if (dragging.current) {
        manual.current.x += (e.clientX - last.current.x) * 0.005;
        manual.current.y += (e.clientY - last.current.y) * 0.005;
        last.current = { x: e.clientX, y: e.clientY };
      }
    };
    const down = (e) => { dragging.current = true; last.current = { x: e.clientX, y: e.clientY }; };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none" data-testid="hero-3d-scene">
      <Canvas
        camera={{ position: [0, 0.3, 5.6], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ pointerEvents: "none" }}
      >
        <color attach="background" args={["#0a0a0c"]} />
        <fog attach="fog" args={["#0a0a0c", 6, 14]} />

        {/* Rim lights that make the glass sing */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 4, 3]}  intensity={1.4} color="#f5efe0" />
        <pointLight       position={[-3,-2,-2]} intensity={0.9} color="#7fdcff" />
        <pointLight       position={[2, -3, 1]} intensity={0.7} color="#d9ff4d" />
        <pointLight       position={[0, 3, -2]} intensity={0.5} color="#ffb254" />

        <Suspense fallback={null}>
          <Cluster pointer={pointer} />
        </Suspense>
      </Canvas>
    </div>
  );
}
