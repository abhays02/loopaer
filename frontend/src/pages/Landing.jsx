import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../lib/api";
import { ArrowRight, Sparkles, Cpu, Layers, Zap } from "lucide-react";

const SUGGESTIONS = [
  "Vision-language models for OCR on low-resource languages",
  "State-of-the-art retrieval augmented generation architectures",
  "Autonomous agents for scientific literature review",
  "Diffusion transformer benchmarks vs UNet",
  "Latest developments in mixture-of-experts routing",
];

export default function Landing() {
  const [goal, setGoal] = useState("");
  const [model, setModel] = useState("openrouter/free");
  const [models, setModels] = useState([]);
  const [busy, setBusy] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const nav = useNavigate();

  useEffect(() => {
    api.listModels().then((r) => {
      setModels(r.models || []);
      if (r.default) setModel(r.default);
    }).catch(() => {});
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % SUGGESTIONS.length), 3500);
    return () => clearInterval(t);
  }, []);

  const launch = async () => {
    if (!goal.trim()) return;
    setBusy(true);
    try {
      const s = await api.createSession(goal.trim(), model);
      toast.success("Runtime ignited", { description: `${s.id.slice(0, 14)}…` });
      nav(`/runtime/${s.id}`, { state: { autostart: true } });
    } catch (e) {
      toast.error("Failed to create session", { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="relative min-h-screen w-full overflow-hidden"
      style={{ zIndex: 2 }}
    >
      {/* Ambient blobs */}
      <motion.div
        className="pointer-events-none absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(212,255,0,0.15), transparent 70%)", filter: "blur(60px)" }}
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(0,229,255,0.12), transparent 70%)", filter: "blur(80px)" }}
        animate={{ x: [0, -40, 0], y: [0, 30, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Nav */}
      <div className="relative z-10 flex items-center justify-between px-10 pt-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[var(--acid)] flex items-center justify-center">
            <div className="w-3 h-3 rounded-sm bg-black" />
          </div>
          <div className="font-display text-lg tracking-tight">LUMEN</div>
          <div className="label-tag mt-1 hidden sm:block">runtime · v0.1</div>
        </div>
        <div className="flex items-center gap-6 text-sm text-white/60 font-mono">
          <a data-hover className="hover:text-white transition-colors" href="#loops">loops</a>
          <a data-hover className="hover:text-white transition-colors" href="#philosophy">philosophy</a>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full live-pulse" />
            <span className="label-tag !text-[var(--acid)]">online</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative z-10 px-10 pt-24 max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="label-tag mb-6"
        >
          — event-driven autonomous research
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-[clamp(56px,10vw,144px)] leading-[0.88] tracking-[-0.04em] font-medium"
        >
          The runtime <br/>
          <span className="font-serif italic text-white/70">that thinks</span> <br/>
          <span className="text-[var(--acid)]">in loops.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35 }}
          className="mt-10 max-w-[640px] text-white/60 leading-relaxed"
        >
          Not a chatbot. Not an IDE. A cognitive operating environment where autonomous
          research loops continuously discover, verify, organize and compile knowledge
          into portable AI skills — while you watch every step happen.
        </motion.p>

        {/* Goal input */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55 }}
          className="mt-14 glass rounded-2xl p-3 pr-3 flex items-center gap-3 max-w-[820px]"
          data-testid="landing-goal-container"
        >
          <div className="pl-4 text-white/40"><Sparkles size={18} /></div>
          <input
            data-testid="landing-goal-input"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && launch()}
            placeholder={SUGGESTIONS[placeholderIdx]}
            className="flex-1 bg-transparent outline-none text-white text-lg font-mono py-4 placeholder:text-white/30"
          />
          <select
            data-testid="landing-model-select"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-full text-xs px-3 py-2 text-white/80 font-mono"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}{m.tier === "free" ? " · free" : ""}</option>
            ))}
          </select>
          <button data-testid="landing-launch-btn" onClick={launch} disabled={busy || !goal.trim()} className="btn-acid disabled:opacity-40 flex items-center gap-2">
            {busy ? "igniting…" : (<><span>launch</span><ArrowRight size={16} /></>)}
          </button>
        </motion.div>

        {/* Suggestion chips */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.6 }}
          className="mt-6 flex flex-wrap gap-2 max-w-[820px]"
        >
          {SUGGESTIONS.slice(0, 4).map((s, i) => (
            <button
              key={i}
              onClick={() => setGoal(s)}
              className="text-xs font-mono px-3 py-1.5 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-[var(--acid)]/50 transition-colors"
            >
              {s}
            </button>
          ))}
        </motion.div>
      </div>

      {/* Loop preview strip */}
      <div id="loops" className="relative z-10 mt-40 px-10 pb-32">
        <div className="label-tag mb-6">→ eight loops · one runtime</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Cpu, name: "Planner", desc: "Understand → question → estimate → plan" },
            { icon: Zap, name: "Research", desc: "arXiv · GitHub · continuous discovery" },
            { icon: Layers, name: "Verification", desc: "Confidence + contradiction detection" },
            { icon: Sparkles, name: "Skill Builder", desc: "Verified research → portable skill" },
            { icon: Cpu, name: "Gap Detection", desc: "What is missing? Loop again." },
            { icon: Zap, name: "Knowledge Graph", desc: "Every concept becomes a node." },
            { icon: Layers, name: "Memory", desc: "Cumulative · never forgotten." },
            { icon: Sparkles, name: "Replay", desc: "Scrub cognition like video." },
          ].map((l, i) => (
            <motion.div
              key={l.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 + i * 0.05, duration: 0.5 }}
              whileHover={{ y: -3 }}
              className="panel rounded-xl p-5 group cursor-default"
            >
              <l.icon size={16} className="text-[var(--acid)] mb-3" />
              <div className="font-display text-lg tracking-tight">{l.name}</div>
              <div className="text-xs text-white/50 mt-2 leading-relaxed">{l.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Philosophy footer */}
      <div id="philosophy" className="relative z-10 px-10 pb-24 max-w-[1100px]">
        <div className="label-tag mb-4">philosophy</div>
        <div className="font-display text-[clamp(28px,4vw,52px)] leading-[1.05] tracking-tight text-white/85">
          The UI is a visualization of <span className="italic font-serif text-white/50">cognition</span>. <br />
          Loops emit events. Events choose renderers. Nothing is static.
        </div>
        <div className="mt-10 text-xs text-white/40 font-mono">
          © 2026 Lumen Runtime — open, event-driven, plugin-first.
        </div>
      </div>
    </motion.div>
  );
}
