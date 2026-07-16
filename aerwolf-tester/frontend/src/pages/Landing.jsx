import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useAuth } from "../lib/auth";
import {
  ArrowRight, Sparkles, GitBranch, FileCode2, BookOpen, Zap,
  AlertTriangle, CheckCircle2, Cpu, Layers, Play, Eye,
  Boxes, ScanText, Brain, GitMerge, ChevronDown, MousePointer2,
} from "lucide-react";
import { DiffusedBackdrop, ScrollPipeline, AlgoComparisonRace, StackShowcase } from "../components/LandingVisuals";
import ScorePromptWidget from "../components/ScorePromptWidget";

const ROTATING = ["OCR", "RAG", "Vision Transformers", "Diffusion", "HTR", "Attention", "Speech", "Agents"];
const NODE_ICONS = [Boxes, Layers, ScanText, Brain, GitMerge];
const NODE_LABELS = ["Input", "Preprocess", "Detection", "Recognition", "Postprocess"];
const NODE_ALGOS = ["JPEG/PNG", "CLAHE", "DBNet", "CRNN", "NMS + CTC"];

export default function Landing() {
  const { user } = useAuth();
  const [rotIdx, setRotIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setRotIdx((i) => (i + 1) % ROTATING.length), 1800);
    return () => clearInterval(t);
  }, []);

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="relative overflow-hidden liquid-glass">
      {/* Diffused algorithm-frame video-like backdrop (Landing only) */}
      <div className="absolute inset-x-0 top-0 h-[130vh]">
        <DiffusedBackdrop opacity={0.55} />
      </div>
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      {/* ============ HERO ============ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 pt-20 sm:pt-28 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 pill px-3 py-1.5 mb-8"
          >
            <Sparkles size={12} className="text-[color:var(--brand)]" />
            <span className="text-[12px] font-medium text-white/85">Built for <span className="text-[color:var(--brand)]">agents</span> · not chatbots</span>
          </motion.div>

          <h1 className="font-display text-[44px] sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02] mb-6">
            <motion.span initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="block">
              LLMs hallucinate.
            </motion.span>
            <motion.span initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="block">
              <span className="text-[color:var(--brand)]">Pipelines don&apos;t.</span>
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
            className="max-w-2xl mx-auto text-[15px] sm:text-lg text-[color:var(--text-secondary)] leading-relaxed mb-2"
          >
            One prompt to an LLM is a lottery. A decomposed <span className="text-white">architecture</span> — separate files,
            typed nodes, ranked algorithms per step — makes agents <span className="text-white">verifiable</span> and
            <span className="text-white"> reproducible</span>.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
            className="max-w-2xl mx-auto text-[14px] text-[color:var(--text-tertiary)] mb-10"
          >
            AERwolf is where you design that architecture · for{" "}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-[color:var(--surface-200)] border border-[color:var(--border-strong)]">
              <motion.span key={rotIdx} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="text-[color:var(--brand)] font-mono text-[13px]">
                {ROTATING[rotIdx]}
              </motion.span>
            </span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {user ? (
              <Link to="/dashboard" data-testid="landing-cta-dashboard" className="btn-primary inline-flex items-center gap-2">
                Open dashboard <ArrowRight size={14} />
              </Link>
            ) : (
              <button data-testid="landing-cta-login" onClick={handleLogin} className="btn-primary inline-flex items-center gap-2">
                Start building <ArrowRight size={14} />
              </button>
            )}
            <a href="#demo" className="btn-ghost inline-flex items-center gap-2">
              <Play size={12} /> See it work
            </a>
          </motion.div>

          {/* Live counters */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }} className="mt-12 flex flex-wrap justify-center gap-6 sm:gap-10 text-center">
            <Counter to={24000} suffix="+" label="papers indexed" />
            <Counter to={20} suffix="" label="seeded animations" />
            <Counter to={10} suffix="" label="LLM models" />
            <Counter to={5} suffix="" label="data sources" />
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 0.8, y: [0, 8, 0] }}
            transition={{ opacity: { delay: 1.4 }, y: { duration: 1.6, repeat: Infinity } }}
            className="mt-16 flex flex-col items-center gap-2 text-[10px] tracking-[0.35em] uppercase text-[color:var(--text-tertiary)]"
            data-testid="landing-scroll-cue"
          >
            <MousePointer2 size={12} />
            Scroll to see the pipeline
            <ChevronDown size={12} />
          </motion.div>
        </motion.div>
      </section>

      {/* ============ SCROLL PIPELINE ============ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 py-16">
        <SectionEyebrow>How research becomes a runnable pipeline</SectionEyebrow>
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-4 max-w-3xl">
          One scroll · one thread of causality.
        </h2>
        <p className="text-[color:var(--text-secondary)] max-w-2xl mb-4">
          Every AERwolf skill goes through the same five stages. Scroll to trace how a fuzzy idea becomes a typed, cited, deterministic pipeline your agent can execute.
        </p>
        <ScrollPipeline stages={[
          { eyebrow: "01 · search",    title: "Query five sources in parallel", body: "arXiv, Semantic Scholar, Papers-with-Code, GitHub awesome-lists — all fanned out from one topic.", example: "GET /api/search?topic=OCR → 24 papers · 10 awesome-lists" },
          { eyebrow: "02 · synthesise", title: "STORM multi-perspective report",   body: "Grounded citations, key open problems, contradictions the field glosses over.", example: "POST /api/storm/report → perspectives × 3 → cited article" },
          { eyebrow: "03 · sketch",     title: "Design the graph on canvas",         body: "Drop typed nodes (input · preprocess · detection · recognition · postprocess). Draw edges. Click a node.", example: "5 nodes · 4 edges · everything inspectable" },
          { eyebrow: "04 · rank",       title: "AlgoFinder → TechFinder",             body: "Two-stage GenUI: pick the algorithm first (popularity + rating + latency), then swap the implementation tech.", example: "DBNet → PaddleOCR · CRNN → ncnn C++" },
          { eyebrow: "05 · ship",       title: "Export SKILL.md",                     body: "YAML front-matter + markdown body. Executable by any agent framework: Claude, GPT, Gemini, or your local Ollama.", example: "aerwolf export → skill.md · 100% verifiable" },
        ]} />
      </section>

      {/* ============ ALGORITHM COMPARISON ============ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 py-16">
        <SectionEyebrow>Head-to-head</SectionEyebrow>
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-8 max-w-3xl">
          Every algorithm gets ranked. <span className="text-[color:var(--text-tertiary)]">You choose the trade-off.</span>
        </h2>
        <div className="grid lg:grid-cols-2 gap-4">
          <AlgoComparisonRace
            accent="var(--data-cyan)"
            title="OCR detection · which one for your document?"
            items={[
              { name: "DBNet",  note: "text regions · robust to noise",  axes: [{ label: "acc", value: 92, pct: 92 }, { label: "lat", value: "38ms", pct: 62 }, { label: "vram", value: "1.4G", pct: 40 }, { label: "★", value: "43k", pct: 88 }] },
              { name: "CRAFT",  note: "character-region attention",       axes: [{ label: "acc", value: 89, pct: 89 }, { label: "lat", value: "55ms", pct: 45 }, { label: "vram", value: "1.8G", pct: 55 }, { label: "★", value: "3.2k", pct: 30 }] },
              { name: "YOLO-v9", note: "bbox detector · repurposed",       axes: [{ label: "acc", value: 78, pct: 78 }, { label: "lat", value: "18ms", pct: 92 }, { label: "vram", value: "2.1G", pct: 68 }, { label: "★", value: "51k", pct: 95 }] },
            ]}
          />
          <AlgoComparisonRace
            accent="var(--data-amber)"
            title="LLM recognition · text-in-image transformers"
            items={[
              { name: "TrOCR",       note: "seq2seq · high accuracy",   axes: [{ label: "acc", value: 94, pct: 94 }, { label: "lat", value: "120ms", pct: 20 }, { label: "vram", value: "3.4G", pct: 74 }, { label: "★", value: "8.1k", pct: 62 }] },
              { name: "CRNN",        note: "CTC · fast · classic",      axes: [{ label: "acc", value: 85, pct: 85 }, { label: "lat", value: "22ms", pct: 88 }, { label: "vram", value: "0.8G", pct: 24 }, { label: "★", value: "12k", pct: 70 }] },
              { name: "SVTR",        note: "single-scan · balanced",    axes: [{ label: "acc", value: 91, pct: 91 }, { label: "lat", value: "32ms", pct: 70 }, { label: "vram", value: "1.1G", pct: 34 }, { label: "★", value: "5.6k", pct: 48 }] },
            ]}
          />
        </div>
      </section>

      {/* ============ STACK MARQUEE ============ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 py-16">
        <StackShowcase stacks={[
          { name: "PaddleOCR", lang: "Py", stars: 43 },
          { name: "ncnn", lang: "C++", stars: 20 },
          { name: "ONNX Runtime", lang: "C++/Py", stars: 15 },
          { name: "TensorRT", lang: "C++", stars: 11 },
          { name: "PyTorch", lang: "Py", stars: 82 },
          { name: "timm", lang: "Py", stars: 32 },
          { name: "Hugging Face", lang: "Py", stars: 130 },
          { name: "Ollama", lang: "Go", stars: 92 },
          { name: "LM Studio", lang: "TS", stars: 4 },
          { name: "vLLM", lang: "Py", stars: 33 },
          { name: "sglang", lang: "Py", stars: 8 },
        ]} />
      </section>

      {/* ============ SCORE-YOUR-PROMPT (Interactive marketing hook) ============ */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 py-16">
        <SectionEyebrow>Live demo</SectionEyebrow>
        <ScorePromptWidget />
      </section>

      {/* ============ THE PROBLEM  vs THE FIX ============ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 py-16">
        <SectionEyebrow>The problem</SectionEyebrow>
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-10 max-w-3xl">
          A single prompt is a black box. <span className="text-[color:var(--text-tertiary)]">Every retry, a different answer.</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <HallucinationDemo variant="bare" />
          <HallucinationDemo variant="pipeline" />
        </div>
      </section>

      {/* ============ LIVE PIPELINE DEMO ============ */}
      <section id="demo" className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 py-16">
        <SectionEyebrow>Sample · a real OCR pipeline</SectionEyebrow>
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-4 max-w-3xl">
          Five typed nodes. One coral thread of truth.
        </h2>
        <p className="text-[color:var(--text-secondary)] max-w-2xl mb-10">
          Watch data flow through a real OCR pipeline. Each node has a role, an algorithm, a tech stack, and — because you can inspect them — you know when they lie.
        </p>

        <PipelineDemo />
      </section>

      {/* ============ FOUR FEATURES ============ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 py-16">
        <SectionEyebrow>How AERwolf works</SectionEyebrow>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {[
            { icon: Zap, label: "Search × 5", detail: "arXiv · Semantic Scholar · Papers-with-Code · GitHub · in parallel." },
            { icon: BookOpen, label: "Notebook", detail: "Markdown + sources + STORM multi-perspective grounded report." },
            { icon: GitBranch, label: "Canvas", detail: "Two-stage AlgoFinder → TechFinder. Watch each algorithm run." },
            { icon: FileCode2, label: "SKILL.md", detail: "Export YAML + markdown. Drop into any agent framework." },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              data-testid={`feature-tile-${i}`}
              className="glass glass-hover p-5"
            >
              <f.icon size={16} className="text-[color:var(--brand)] mb-3" />
              <div className="text-[13px] font-semibold text-white mb-1">{f.label}</div>
              <div className="text-[12px] text-[color:var(--text-secondary)] leading-relaxed">{f.detail}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 py-24 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            Stop <span className="text-[color:var(--brand)]">re-prompting</span>. Start <span className="text-[color:var(--brand)]">architecting</span>.
          </h2>
          <p className="text-[color:var(--text-secondary)] mb-8">
            Every agent you ship deserves a diagram, a stack, a paper trail. AERwolf gives you all three in one canvas.
          </p>
          {user ? (
            <Link to="/dashboard" className="btn-primary inline-flex items-center gap-2">
              Open dashboard <ArrowRight size={14} />
            </Link>
          ) : (
            <button onClick={handleLogin} className="btn-primary inline-flex items-center gap-2">
              Sign in with Google <ArrowRight size={14} />
            </button>
          )}
        </motion.div>
      </section>
    </div>
  );
}

// ============ Sub-components ============

function SectionEyebrow({ children }) {
  return (
    <div className="inline-flex items-center gap-2 mb-5">
      <span className="w-6 h-[1px] bg-[color:var(--brand)]" />
      <span className="text-[11px] tracking-[0.25em] uppercase font-medium text-[color:var(--brand)]">{children}</span>
    </div>
  );
}

function Counter({ to, label, suffix = "" }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.floor(v).toLocaleString());
  useEffect(() => { const c = animate(mv, to, { duration: 1.8, delay: 0.4, ease: "easeOut" }); return c.stop; }, [mv, to]);
  return (
    <div>
      <motion.div className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
        <motion.span>{rounded}</motion.span>{suffix}
      </motion.div>
      <div className="text-[11px] tracking-widest uppercase text-[color:var(--text-tertiary)] mt-1">{label}</div>
    </div>
  );
}

function HallucinationDemo({ variant }) {
  const bare = variant === "bare";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className={`glass p-5 relative overflow-hidden ${bare ? "" : "border-[color:var(--brand)]/40"}`}
    >
      <div className="flex items-center gap-2 mb-3">
        {bare
          ? <AlertTriangle size={14} className="text-[#ff4a4a]" />
          : <CheckCircle2 size={14} className="text-[color:var(--brand)]" />}
        <span className={`text-[10px] tracking-[0.3em] uppercase font-bold ${bare ? "text-[#ff4a4a]" : "text-[color:var(--brand)]"}`}>
          {bare ? "One shot to LLM" : "Architected pipeline"}
        </span>
      </div>

      <div className="font-mono text-[11px] leading-relaxed space-y-2">
        {bare ? (
          <>
            <div className="text-white/80"><span className="text-[color:var(--text-tertiary)]">$</span> agent.chat(<span className="text-[color:var(--brand)]">&quot;extract text from image&quot;</span>)</div>
            <RollingLine values={[
              "→ 'The document says: Hello World'",
              "→ 'The image contains a form dated 2019'",
              "→ 'Cannot see the image'",
              "→ 'Text: [hallucinated content]'",
            ]} />
            <div className="text-[color:var(--text-tertiary)] mt-3 text-[10px]">Non-deterministic · unverifiable · no citations</div>
          </>
        ) : (
          <>
            <div className="text-white/80"><span className="text-[color:var(--text-tertiary)]">$</span> agent.run(<span className="text-[color:var(--brand)]">skill.md</span>)</div>
            <div className="text-white/60">→ preprocess: <span className="text-[color:var(--brand)]">CLAHE</span> (opencv)</div>
            <div className="text-white/60">→ detection: <span className="text-[color:var(--brand)]">DBNet</span> (ncnn)</div>
            <div className="text-white/60">→ recognition: <span className="text-[color:var(--brand)]">CRNN</span> + CTC</div>
            <div className="text-white/60">→ postprocess: <span className="text-[color:var(--brand)]">Sauvola</span> NMS</div>
            <div className="text-white/95 mt-2">✓ output = &quot;INVOICE #4211 · $3,190&quot;</div>
            <div className="text-[color:var(--text-tertiary)] mt-3 text-[10px]">Deterministic · every node inspectable · fully cited</div>
          </>
        )}
      </div>

      {/* Bottom hallucination meter */}
      <div className="mt-4 pt-3 border-t border-[color:var(--border-strong)]">
        <div className="flex items-center justify-between text-[10px] tracking-widest uppercase text-[color:var(--text-tertiary)] mb-1">
          <span>hallucination risk</span>
          <span className={bare ? "text-[#ff4a4a]" : "text-[color:var(--brand)]"}>{bare ? "82%" : "9%"}</span>
        </div>
        <div className="h-1 bg-[color:var(--surface-200)] overflow-hidden rounded-full">
          <motion.div
            initial={{ width: 0 }} whileInView={{ width: bare ? "82%" : "9%" }} viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className={`h-full ${bare ? "bg-[#ff4a4a]" : "bg-[color:var(--brand)]"}`}
          />
        </div>
      </div>
    </motion.div>
  );
}

function RollingLine({ values }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((v) => (v + 1) % values.length), 2000); return () => clearInterval(t); }, [values.length]);
  return (
    <div className="h-[18px] overflow-hidden relative">
      <motion.div key={i} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.4 }}
        className="text-white/70 absolute inset-0"
      >{values[i]}</motion.div>
    </div>
  );
}

function PipelineDemo() {
  return (
    <div className="glass p-5 sm:p-8 relative overflow-hidden">
      {/* Pipeline flow */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap md:flex-nowrap mb-8">
        {NODE_LABELS.map((label, i) => {
          const Icon = NODE_ICONS[i];
          return (
            <React.Fragment key={i}>
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                data-testid={`landing-pipeline-node-${i}`}
                className="flex-1 min-w-[130px] bg-[color:var(--surface-100)] border border-[color:var(--border-strong)] rounded-[12px] p-3 hover:border-[color:var(--brand)] transition-colors"
              >
                <div className="w-7 h-7 rounded-[6px] bg-[color:var(--surface-200)] flex items-center justify-center mb-2">
                  <Icon size={14} className="text-[color:var(--brand)]" />
                </div>
                <div className="text-[11px] tracking-widest uppercase text-[color:var(--text-tertiary)]">{label}</div>
                <div className="text-[13px] font-semibold text-white mt-1">{NODE_ALGOS[i]}</div>
              </motion.div>
              {i < NODE_LABELS.length - 1 && (
                <ArrowFlow />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Educational strip */}
      <div className="grid md:grid-cols-3 gap-4 text-[12px] mt-6">
        <div className="border border-[color:var(--border-strong)] rounded-[8px] p-3">
          <div className="flex items-center gap-1.5 mb-1"><Cpu size={12} className="text-[color:var(--brand)]" /><span className="text-[10px] tracking-widest uppercase text-[color:var(--brand)]">Node</span></div>
          <div className="text-white/85 leading-relaxed">Each stage is a typed function with clear I/O — swap the algorithm without touching neighbours.</div>
        </div>
        <div className="border border-[color:var(--border-strong)] rounded-[8px] p-3">
          <div className="flex items-center gap-1.5 mb-1"><Eye size={12} className="text-[color:var(--brand)]" /><span className="text-[10px] tracking-widest uppercase text-[color:var(--brand)]">Inspectable</span></div>
          <div className="text-white/85 leading-relaxed">Click any node → live algorithm ranking + hyperframe animation + distill.pub references.</div>
        </div>
        <div className="border border-[color:var(--border-strong)] rounded-[8px] p-3">
          <div className="flex items-center gap-1.5 mb-1"><FileCode2 size={12} className="text-[color:var(--brand)]" /><span className="text-[10px] tracking-widest uppercase text-[color:var(--brand)]">SKILL.md</span></div>
          <div className="text-white/85 leading-relaxed">Export the whole pipeline as YAML + markdown any agent (Claude, GPT, Gemini, local Ollama) can execute.</div>
        </div>
      </div>
    </div>
  );
}

function ArrowFlow() {
  return (
    <div className="hidden md:flex items-center relative w-8">
      <div className="w-full h-[1px] bg-[color:var(--border-strong)] relative overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 h-full w-4 bg-gradient-to-r from-transparent via-[color:var(--brand)] to-transparent"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
}
