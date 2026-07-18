import React from "react";
import { motion } from "framer-motion";

/** Tiny continuously-animating SVG illustration for each loop card. 80x80 viewBox. */
export default function LoopMiniViz({ kind }) {
  const acid = "var(--acid)";
  const cyan = "var(--cyan)";
  const amber = "var(--amber)";

  if (kind === "plan") {
    // three horizontal bars filling like a plan being written
    return (
      <svg viewBox="0 0 80 80" className="w-full h-full">
        {[20, 34, 48].map((y, i) => (
          <React.Fragment key={i}>
            <rect x="10" y={y} width="60" height="4" rx="2" fill="rgba(255,255,255,0.08)" />
            <motion.rect
              x="10" y={y} height="4" rx="2" fill={i === 2 ? amber : acid}
              initial={{ width: 0 }}
              animate={{ width: [0, 60 - i * 10, 60 - i * 10, 0] }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.5, times: [0, 0.4, 0.8, 1] }}
            />
          </React.Fragment>
        ))}
      </svg>
    );
  }
  if (kind === "orbit") {
    return (
      <svg viewBox="0 0 80 80" className="w-full h-full">
        <circle cx="40" cy="40" r="24" fill="none" stroke="rgba(0,229,255,0.15)" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="40" cy="40" r="14" fill="none" stroke="rgba(212,255,0,0.2)" strokeWidth="1" />
        <motion.g animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "40px 40px" }}>
          <circle cx="64" cy="40" r="3" fill={cyan} />
          <circle cx="16" cy="40" r="2" fill={cyan} opacity="0.6" />
        </motion.g>
        <motion.g animate={{ rotate: -360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "40px 40px" }}>
          <circle cx="54" cy="40" r="2.5" fill={acid} />
        </motion.g>
        <circle cx="40" cy="40" r="4" fill={acid} />
      </svg>
    );
  }
  if (kind === "bars") {
    const bars = [42, 62, 30, 58, 46];
    return (
      <svg viewBox="0 0 80 80" className="w-full h-full">
        {bars.map((h, i) => (
          <motion.rect
            key={i}
            x={8 + i * 13} width="8" rx="2"
            y={70 - h} height={h}
            fill={h > 55 ? acid : h > 40 ? cyan : amber}
            animate={{ height: [h, h - 20, h + 5, h], y: [70 - h, 70 - (h - 20), 70 - (h + 5), 70 - h] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </svg>
    );
  }
  if (kind === "spark") {
    return (
      <svg viewBox="0 0 80 80" className="w-full h-full">
        {[0, 60, 120, 180, 240, 300].map((a, i) => {
          const rad = (a * Math.PI) / 180;
          return (
            <motion.line
              key={i}
              x1="40" y1="40"
              x2={40 + Math.cos(rad) * 28} y2={40 + Math.sin(rad) * 28}
              stroke={acid} strokeWidth="1.5" strokeLinecap="round"
              animate={{ opacity: [0.2, 1, 0.2], strokeWidth: [1, 2, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.1 }}
            />
          );
        })}
        <motion.circle cx="40" cy="40" r="6" fill={acid} animate={{ scale: [0.8, 1.3, 0.8] }} transition={{ duration: 1.4, repeat: Infinity }} />
      </svg>
    );
  }
  if (kind === "pulse") {
    return (
      <svg viewBox="0 0 80 80" className="w-full h-full">
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cx="40" cy="40"
            fill="none"
            stroke={amber}
            strokeWidth="1.5"
            initial={{ r: 6, opacity: 1 }}
            animate={{ r: [6, 32], opacity: [1, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
          />
        ))}
        <circle cx="40" cy="40" r="4" fill={amber} />
      </svg>
    );
  }
  if (kind === "graph") {
    const nodes = [
      [40, 40], [16, 22], [64, 20], [18, 60], [66, 60], [40, 12], [40, 68],
    ];
    return (
      <svg viewBox="0 0 80 80" className="w-full h-full">
        {nodes.slice(1).map(([x, y], i) => (
          <motion.line
            key={i}
            x1="40" y1="40" x2={x} y2={y}
            stroke={cyan} strokeWidth="1" strokeDasharray="2 3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 1, 0], opacity: [0.2, 0.9, 0.9, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
        {nodes.map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x} cy={y} r={i === 0 ? 4 : 2.5}
            fill={i === 0 ? acid : cyan}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </svg>
    );
  }
  if (kind === "stack") {
    return (
      <svg viewBox="0 0 80 80" className="w-full h-full">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.rect
            key={i}
            x={12 + i * 2} width={56 - i * 4}
            height="7" rx="2"
            y={62 - i * 10}
            fill={i === 0 ? acid : "rgba(255,255,255,0.15)"}
            stroke={i === 0 ? acid : "rgba(255,255,255,0.35)"}
            strokeWidth="1"
            animate={{ y: [62 - i * 10, 60 - i * 10, 62 - i * 10] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </svg>
    );
  }
  if (kind === "wave") {
    // playback / replay waveform
    const bars = Array.from({ length: 14 });
    return (
      <svg viewBox="0 0 80 80" className="w-full h-full">
        {bars.map((_, i) => {
          const baseH = 8 + Math.sin(i * 0.9) * 10 + 12;
          return (
            <motion.rect
              key={i}
              x={8 + i * 5}
              width="2.5"
              rx="1"
              fill={i < 8 ? acid : "rgba(255,255,255,0.3)"}
              animate={{
                height: [baseH, baseH + 8, baseH - 6, baseH],
                y: [40 - baseH / 2, 40 - (baseH + 8) / 2, 40 - (baseH - 6) / 2, 40 - baseH / 2],
              }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.06 }}
            />
          );
        })}
      </svg>
    );
  }
  return null;
}
