import React from "react";
import { motion } from "framer-motion";
import { Play, GitBranch, Cpu, Search, ShieldCheck, Sparkles } from "lucide-react";

const STAGE_META = [
  { id: "plan", label: "Understand", desc: "Restate the goal & scope", icon: Cpu },
  { id: "plan", label: "Questions", desc: "Generate sharp sub-questions", icon: Cpu },
  { id: "plan", label: "Tasks", desc: "Break into typed pipeline steps", icon: Cpu },
  { id: "plan", label: "Estimate", desc: "Cost · time · confidence", icon: Cpu },
];

export default function PlanReveal({ plan, events, onRunStage, activeLoop, onBranch }) {
  const branchInput = React.useRef(null);
  if (!plan) {
    return (
      <div className="p-12">
        <div className="label-tag">planner idle</div>
        <div className="font-display text-4xl mt-4 leading-tight max-w-2xl">
          Give the runtime a goal — it will <span className="italic font-serif text-white/60">think</span> before it acts.
        </div>
        <button data-testid="run-plan-btn" onClick={() => onRunStage("plan")} className="btn-acid mt-8 inline-flex items-center gap-2">
          <Play size={14} /> run planner
        </button>
      </div>
    );
  }

  const staggered = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={staggered} initial="hidden" animate="show" className="p-10 max-w-[900px]">
      <motion.div variants={item} className="label-tag">understanding</motion.div>
      <motion.div variants={item} className="font-display text-3xl lg:text-4xl leading-tight mt-2 tracking-tight">
        {plan.understanding}
      </motion.div>

      <motion.div variants={item} className="mt-10 label-tag">questions</motion.div>
      <div className="mt-3 space-y-2">
        {(plan.questions || []).map((q, i) => (
          <motion.div key={i} variants={item} className="flex items-start gap-3 text-white/85">
            <span className="text-[var(--acid)] font-mono text-xs mt-1">Q{i + 1}</span>
            <span className="text-sm leading-relaxed">{q}</span>
          </motion.div>
        ))}
      </div>

      <motion.div variants={item} className="mt-10 label-tag">tasks · pipeline</motion.div>
      <div className="mt-3 flex flex-col gap-2">
        {(plan.tasks || []).map((t, i) => (
          <motion.div key={t.id || i} variants={item} className="glass rounded-lg px-4 py-3 flex items-center gap-4">
            <span className="text-[var(--acid)] font-mono text-xs w-6">{String(i + 1).padStart(2, "0")}</span>
            <div className="flex-1">
              <div className="text-sm text-white">{t.title}</div>
              <div className="label-tag mt-0.5">{t.kind} · depends {t.depends_on?.join(",") || "—"}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={item} className="mt-10 grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4">
          <div className="label-tag">confidence</div>
          <div className="font-display text-3xl text-[var(--acid)] mt-1">{plan.confidence}%</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="label-tag">cost estimate</div>
          <div className="font-display text-3xl mt-1">{plan.cost_estimate}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="label-tag">time · sec</div>
          <div className="font-display text-3xl mt-1">{plan.time_estimate}</div>
        </div>
      </motion.div>

      <motion.div variants={item} className="mt-10 flex flex-wrap items-center gap-3">
        <button data-testid="run-research-btn" onClick={() => onRunStage("research")} className="btn-acid inline-flex items-center gap-2">
          <Search size={14} /> execute research
        </button>
        <button data-testid="run-verify-btn" onClick={() => onRunStage("verify")} className="btn-ghost inline-flex items-center gap-2">
          <ShieldCheck size={14} /> verify
        </button>
        <button data-testid="run-skill-btn" onClick={() => onRunStage("skill")} className="btn-ghost inline-flex items-center gap-2">
          <Sparkles size={14} /> compile skill
        </button>
        <div className="flex-1" />
        <input ref={branchInput} className="bg-black/40 border border-white/10 rounded-full px-4 py-2 text-xs w-[260px] outline-none focus:border-[var(--acid)]/50" placeholder="new goal for branch…" />
        <button data-testid="branch-btn" onClick={() => onBranch(branchInput.current?.value)} className="btn-ghost inline-flex items-center gap-2">
          <GitBranch size={14} /> branch
        </button>
      </motion.div>
    </motion.div>
  );
}
