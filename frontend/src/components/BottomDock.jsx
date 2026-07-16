import React, { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { Play, Pause, Zap, GitBranch, ChevronDown, Cpu, Search, ShieldCheck, Sparkles } from "lucide-react";

const STAGES = [
  { id: "plan",     icon: Cpu,        label: "Plan",     color: "var(--acid)" },
  { id: "research", icon: Search,     label: "Research", color: "var(--cyan)" },
  { id: "verify",   icon: ShieldCheck,label: "Verify",   color: "var(--amber)" },
  { id: "skill",    icon: Sparkles,   label: "Skill",    color: "var(--acid)" },
];

/** dock.cool-style magnifying icon. Its size grows as the mouse gets close. */
function DockIcon({ mouseX, children, label, onClick, testid, activeColor }) {
  const ref = useRef(null);
  const distance = useTransform(mouseX, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - (rect.x + rect.width / 2);
  });
  const widthT = useTransform(distance, [-140, 0, 140], [46, 82, 46]);
  const width = useSpring(widthT, { stiffness: 260, damping: 22 });
  const yT = useTransform(distance, [-140, 0, 140], [0, -14, 0]);
  const y = useSpring(yT, { stiffness: 260, damping: 22 });

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      data-testid={testid}
      style={{ width, height: width, y }}
      className="relative flex items-center justify-center rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/8 backdrop-blur-md transition-colors group shrink-0"
      whileTap={{ scale: 0.92 }}
    >
      <div className="text-white" style={{ color: activeColor }}>{children}</div>
      <motion.span
        initial={{ opacity: 0, y: 4 }}
        whileHover={{ opacity: 1, y: 0 }}
        className="absolute -top-8 text-[10px] font-mono uppercase tracking-wider text-white/80 whitespace-nowrap bg-black/70 px-2 py-1 rounded-md border border-white/10 pointer-events-none"
      >
        {label}
      </motion.span>
    </motion.button>
  );
}

export default function BottomDock({ session, models, anyRunning, onRunStage, onBranch, onSelectModel, onPauseAll, onResumeAll }) {
  const [modelOpen, setModelOpen] = useState(false);
  const [branchInput, setBranchInput] = useState("");
  const mouseX = useMotionValue(Infinity);

  const currentModelName = models.find((m) => m.id === session?.model)?.name || session?.model?.split("/")[1] || "…";

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 22 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      data-testid="bottom-dock"
    >
      {/* Reflection base */}
      <div
        className="absolute inset-x-6 -bottom-4 h-8 rounded-full opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(212,255,0,0.25), transparent 70%)", filter: "blur(12px)" }}
      />
      {/* Main dock */}
      <motion.div
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="relative flex items-end gap-2 px-4 py-3 rounded-[28px] glass-strong"
        style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.5)" }}
      >
        {/* Pipeline stage magnifying icons */}
        {STAGES.map((s) => (
          <DockIcon key={s.id} mouseX={mouseX} label={s.label} testid={`dock-run-${s.id}`} onClick={() => onRunStage(s.id)} activeColor={s.color}>
            <s.icon size={20} />
          </DockIcon>
        ))}

        {/* Divider */}
        <div className="w-px h-12 bg-white/12 mx-1 self-center" />

        {/* Play / pause all */}
        <DockIcon mouseX={mouseX} label={anyRunning ? "pause all" : "resume"} testid={anyRunning ? "dock-pause-all" : "dock-resume-all"}
          onClick={anyRunning ? onPauseAll : onResumeAll}
          activeColor={anyRunning ? "var(--amber)" : "var(--acid)"}
        >
          {anyRunning ? <Pause size={20} /> : <Play size={20} />}
        </DockIcon>

        <div className="w-px h-12 bg-white/12 mx-1 self-center" />

        {/* Model switcher (glass pill, not magnifying) */}
        <div className="relative self-center">
          <button
            data-testid="dock-model-switcher"
            onClick={() => setModelOpen(!modelOpen)}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[11px] font-mono border border-white/10 hover:border-[var(--acid)]/50 hover:bg-white/[0.04] transition-all"
          >
            <Zap size={12} className="text-[var(--acid)]" />
            <span className="text-white/90">{currentModelName}</span>
            <ChevronDown size={11} className={`transition-transform text-white/50 ${modelOpen ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {modelOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className="absolute bottom-full right-0 mb-3 glass-strong rounded-2xl p-2 w-[280px] max-h-[340px] overflow-y-auto thin-scroll"
              >
                <div className="label-tag px-3 pb-2 pt-1 sticky top-0 bg-transparent">select model</div>
                {models.map((m) => (
                  <button
                    key={m.id}
                    data-testid={`model-option-${m.id.replace(/[^a-z0-9]/gi, "-")}`}
                    onClick={() => { onSelectModel && onSelectModel(m.id); setModelOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-[11px] transition-all flex items-center justify-between ${
                      m.id === session?.model
                        ? "bg-[var(--acid)]/10 text-[var(--acid)] border border-[var(--acid)]/30"
                        : "hover:bg-white/8 text-white/85 border border-transparent"
                    }`}
                  >
                    <span className="truncate">{m.name}</span>
                    <span className="text-[9px] uppercase tracking-wider text-white/40 shrink-0 ml-2">{m.tier}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-px h-12 bg-white/12 mx-1 self-center" />

        {/* Branch input + button */}
        <div className="flex items-center gap-2 self-center">
          <input
            data-testid="dock-branch-input"
            value={branchInput}
            onChange={(e) => setBranchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { onBranch(branchInput.trim() || undefined); setBranchInput(""); } }}
            placeholder="new objective…"
            className="bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-[11px] w-[200px] outline-none focus:border-[var(--cyan)]/50 font-mono placeholder:text-white/30"
          />
          <DockIcon mouseX={mouseX} label="branch" testid="dock-branch-btn"
            onClick={() => { onBranch(branchInput.trim() || undefined); setBranchInput(""); }}
            activeColor="var(--cyan)"
          >
            <GitBranch size={20} />
          </DockIcon>
        </div>
      </motion.div>
    </motion.div>
  );
}
