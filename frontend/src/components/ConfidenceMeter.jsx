import React from "react";
import { motion } from "framer-motion";

export default function ConfidenceMeter({ knowledge }) {
  const conf = knowledge.confidence || [];
  const avg = conf.length ? Math.round(conf.reduce((a, c) => a + (c.confidence || 0), 0) / conf.length) : 0;
  const color = avg > 75 ? "var(--acid)" : avg > 50 ? "var(--cyan)" : avg > 0 ? "var(--amber)" : "rgba(255,255,255,0.3)";

  return (
    <div className="p-10">
      <div className="label-tag">verification</div>
      <div className="font-display text-3xl mt-1 tracking-tight">Confidence · <span style={{ color }}>{avg}%</span></div>

      <div className="mt-10 grid grid-cols-[300px_1fr] gap-10 items-start">
        {/* Dial */}
        <svg viewBox="0 0 200 200" className="w-full">
          <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <motion.circle
            cx="100" cy="100" r="80"
            fill="none" stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 80}
            initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 80 * (1 - avg / 100) }}
            transition={{ duration: 1, ease: "easeInOut" }}
            transform="rotate(-90 100 100)"
            style={{ filter: `drop-shadow(0 0 10px ${color})` }}
          />
          <text x="100" y="105" textAnchor="middle" className="font-display" fill="white" fontSize="42" fontWeight="600">{avg}</text>
          <text x="100" y="130" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="JetBrains Mono">CONFIDENCE</text>
        </svg>

        {/* per-fact list */}
        <div className="space-y-2">
          <div className="label-tag mb-2">per-fact confidence</div>
          {conf.length === 0 && <div className="text-white/40 text-sm">Run verification to see confidence per fact.</div>}
          {conf.slice(-12).reverse().map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass rounded-lg px-4 py-3 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0 text-sm text-white/80 truncate">{c.fact}</div>
              <div className="relative w-28 h-2 bg-white/8 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${c.confidence}%` }}
                  transition={{ duration: 0.6 }}
                  style={{ background: c.confidence > 75 ? "var(--acid)" : c.confidence > 50 ? "var(--cyan)" : "var(--amber)" }}
                />
              </div>
              <div className="w-10 text-right font-mono text-xs" style={{ color: c.confidence > 75 ? "var(--acid)" : c.confidence > 50 ? "var(--cyan)" : "var(--amber)" }}>{c.confidence}%</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
