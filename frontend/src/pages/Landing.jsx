import React, { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../lib/api";
import LoopScene from "../components/LoopScene";
import { ArrowRight, ArrowUpRight } from "lucide-react";

const SUGGESTIONS = [
  "vision-language models for OCR",
  "retrieval augmented generation architectures",
  "autonomous agents for literature review",
  "diffusion transformers vs UNet",
];

export default function Landing() {
  const [goal, setGoal] = useState("");
  const [model, setModel] = useState("openrouter/free");
  const [models, setModels] = useState([]);
  const [busy, setBusy] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const nav = useNavigate();

  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const heroScale = useTransform(scrollYProgress, [0, 0.25], [1, 0.9]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.4]);

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
      toast.success("Runtime ignited");
      nav(`/runtime/${s.id}`, { state: { autostart: true } });
    } catch (e) {
      toast.error("Failed", { description: e?.message });
    } finally { setBusy(false); }
  };

  return (
    <div ref={containerRef} className="relative min-h-screen w-full bg-[var(--ink)] overflow-x-hidden">
      {/* Warm ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(217,255,77,0.06) 0%, transparent 60%), " +
            "radial-gradient(ellipse 50% 40% at 100% 60%, rgba(127,220,255,0.05) 0%, transparent 60%)",
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 grain" />

      {/* NAV */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="fixed top-0 left-0 right-0 z-40 backdrop-blur-2xl bg-[var(--ink)]/40 border-b border-white/[0.06]"
      >
        <div className="max-w-[1440px] mx-auto flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
            <Mark />
            <div className="font-display text-[17px] tracking-tight text-[var(--ivory)]">Loopaer</div>
          </div>
          <div className="hidden md:flex items-center gap-9 text-[13px] text-[var(--ivory)]/60 font-display">
            <a data-hover className="hover:text-[var(--ivory)] transition-colors" href="#runtime">Runtime</a>
            <a data-hover className="hover:text-[var(--ivory)] transition-colors" href="#loops">Loops</a>
            <a data-hover className="hover:text-[var(--ivory)] transition-colors" href="#skills">Skills</a>
            <a data-hover className="hover:text-[var(--ivory)] transition-colors" href="#philosophy">Philosophy</a>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[var(--ivory)]/50">
              <span className="w-1.5 h-1.5 rounded-full live-pulse" /> online
            </div>
          </div>
        </div>
      </motion.div>

      {/* HERO — one focal point, massive whitespace */}
      <motion.section
        style={{ scale: heroScale, opacity: heroOpacity }}
        className="relative z-10 min-h-[100vh] flex flex-col items-center justify-center px-6 pt-20"
      >
        {/* 3D scene fills the background */}
        <div className="absolute inset-0 top-16">
          <LoopScene />
        </div>

        {/* Content sits over the scene */}
        <div className="relative z-10 max-w-[1200px] w-full pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="label-tag text-center mb-10"
          >
            LOOPAER · V0.1 · COGNITIVE RUNTIME
          </motion.div>

          <motion.h1
            className="display-hero text-center text-[var(--ivory)]"
            style={{ fontSize: "clamp(60px, 10vw, 148px)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 60, filter: "blur(20px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1.1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              Think in
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 60, filter: "blur(20px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1.1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="font-serif italic text-[var(--ivory)]/80"
            >
              loops.
            </motion.div>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.9 }}
            className="mt-10 text-center text-[var(--ivory)]/60 text-[19px] leading-relaxed max-w-[560px] mx-auto font-display"
          >
            A cognitive operating environment.
            Autonomous research loops that discover, verify, and compile knowledge —
            live, event-driven, entirely yours.
          </motion.p>
        </div>

        {/* CTA sits at bottom of hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.1 }}
          className="relative z-10 mt-16 w-full max-w-[720px] pointer-events-auto"
        >
          <div className="glass-strong rounded-[20px] p-2.5 flex items-center gap-2">
            <input
              data-testid="landing-goal-input"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && launch()}
              placeholder={"Ask anything · " + SUGGESTIONS[placeholderIdx]}
              className="flex-1 bg-transparent outline-none text-[var(--ivory)] text-[15px] font-display px-4 py-3 placeholder:text-[var(--ivory)]/35"
            />
            <select
              data-testid="landing-model-select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-white/[0.04] border border-white/8 rounded-full text-[11px] px-3 py-2 text-[var(--ivory)]/80 font-mono outline-none"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{m.tier === "free" ? " · free" : ""}</option>
              ))}
            </select>
            <button
              data-testid="landing-launch-btn"
              onClick={launch}
              disabled={busy || !goal.trim()}
              className="btn-primary disabled:opacity-40 flex items-center gap-2 text-[13px]"
            >
              {busy ? "…" : (<><span>Launch</span><ArrowRight size={15} /></>)}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => setGoal(s)}
                className="text-[11px] font-mono px-2.5 py-1 rounded-full text-[var(--ivory)]/45 hover:text-[var(--ivory)] hover:bg-white/[0.04] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-6 text-center label-tag pointer-events-none">↓ scroll · drag scene to explore</div>
        </motion.div>
      </motion.section>

      {/* SECTION 2 — Runtime */}
      <Section id="runtime" eyebrow="RUNTIME" title={<>Event-driven <em className="font-serif italic text-[var(--ivory)]/60">by design.</em></>}
        body="Every loop emits events. Every event chooses its own renderer. The interface is a live visualization of cognition — no static pages, no pre-rendered dashboards."
      />

      {/* SECTION 3 — Loops */}
      <section id="loops" className="relative z-10 py-40 px-6">
        <div className="max-w-[1440px] mx-auto">
          <div className="label-tag mb-6">EIGHT LOOPS · ONE RUNTIME</div>
          <h2 className="display-hero text-[var(--ivory)] mb-16" style={{ fontSize: "clamp(40px, 6vw, 88px)" }}>
            Every step of thinking, <em className="font-serif italic text-[var(--ivory)]/60">visible.</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {LOOP_CARDS.map((l, i) => (
              <LoopCard key={l.name} loop={l} idx={i} />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — Skills */}
      <Section id="skills" eyebrow="COMPILE" title={<>Research becomes <em className="font-serif italic text-[var(--ivory)]/60">skills.</em></>}
        body="Verified knowledge is compiled into portable AI Skills — a system prompt, workflow, tools, tests, and failure modes. Export to Claude, MCP, or your own agent."
      />

      {/* SECTION 5 — Philosophy */}
      <section id="philosophy" className="relative z-10 py-40 px-6 border-t border-white/[0.06]">
        <div className="max-w-[1000px] mx-auto text-center">
          <div className="label-tag mb-6">PHILOSOPHY</div>
          <h2 className="display-hero text-[var(--ivory)] leading-[1.02]" style={{ fontSize: "clamp(36px, 5vw, 76px)" }}>
            The UI is a visualization of <em className="font-serif italic text-[var(--ivory)]/55">cognition.</em>
            <br /> Loops emit. Events render. <br />
            <span className="text-[var(--acid)]">Nothing static.</span>
          </h2>
          <div className="mt-16 text-[13px] font-mono text-[var(--ivory)]/40">
            © 2026 LOOPAER · runtime for autonomous reasoning
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============ Section subcomponent ============ */

function Section({ id, eyebrow, title, body }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.4, 1, 1, 0.4]);
  return (
    <section id={id} ref={ref} className="relative z-10 min-h-[80vh] flex items-center px-6 py-40">
      <motion.div style={{ y, opacity }} className="max-w-[1200px] mx-auto w-full">
        <div className="label-tag mb-6">{eyebrow}</div>
        <h2 className="display-hero text-[var(--ivory)] leading-[0.98]" style={{ fontSize: "clamp(48px, 8vw, 120px)" }}>
          {title}
        </h2>
        <p className="mt-10 text-[19px] leading-relaxed text-[var(--ivory)]/60 max-w-[620px] font-display">
          {body}
        </p>
      </motion.div>
    </section>
  );
}

/* ============ Loop cards ============ */

const LOOP_CARDS = [
  { name: "Planner", body: "Understands your goal, generates questions, produces a typed pipeline with cost, time and confidence estimates." },
  { name: "Research", body: "Continuously discovers papers and repositories from arXiv and GitHub, extracting facts, entities, and gaps." },
  { name: "Verification", body: "Cross-checks every claim against sources with a confidence score and a verdict — supported, contested, unsupported." },
  { name: "Skill Builder", body: "Compiles verified research into a portable AI skill with prompt, workflow, tools, tests, and failure modes." },
  { name: "Gap Detection", body: "Asks the runtime what important information is still missing — and loops again." },
  { name: "Knowledge Graph", body: "Every discovered concept becomes a node. Nothing is isolated." },
  { name: "Memory", body: "Verified knowledge archives across sessions. Every future project starts smarter." },
  { name: "Replay", body: "Scrub through your session like a video. Branch from any historical moment with a new objective." },
];

function LoopCard({ loop, idx }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="glass rounded-[22px] p-7 relative overflow-hidden group cursor-default h-full"
    >
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[11px] font-mono text-[var(--acid)]">{String(idx + 1).padStart(2, "0")}</span>
        <span className="w-8 h-px bg-[var(--ivory)]/20" />
      </div>
      <div className="font-display text-[22px] tracking-tight text-[var(--ivory)] mb-3">{loop.name}</div>
      <div className="text-[13px] leading-relaxed text-[var(--ivory)]/55 font-display">{loop.body}</div>
      <ArrowUpRight size={16} className="absolute top-6 right-6 text-[var(--ivory)]/20 group-hover:text-[var(--acid)] group-hover:rotate-45 transition-all duration-300" />
    </motion.div>
  );
}

/* ============ Logo Mark ============ */

function Mark() {
  return (
    <div className="relative w-8 h-8">
      <motion.svg
        viewBox="0 0 32 32"
        className="w-full h-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="16" cy="16" r="14" fill="none" stroke="var(--ivory)" strokeOpacity="0.25" strokeWidth="1" />
        <circle cx="16" cy="16" r="10" fill="none" stroke="var(--acid)" strokeWidth="1.5" strokeDasharray="14 8" />
        <circle cx="16" cy="16" r="4" fill="var(--acid)" />
      </motion.svg>
    </div>
  );
}
