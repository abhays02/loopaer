import React from "react";
import { motion } from "framer-motion";
import { Cpu, Search, ShieldCheck, Sparkles, GitBranch, ChevronRight } from "lucide-react";

const KIND_ICON = {
  planner: Cpu,
  research: Search,
  verification: ShieldCheck,
  skill_builder: Sparkles,
};

const STATE_COLOR = {
  running: "text-[var(--acid)]",
  waiting: "text-[var(--cyan)]",
  paused: "text-[var(--amber)]",
  needs_user: "text-[var(--hot)]",
  cancelled: "text-white/30",
  finished: "text-white/70",
  failed: "text-[var(--hot)]",
};

export default function LoopTree({ plan, loops, selected, onSelect, knowledge }) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-white/5">
        <div className="label-tag">loop tree</div>
        <div className="label-tag text-[var(--acid)]">{loops.length}</div>
      </div>

      <div className="flex-1 overflow-y-auto thin-scroll px-3 py-3 text-xs">
        {loops.length === 0 && plan == null && (
          <div className="text-white/30 mt-4 leading-relaxed">
            No loops yet. Launch the pipeline from the dock below to start reasoning.
          </div>
        )}

        {/* Plan tasks visualization */}
        {plan && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
            <div className="label-tag mb-2 text-white/40">plan</div>
            <div className="text-white/80 mb-3 text-[11px] leading-relaxed">{plan.understanding}</div>
            <div className="space-y-1">
              {(plan.tasks || []).map((t, i) => (
                <div key={t.id || i} className="flex items-start gap-2 py-1">
                  <span className="text-[var(--acid)] text-[10px] mt-0.5 shrink-0">◇</span>
                  <div className="min-w-0">
                    <div className="text-white/85 truncate">{t.title}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">{t.kind}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-3 text-[10px] text-white/40">
              <span>conf {plan.confidence}%</span>
              <span>·</span>
              <span>cost {plan.cost_estimate}</span>
            </div>
          </motion.div>
        )}

        {/* Loop cards */}
        <div className="label-tag mb-2 mt-4 text-white/40">running loops</div>
        <div className="space-y-2">
          {loops.map((l, i) => {
            const Icon = KIND_ICON[l.kind] || GitBranch;
            const isSel = selected === l.id;
            return (
              <motion.button
                key={l.id}
                onClick={() => onSelect(l.id)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                data-testid={`loop-card-${l.kind}`}
                className={`w-full text-left rounded-lg px-3 py-2.5 border transition-colors ${
                  isSel ? "border-[var(--acid)]/50 bg-[var(--acid)]/[0.04]" : "border-white/8 hover:border-white/20"
                }`}
              >
                <div className="flex items-start gap-2">
                  <Icon size={13} className={`mt-0.5 ${STATE_COLOR[l.state]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-white uppercase tracking-wider">{l.kind.replace("_", " ")}</div>
                      <div className={`text-[9px] ${STATE_COLOR[l.state]} uppercase tracking-wider`}>{l.state}</div>
                    </div>
                    <div className="text-[10px] text-white/50 mt-1 leading-tight line-clamp-2">{l.title}</div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/40">
                      <span>iter {l.iterations}/{l.budget}</span>
                      {l.state === "running" && <span className="text-[var(--acid)]">● live</span>}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Knowledge summary */}
        <div className="mt-6">
          <div className="label-tag mb-2 text-white/40">knowledge</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-white/8 p-2">
              <div className="text-[10px] text-white/40 uppercase">facts</div>
              <div className="font-display text-lg text-[var(--acid)]">{knowledge?.facts?.length || 0}</div>
            </div>
            <div className="rounded-lg border border-white/8 p-2">
              <div className="text-[10px] text-white/40 uppercase">nodes</div>
              <div className="font-display text-lg text-[var(--cyan)]">{knowledge?.entities?.length || 0}</div>
            </div>
            <div className="rounded-lg border border-white/8 p-2">
              <div className="text-[10px] text-white/40 uppercase">src</div>
              <div className="font-display text-lg text-white/70">{knowledge?.sources?.length || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
