import React, { useMemo } from "react";
import { motion } from "framer-motion";

/** Live hero visualization: nested orbiting rings of "thoughts", a pulsing
 * central core, source pings arriving from the outside, and dashed connectors
 * that draw themselves — a real illustration of the runtime thinking.
 *
 * Everything is continuously animated (no whileInView, no play-once).
 */
export default function HeroLoopViz() {
  // pre-computed node positions on 3 concentric orbits
  const rings = useMemo(() => ([
    { r: 90,  count: 6,  speed: 22, size: 5,  color: "var(--acid)" },
    { r: 155, count: 10, speed: 40, dir: -1, size: 3.5, color: "var(--cyan)" },
    { r: 220, count: 14, speed: 60, size: 2.5, color: "rgba(255,255,255,0.55)" },
  ]), []);

  // 8 incoming "source pings" that fly to the core along dashed lines
  const pings = useMemo(() => (
    Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 320;
      return {
        i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        delay: (i * 0.4) % 3,
      };
    })
  ), []);

  return (
    <svg viewBox="-320 -320 640 640" className="w-full h-full">
      <defs>
        <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(212,255,0,0.9)" />
          <stop offset="60%" stopColor="rgba(212,255,0,0.2)" />
          <stop offset="100%" stopColor="rgba(212,255,0,0)" />
        </radialGradient>
        <radialGradient id="ping-trail" cx="0%" cy="50%" r="100%">
          <stop offset="0%" stopColor="rgba(0,229,255,0)" />
          <stop offset="80%" stopColor="rgba(0,229,255,0.6)" />
          <stop offset="100%" stopColor="rgba(0,229,255,1)" />
        </radialGradient>
        <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* soft background rings */}
      {rings.map((ring, i) => (
        <circle key={`bg-${i}`} cx="0" cy="0" r={ring.r} fill="none"
                stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}

      {/* dashed radial connectors (like signal lines) */}
      {pings.map((p) => (
        <line key={`line-${p.i}`}
              x1="0" y1="0" x2={p.x} y2={p.y}
              stroke="rgba(212,255,0,0.15)"
              strokeWidth="1"
              strokeDasharray="2 6"
              className="dash-connector" />
      ))}

      {/* Incoming pings: little glowing dots that travel inward */}
      {pings.map((p) => (
        <motion.circle
          key={`ping-${p.i}`}
          r="3"
          fill="var(--cyan)"
          filter="url(#glow)"
          initial={{ cx: p.x, cy: p.y, opacity: 0 }}
          animate={{
            cx: [p.x, 0],
            cy: [p.y, 0],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 3.6,
            times: [0, 0.1, 0.9, 1],
            repeat: Infinity,
            delay: p.delay,
            ease: "easeIn",
          }}
        />
      ))}

      {/* Orbiting rings of nodes */}
      {rings.map((ring, idx) => (
        <motion.g
          key={`ring-${idx}`}
          animate={{ rotate: (ring.dir || 1) * 360 }}
          transition={{ duration: ring.speed, repeat: Infinity, ease: "linear" }}
        >
          {Array.from({ length: ring.count }).map((_, i) => {
            const a = (i / ring.count) * Math.PI * 2;
            const x = Math.cos(a) * ring.r;
            const y = Math.sin(a) * ring.r;
            return (
              <motion.circle
                key={i}
                cx={x} cy={y}
                r={ring.size}
                fill={ring.color}
                filter="url(#glow)"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2 + (i % 3) * 0.6, repeat: Infinity, delay: i * 0.1 }}
              />
            );
          })}
          {/* orbit tick — a slightly brighter marker to visualize rotation */}
          <motion.circle
            cx={ring.r} cy="0"
            r={ring.size + 1.5}
            fill={ring.color}
            opacity="0.9"
            filter="url(#glow)"
          />
        </motion.g>
      ))}

      {/* Pulsing central "reasoning core" */}
      <motion.circle
        cx="0" cy="0" r="55"
        fill="url(#core-glow)"
        animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="0" cy="0" r="18"
        fill="var(--acid)"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="0" cy="0" r="8"
        fill="black"
      />

      {/* Rotating outer scale ticks */}
      <motion.g
        animate={{ rotate: -360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
      >
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const r1 = 280, r2 = i % 5 === 0 ? 292 : 286;
          return (
            <line key={i}
                  x1={Math.cos(a) * r1} y1={Math.sin(a) * r1}
                  x2={Math.cos(a) * r2} y2={Math.sin(a) * r2}
                  stroke={i % 5 === 0 ? "rgba(212,255,0,0.4)" : "rgba(255,255,255,0.12)"}
                  strokeWidth="1" />
          );
        })}
      </motion.g>

      {/* corner labels — "sensor readouts" that flicker */}
      {[
        { x: -290, y: -270, text: "PLANNER · 001" },
        { x:  180, y: -270, text: "RESEARCH · 002" },
        { x: -290, y:  280, text: "VERIFY · 003" },
        { x:  190, y:  280, text: "SKILL · 004" },
      ].map((l, i) => (
        <motion.text
          key={i}
          x={l.x} y={l.y}
          fill="rgba(212,255,0,0.55)"
          fontSize="9"
          fontFamily="JetBrains Mono"
          letterSpacing="2"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
        >
          {l.text}
        </motion.text>
      ))}
    </svg>
  );
}
