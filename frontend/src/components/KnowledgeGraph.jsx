import React, { useMemo } from "react";
import { motion } from "framer-motion";

/** Radial force-inspired layout for entity → source nodes. Simple, elegant, no external deps. */
export default function KnowledgeGraph({ knowledge }) {
  const { entities, sources, facts } = knowledge;

  const nodes = useMemo(() => {
    const items = [];
    const goal = { id: "root", label: "goal", type: "root", x: 500, y: 380, r: 30 };
    items.push(goal);

    // Entities on inner ring
    entities.forEach((e, i) => {
      const total = Math.max(6, entities.length);
      const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
      const r = 170;
      items.push({
        id: `ent-${i}`,
        label: e.label,
        type: e.type,
        x: 500 + Math.cos(angle) * r,
        y: 380 + Math.sin(angle) * r,
        r: 10,
        kind: "entity",
      });
    });
    // Sources on outer ring, with jitter
    sources.forEach((s, i) => {
      const total = Math.max(12, sources.length);
      const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
      const jitter = (i % 3 === 0 ? 40 : i % 3 === 1 ? 0 : -30);
      const r = 300 + jitter;
      items.push({
        id: `src-${i}`,
        label: (s.title || s.name || "src").slice(0, 34),
        type: s.kind || "src",
        x: 500 + Math.cos(angle) * r,
        y: 380 + Math.sin(angle) * r,
        r: 6,
        kind: "source",
        stars: s.stars,
      });
    });
    return items;
  }, [entities, sources]);

  const links = useMemo(() => nodes.filter((n) => n.id !== "root").map((n) => ({ from: "root", to: n.id })), [nodes]);

  const findNode = (id) => nodes.find((n) => n.id === id);

  return (
    <div className="h-full flex flex-col">
      <div className="p-8 border-b border-white/5">
        <div className="label-tag">knowledge graph</div>
        <div className="font-display text-2xl mt-1 tracking-tight">
          {entities.length + sources.length} nodes · {facts.length} verified facts
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <svg viewBox="0 0 1000 760" className="w-full h-full">
          {/* connections */}
          <g stroke="rgba(212,255,0,0.14)" strokeWidth="1" fill="none">
            {links.map((l, i) => {
              const from = findNode(l.from);
              const to = findNode(l.to);
              if (!from || !to) return null;
              return (
                <motion.line
                  key={i}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: i * 0.02 }}
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  className="dash-connector"
                />
              );
            })}
          </g>

          {/* nodes */}
          {nodes.map((n, i) => {
            const isRoot = n.id === "root";
            const fill = isRoot ? "#d4ff00" : n.kind === "entity" ? "#00e5ff" : "rgba(255,255,255,0.6)";
            return (
              <motion.g
                key={n.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 18, delay: i * 0.03 }}
              >
                <circle cx={n.x} cy={n.y} r={n.r + 4} fill={fill} opacity="0.15" />
                <circle cx={n.x} cy={n.y} r={n.r} fill={fill} />
                {isRoot && (
                  <text x={n.x} y={n.y + 5} textAnchor="middle" fill="black" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">
                    LUMEN
                  </text>
                )}
                <text
                  x={n.x}
                  y={n.y + n.r + 12}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.75)"
                  fontSize={isRoot ? "11" : "8"}
                  fontFamily="JetBrains Mono"
                >
                  {n.label?.slice(0, 26)}
                </text>
                {n.type && !isRoot && n.kind === "entity" && (
                  <text
                    x={n.x}
                    y={n.y + n.r + 22}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.30)"
                    fontSize="7"
                    fontFamily="JetBrains Mono"
                    className="uppercase"
                  >
                    {n.type}
                  </text>
                )}
              </motion.g>
            );
          })}
        </svg>

        {nodes.length <= 1 && (
          <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">
            entities & sources will appear here as the research loop runs
          </div>
        )}
      </div>

      {/* legend + facts */}
      <div className="border-t border-white/5 p-4 flex items-start gap-6 max-h-[220px] overflow-y-auto thin-scroll">
        <div className="shrink-0">
          <div className="label-tag mb-2">legend</div>
          <div className="flex flex-col gap-1 text-[10px] text-white/60">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--acid)]" /> goal</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--cyan)]" /> entity</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-white/60" /> source</div>
          </div>
        </div>
        <div className="flex-1">
          <div className="label-tag mb-2">verified facts</div>
          <div className="space-y-1 text-[11px] text-white/70">
            {facts.slice(0, 6).map((f, i) => (
              <div key={i} className="flex items-baseline gap-2">
                <span className="text-[var(--acid)] text-[10px]">◇</span>
                <span className="flex-1">{f.text}</span>
                {f.verified_confidence != null && (
                  <span className="text-[10px] text-white/40">{f.verified_confidence}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
