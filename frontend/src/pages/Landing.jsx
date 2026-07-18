import React, { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, animate as animateFm } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../lib/api";
import HeroLoopViz from "../components/HeroLoopViz";
import LoopMiniViz from "../components/LoopMiniViz";
import { ArrowRight, Sparkles, Cpu, Layers, Zap, ArrowUpRight, Radio, Activity } from "lucide-react";

const SUGGESTIONS = [
  "vision-language models for OCR on low-resource languages",
  "retrieval augmented generation architectures",
  "autonomous agents for scientific literature review",
  "diffusion transformer benchmarks vs UNet",
  "mixture-of-experts routing developments",
];

const CHARS = "!<>-_\\/[]{}—=+*^?#________";

/** Scramble text animator — cycles through random chars before locking in. */
function useScramble(target, delay = 0) {
  const [out, setOut] = useState(target);
  const rafRef = useRef();
  useEffect(() => {
    let frame = 0;
    const start = performance.now() + delay;
    const duration = 700;
    const step = (now) => {
      if (now < start) { rafRef.current = requestAnimationFrame(step); return; }
      const p = Math.min(1, (now - start) / duration);
      const locked = Math.floor(p * target.length);
      let str = target.slice(0, locked);
      for (let i = locked; i < target.length; i++) {
        if (target[i] === " ") str += " ";
        else str += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      setOut(str);
      frame++;
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else setOut(target);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, delay]);
  return out;
}

/** Animated big number counter — re-runs periodically so it feels alive. */
function Counter({ to, duration = 1.8 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const c = animateFm(0, to, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => !cancelled && setVal(Math.floor(v)) });
      return c;
    };
    const c = run();
    // Every ~9s, briefly dip and recount so the numbers feel live
    const interval = setInterval(() => {
      animateFm(to, Math.max(0, to - 2), { duration: 0.35, onUpdate: (v) => !cancelled && setVal(Math.floor(v)) }).then(() => {
        animateFm(Math.max(0, to - 2), to, { duration: 0.9, ease: "easeOut", onUpdate: (v) => !cancelled && setVal(Math.floor(v)) });
      });
    }, 9000);
    return () => { cancelled = true; c?.stop?.(); clearInterval(interval); };
  }, [to, duration]);
  return <>{val.toLocaleString()}</>;
}

/** Small live counter that ticks up and back down like a heart rate. */
function LivePing() {
  const [n, setN] = useState(3);
  useEffect(() => {
    const t = setInterval(() => setN((v) => 1 + Math.floor(Math.random() * 6)), 1300);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular-nums">{n} active</span>;
}

/** Cycles through a list of words with a typewriter effect. Continuous. */
function TypeCycle({ words }) {
  const [wIdx, setWIdx] = useState(0);
  const [txt, setTxt] = useState("");
  const [phase, setPhase] = useState("type"); // type | hold | erase
  useEffect(() => {
    let t;
    const target = words[wIdx];
    if (phase === "type") {
      if (txt.length < target.length) {
        t = setTimeout(() => setTxt(target.slice(0, txt.length + 1)), 55 + Math.random() * 60);
      } else {
        t = setTimeout(() => setPhase("hold"), 1400);
      }
    } else if (phase === "hold") {
      t = setTimeout(() => setPhase("erase"), 200);
    } else {
      if (txt.length > 0) {
        t = setTimeout(() => setTxt(target.slice(0, txt.length - 1)), 35);
      } else {
        setPhase("type");
        setWIdx((i) => (i + 1) % words.length);
      }
    }
    return () => clearTimeout(t);
  }, [txt, phase, wIdx, words]);
  return (
    <span className="tabular-nums">
      {txt}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.9, repeat: Infinity }}
        className="text-[var(--acid)]"
      >|</motion.span>
    </span>
  );
}

export default function Landing() {
  const [goal, setGoal] = useState("");
  const [model, setModel] = useState("openrouter/free");
  const [models, setModels] = useState([]);
  const [busy, setBusy] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const nav = useNavigate();

  // Mouse parallax
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const tx1 = useTransform(sx, (v) => v * 20);
  const ty1 = useTransform(sy, (v) => v * 20);
  const tx2 = useTransform(sx, (v) => v * -30);
  const ty2 = useTransform(sy, (v) => v * -30);

  useEffect(() => {
    api.listModels().then((r) => {
      setModels(r.models || []);
      if (r.default) setModel(r.default);
    }).catch(() => {});
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % SUGGESTIONS.length), 3200);
    const mv = (e) => {
      const w = window.innerWidth, h = window.innerHeight;
      mx.set((e.clientX - w / 2) / w);
      my.set((e.clientY - h / 2) / h);
    };
    window.addEventListener("mousemove", mv);
    return () => { clearInterval(t); window.removeEventListener("mousemove", mv); };
  }, [mx, my]);

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

  const sub1 = useScramble("EVENT-DRIVEN · LOOP-DRIVEN · COGNITION-DRIVEN", 300);
  const sub2 = useScramble("v0.1 — RUNTIME ONLINE", 1600);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="relative min-h-screen w-full overflow-x-hidden"
      style={{ zIndex: 2 }}
    >
      {/* Ambient parallax blobs */}
      <motion.div
        className="pointer-events-none absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(212,255,0,0.18), transparent 70%)", filter: "blur(60px)", x: tx1, y: ty1 }}
      />
      <motion.div
        className="pointer-events-none absolute top-1/3 -right-32 w-[620px] h-[620px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(0,229,255,0.14), transparent 70%)", filter: "blur(80px)", x: tx2, y: ty2 }}
      />

      {/* Nav */}
      <div className="relative z-10 flex items-center justify-between px-10 pt-8">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-8 h-8 rounded-md bg-[var(--acid)] flex items-center justify-center"
            animate={{ rotate: [0, 4, -4, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="w-3 h-3 rounded-sm bg-black" />
          </motion.div>
          <div className="font-display text-lg tracking-tight">LUMEN</div>
          <div className="label-tag mt-1 hidden sm:block">runtime · v0.1</div>
        </div>
        <div className="flex items-center gap-6 text-sm text-white/60 font-mono">
          <a data-hover className="hover:text-white transition-colors" href="#loops">loops</a>
          <a data-hover className="hover:text-white transition-colors" href="#numbers">runtime</a>
          <a data-hover className="hover:text-white transition-colors" href="#philosophy">philosophy</a>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full live-pulse" />
            <span className="label-tag !text-[var(--acid)]">online</span>
          </div>
        </div>
      </div>

      {/* HERO */}
      <div className="relative z-10 px-10 pt-16 max-w-[1500px] grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-10 items-start">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="label-tag mb-6 font-mono flex items-center gap-3"
          >
            <span className="w-1.5 h-1.5 rounded-full live-pulse" />
            {sub1}
          </motion.div>

        <h1 className="font-display text-[clamp(48px,8.5vw,124px)] leading-[0.86] tracking-[-0.04em] font-medium">
          <motion.div
            initial={{ opacity: 0, y: 60, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            The runtime
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 60, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif italic text-white/70"
          >
            that thinks
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 60, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="text-[var(--acid)] relative inline-block"
          >
            in loops.
            <motion.span
              className="absolute -right-16 top-4 text-[var(--acid)]"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" /></svg>
            </motion.span>
          </motion.div>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.75 }}
          className="mt-8 max-w-[600px] text-white/60 leading-relaxed font-mono text-sm"
        >
          Not a chatbot. Not an IDE. A cognitive operating environment where autonomous
          research loops continuously discover, verify, organize and compile knowledge
          into portable AI skills — while you watch every step happen.
        </motion.p>

        {/* Live system metrics ticker */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.8 }}
          className="mt-10 flex items-center gap-6 font-mono text-[11px] text-white/50"
        >
          <div className="flex items-center gap-2">
            <Radio size={12} className="text-[var(--acid)]" />
            <span>bus <motion.span
              className="text-white/90"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >live</motion.span></span>
          </div>
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-[var(--cyan)]" />
            <span>loops <span className="text-white/90"><LivePing /></span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/40">memory</span>
            <span className="text-white/90"><TypeCycle words={["indexed", "recalling", "archiving", "syncing"]} /></span>
          </div>
        </motion.div>

        {/* Goal input */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.95, type: "spring", stiffness: 150, damping: 20 }}
          whileHover={{ scale: 1.005 }}
          className="mt-10 glass-strong rounded-2xl p-3 pr-3 flex items-center gap-3 max-w-[720px] relative overflow-hidden"
          data-testid="landing-goal-container"
          style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)" }}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(105deg, transparent 40%, rgba(212,255,0,0.08) 50%, transparent 60%)" }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
          />
          <div className="pl-4 text-[var(--acid)] relative z-10">
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
              <Sparkles size={18} />
            </motion.div>
          </div>
          <input
            data-testid="landing-goal-input"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && launch()}
            placeholder={SUGGESTIONS[placeholderIdx]}
            className="flex-1 bg-transparent outline-none text-white text-lg font-mono py-4 placeholder:text-white/30 relative z-10"
          />
          <select
            data-testid="landing-model-select"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-full text-xs px-3 py-2 text-white/80 font-mono relative z-10"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}{m.tier === "free" ? " · free" : ""}</option>
            ))}
          </select>
          <button data-testid="landing-launch-btn" onClick={launch} disabled={busy || !goal.trim()} className="btn-acid disabled:opacity-40 flex items-center gap-2 relative z-10">
            {busy ? "igniting…" : (<><span>launch</span><ArrowRight size={16} /></>)}
          </button>
        </motion.div>

        {/* Suggestion chips */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-6 flex flex-wrap gap-2 max-w-[720px]"
        >
          {SUGGESTIONS.slice(0, 4).map((s, i) => (
            <motion.button
              key={i}
              whileHover={{ y: -2, backgroundColor: "rgba(212,255,0,0.08)" }}
              onClick={() => setGoal(s)}
              className="text-xs font-mono px-3 py-1.5 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-[var(--acid)]/50 transition-all lowercase"
            >
              → {s}
            </motion.button>
          ))}
        </motion.div>
        </div>

        {/* Hero illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.3, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative hidden lg:block h-[520px]"
        >
          <HeroLoopViz />
          <motion.div
            className="absolute -top-2 -left-2 label-tag !text-[var(--acid)] font-mono"
            animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
          >
            ▓ runtime · online
          </motion.div>
          <motion.div
            className="absolute bottom-4 right-4 label-tag font-mono text-white/40"
            animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
          >
            fps 60 · lat 12ms · ok
          </motion.div>
        </motion.div>
      </div>

      {/* MARQUEE strip */}
      <div className="relative z-10 mt-32 border-y border-white/6 py-6 overflow-hidden">
        <motion.div
          className="flex gap-16 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-16 items-center">
              {["Planner Loop", "Research Loop", "Verification Loop", "Skill Builder", "Knowledge Graph", "Memory Loop", "Gap Detection", "Replay Mode", "Plugin System", "Event Bus", "Loop Inspector", "Reasoning Tree"].map((t) => (
                <span key={t} className="font-display text-[42px] tracking-tight text-white/50 flex items-center gap-4">
                  {t} <span className="text-[var(--acid)]">✦</span>
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </div>

      {/* NUMBERS */}
      <div id="numbers" className="relative z-10 px-10 py-28 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-[1500px]">
        {[
          { n: 26, l: "event types" },
          { n: 8,  l: "loop kinds" },
          { n: 12, l: "models available" },
          { n: 0,  l: "pages · dynamic UI" },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="border-t border-white/12 pt-4"
          >
            <div className="font-display text-[clamp(56px,7vw,96px)] leading-none tracking-tight text-white">
              <Counter to={s.n} />
            </div>
            <div className="label-tag mt-4">{s.l}</div>
          </motion.div>
        ))}
      </div>

      {/* Loops grid */}
      <div id="loops" className="relative z-10 px-10 pb-32">
        <div className="label-tag mb-6">→ eight loops · one runtime</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Cpu, name: "Planner", desc: "understand → question → estimate → plan", viz: "plan" },
            { icon: Zap, name: "Research", desc: "arXiv · GitHub · continuous discovery", viz: "orbit" },
            { icon: Layers, name: "Verification", desc: "confidence + contradiction detection", viz: "bars" },
            { icon: Sparkles, name: "Skill Builder", desc: "verified research → portable skill", viz: "spark" },
            { icon: Cpu, name: "Gap Detection", desc: "what is missing? loop again.", viz: "pulse" },
            { icon: Zap, name: "Knowledge Graph", desc: "every concept becomes a node.", viz: "graph" },
            { icon: Layers, name: "Memory", desc: "cumulative · never forgotten.", viz: "stack" },
            { icon: Sparkles, name: "Replay", desc: "scrub cognition like video.", viz: "wave" },
          ].map((l, i) => (
            <motion.div
              key={l.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              whileHover={{ y: -4, borderColor: "rgba(212,255,0,0.4)" }}
              className="panel rounded-xl p-5 group cursor-default relative overflow-hidden min-h-[180px]"
            >
              <l.icon size={16} className="text-[var(--acid)] mb-3 relative z-10" />
              <div className="font-display text-lg tracking-tight relative z-10">{l.name}</div>
              <div className="text-xs text-white/50 mt-2 leading-relaxed lowercase font-mono relative z-10">{l.desc}</div>
              <ArrowUpRight size={14} className="absolute top-4 right-4 text-white/20 group-hover:text-[var(--acid)] transition-colors z-10" />
              <div className="absolute right-2 bottom-2 w-20 h-20 opacity-70 group-hover:opacity-100 transition-opacity">
                <LoopMiniViz kind={l.viz} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Philosophy */}
      <div id="philosophy" className="relative z-10 px-10 pb-24 max-w-[1200px]">
        <div className="label-tag mb-4">philosophy</div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="font-display text-[clamp(28px,4.2vw,56px)] leading-[1.05] tracking-tight text-white/85"
        >
          The UI is a visualization of <span className="italic font-serif text-white/50">cognition</span>. <br />
          Loops emit events. Events choose renderers. <br />
          <span className="text-[var(--acid)]">Nothing is static.</span>
        </motion.div>
        <div className="mt-10 text-xs text-white/40 font-mono">
          {sub2} · open · event-driven · plugin-first
        </div>
      </div>
    </motion.div>
  );
}
