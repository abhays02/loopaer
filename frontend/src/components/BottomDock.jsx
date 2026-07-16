import React, { useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Zap, GitBranch, ChevronDown } from "lucide-react";

export default function BottomDock({ session, models, anyRunning, onRunStage, onBranch, onPauseAll, onResumeAll }) {
  const [modelOpen, setModelOpen] = useState(false);
  const [branchInput, setBranchInput] = useState("");

  const currentModelName = models.find((m) => m.id === session?.model)?.name || session?.model?.split("/")[1] || "…";

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 22 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-strong rounded-full px-3 py-2 flex items-center gap-2"
      style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)" }}
      data-testid="bottom-dock"
    >
      {/* pipeline stages */}
      <div className="flex items-center gap-1 pr-2 border-r border-white/10">
        <button
          data-testid="dock-run-plan"
          onClick={() => onRunStage("plan")}
          className="text-[11px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-full hover:bg-white/8 transition-colors"
        >Plan</button>
        <button
          data-testid="dock-run-research"
          onClick={() => onRunStage("research")}
          className="text-[11px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-full hover:bg-white/8 transition-colors"
        >Research</button>
        <button
          data-testid="dock-run-verify"
          onClick={() => onRunStage("verify")}
          className="text-[11px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-full hover:bg-white/8 transition-colors"
        >Verify</button>
        <button
          data-testid="dock-run-skill"
          onClick={() => onRunStage("skill")}
          className="text-[11px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-full hover:bg-white/8 transition-colors"
        >Skill</button>
      </div>

      {/* play/pause all */}
      <div className="flex items-center gap-1 px-2 border-r border-white/10">
        {anyRunning ? (
          <button data-testid="dock-pause-all" onClick={onPauseAll} className="w-9 h-9 rounded-full bg-[var(--amber)]/15 hover:bg-[var(--amber)]/25 text-[var(--amber)] flex items-center justify-center transition-colors">
            <Pause size={14} />
          </button>
        ) : (
          <button data-testid="dock-resume-all" onClick={onResumeAll} className="w-9 h-9 rounded-full bg-[var(--acid)]/15 hover:bg-[var(--acid)]/25 text-[var(--acid)] flex items-center justify-center transition-colors">
            <Play size={14} />
          </button>
        )}
      </div>

      {/* model switcher */}
      <div className="relative">
        <button
          data-testid="dock-model-switcher"
          onClick={() => setModelOpen(!modelOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono border border-white/10 hover:border-[var(--acid)]/40 transition-colors"
        >
          <Zap size={11} className="text-[var(--acid)]" />
          <span>{currentModelName}</span>
          <ChevronDown size={11} className={`transition-transform ${modelOpen ? "rotate-180" : ""}`} />
        </button>
        {modelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute bottom-full right-0 mb-2 glass-strong rounded-xl p-2 w-[260px] max-h-[300px] overflow-y-auto thin-scroll"
          >
            <div className="label-tag px-2 pb-2">select model</div>
            {models.map((m) => (
              <button
                key={m.id}
                onClick={() => { /* model selection is planned per-session; keep as visual for now */ setModelOpen(false); }}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] hover:bg-white/8 transition-colors flex items-center justify-between ${m.id === session?.model ? "text-[var(--acid)]" : "text-white/80"}`}
              >
                <span>{m.name}</span>
                <span className="text-[9px] uppercase tracking-wider text-white/40">{m.tier}</span>
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* branch */}
      <div className="flex items-center gap-1 pl-2 border-l border-white/10">
        <input
          data-testid="dock-branch-input"
          value={branchInput}
          onChange={(e) => setBranchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { onBranch(branchInput.trim() || undefined); setBranchInput(""); } }}
          placeholder="new objective…"
          className="bg-black/40 border border-white/10 rounded-full px-3 py-1.5 text-[11px] w-[180px] outline-none focus:border-[var(--cyan)]/50"
        />
        <button data-testid="dock-branch-btn" onClick={() => { onBranch(branchInput.trim() || undefined); setBranchInput(""); }} className="w-9 h-9 rounded-full bg-[var(--cyan)]/15 hover:bg-[var(--cyan)]/25 text-[var(--cyan)] flex items-center justify-center transition-colors">
          <GitBranch size={14} />
        </button>
      </div>
    </motion.div>
  );
}
