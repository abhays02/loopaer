import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Cpu, Search, ShieldCheck, Sparkles, GitBranch, AlertTriangle } from "lucide-react";

const KIND_META = {
  root:      { color: "var(--acid)",  icon: Cpu,          label: "GOAL" },
  search:    { color: "var(--cyan)",  icon: Search,       label: "SEARCH" },
  extract:   { color: "var(--cyan)",  icon: Search,       label: "EXTRACT" },
  verify:    { color: "var(--amber)", icon: ShieldCheck,  label: "VERIFY" },
  synthesize:{ color: "var(--acid)",  icon: Sparkles,     label: "SYNTH" },
  iteration: { color: "rgba(255,255,255,0.65)", icon: GitBranch, label: "ITER" },
  fact:      { color: "rgba(255,255,255,0.9)",  icon: null, label: "FACT" },
  entity:    { color: "var(--cyan)",  icon: null,         label: "ENT" },
  gap:       { color: "var(--amber)", icon: AlertTriangle,label: "GAP" },
};

function walkFlat(tree, collapsed) {
  const out = [];
  const stack = [{ node: tree, depth: 0, parentId: null, path: [] }];
  while (stack.length) {
    const { node, depth, parentId, path } = stack.pop();
    const nodeId = node.id || `${parentId}-${out.length}`;
    const kids = node.children || [];
    const hasKids = kids.length > 0;
    const isCollapsed = collapsed.has(nodeId);
    out.push({ node, depth, id: nodeId, parentId, hasKids, isCollapsed, path });
    if (hasKids && !isCollapsed) {
      for (let i = kids.length - 1; i >= 0; i--) {
        stack.push({ node: kids[i], depth: depth + 1, parentId: nodeId, path: [...path, nodeId] });
      }
    }
  }
  return out;
}

function summarize(tree) {
  let leaves = 0, deepest = 0, total = 0;
  const stack = [{ n: tree, d: 0 }];
  while (stack.length) {
    const { n, d } = stack.pop();
    total++;
    if (d > deepest) deepest = d;
    const cs = n.children || [];
    if (cs.length === 0) leaves++;
    cs.forEach((c) => stack.push({ n: c, d: d + 1 }));
  }
  return { leaves, deepest, total };
}

export default function ReasoningTree({ tree, events }) {
  const [collapsed, setCollapsed] = useState(new Set());
  const stats = useMemo(() => tree ? summarize(tree) : { leaves: 0, deepest: 0, total: 0 }, [tree]);
  const rows = useMemo(() => tree ? walkFlat(tree, collapsed) : [], [tree, collapsed]);

  const recentUpdate = useMemo(() => {
    if (!events) return null;
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].type === "ReasoningTreeUpdated") return events[i];
    }
    return null;
  }, [events]);

  const toggle = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!tree || !(tree.children || []).length) {
    return (
      <div className="p-12">
        <div className="label-tag">reasoning tree</div>
        <div className="font-display text-3xl mt-3 leading-tight max-w-2xl">
          The runtime will grow a live tree of every decision, extraction and verification here.
        </div>
        <div className="text-white/50 mt-4 max-w-2xl text-sm">
          Run the planner and research loops — every task, iteration, fact and confidence check
          will appear as an animated node.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 flex gap-8">
      <div className="flex-1 min-w-0">
        <div className="label-tag mb-2">live cognition</div>
        <div className="font-display text-3xl tracking-tight leading-tight mb-6">
          Reasoning Tree · <span className="text-[var(--acid)]">{stats.total}</span> nodes · depth <span className="text-[var(--cyan)]">{stats.deepest}</span>
        </div>

        <div className="glass rounded-2xl p-6 max-w-full">
          <AnimatePresence initial={false}>
            {rows.map((row) => {
              const meta = KIND_META[row.node.kind] || KIND_META.iteration;
              const Icon = meta.icon;
              const conf = row.node.confidence;
              const confColor = conf == null ? null : conf > 70 ? "var(--acid)" : conf > 40 ? "var(--cyan)" : "var(--amber)";
              return (
                <motion.div
                  key={row.id}
                  layout
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.3, delay: Math.min(row.depth * 0.03, 0.4) }}
                  className="flex items-start gap-2 py-1.5 group relative"
                  style={{ paddingLeft: row.depth * 22 }}
                  data-testid={`tree-row-${row.node.kind}`}
                >
                  {row.depth > 0 && (
                    <div
                      className="absolute top-1/2 w-3 h-px"
                      style={{ left: row.depth * 22 - 14, background: meta.color + "55" }}
                    />
                  )}
                  <div className="flex items-center shrink-0 mt-1">
                    {row.hasKids ? (
                      <button
                        onClick={() => toggle(row.id)}
                        className="w-4 h-4 rounded-sm flex items-center justify-center hover:bg-white/8 transition-colors"
                      >
                        <motion.span
                          animate={{ rotate: row.isCollapsed ? 0 : 90 }}
                          transition={{ duration: 0.2 }}
                          style={{ display: "inline-flex" }}
                        >
                          <ChevronRight size={11} className="text-white/50" />
                        </motion.span>
                      </button>
                    ) : (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: meta.color, boxShadow: "0 0 8px " + meta.color }}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {Icon ? <Icon size={11} style={{ color: meta.color }} className="shrink-0" /> : null}
                      <span
                        className="text-[9px] uppercase tracking-wider font-mono shrink-0"
                        style={{ color: meta.color }}
                      >
                        {meta.label}
                      </span>
                      {confColor && (
                        <span
                          className="text-[9px] font-mono ml-auto shrink-0 px-1.5 py-0.5 rounded-full border"
                          style={{ color: confColor, borderColor: confColor + "40" }}
                        >
                          {conf}%
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-white/85 leading-snug mt-0.5 group-hover:text-white transition-colors">
                      {row.node.label}
                    </div>
                    {row.node.verdict && row.node.verdict !== "supported" && (
                      <div className="text-[9px] text-[var(--amber)] uppercase tracking-wider mt-0.5">{row.node.verdict}</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-[260px] shrink-0 space-y-3">
        <div className="glass rounded-xl p-4">
          <div className="label-tag mb-3">structure</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-white/40 uppercase">leaves</div>
              <div className="font-display text-2xl text-[var(--acid)]">{stats.leaves}</div>
            </div>
            <div>
              <div className="text-[10px] text-white/40 uppercase">depth</div>
              <div className="font-display text-2xl text-[var(--cyan)]">{stats.deepest}</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="label-tag mb-3">legend</div>
          <div className="space-y-1.5 text-[10px] text-white/70">
            {Object.entries(KIND_META).filter(([k]) => k !== "root").map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: v.color }} />
                <span className="uppercase tracking-wider" style={{ color: v.color }}>{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        {recentUpdate && (
          <div className="glass rounded-xl p-4">
            <div className="label-tag mb-2">last update</div>
            <div className="text-[10px] text-white/60 font-mono">
              {new Date(recentUpdate.ts).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
