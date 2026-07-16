import React, { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { api } from "../lib/api";

/**
 * DiffusedBackdrop — cycles through 5 seeded SVG hyperframes (blurred, slow crossfade)
 * to create a video-like ambient loop on the Landing hero. Silent, uses cached content only.
 */
export function DiffusedBackdrop({ algorithm = "dbnet", opacity = 0.28 }) {
  const [frames, setFrames] = useState([]);
  const [i, setI] = useState(0);
  const timer = useRef();

  useEffect(() => {
    (async () => {
      try {
        const keys = ["dbnet", "diffusion", "attention", "unet"];
        const all = [];
        for (const k of keys) {
          try {
            const h = await api.get(`/hyperframes/public/${k}`);
            (h.data?.frames || []).forEach((f) => all.push(f.svg));
          } catch { /* skip */ }
        }
        setFrames(all);
      } catch { /* noop */ }
    })();
  }, []);

  useEffect(() => {
    if (frames.length === 0) return;
    timer.current = setInterval(() => setI((x) => (x + 1) % frames.length), 2400);
    return () => clearInterval(timer.current);
  }, [frames.length]);

  if (frames.length === 0) {
    // Fallback: pure CSS mesh (still cinematic)
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity }}>
        <div
          className="absolute inset-[-20%]"
          style={{
            background:
              "radial-gradient(700px circle at 20% 30%, rgba(255,99,99,0.35), transparent 50%)," +
              "radial-gradient(600px circle at 80% 40%, rgba(106,215,255,0.22), transparent 55%)," +
              "radial-gradient(800px circle at 50% 90%, rgba(255,184,106,0.20), transparent 55%)",
            filter: "blur(80px)",
            animation: "backdropShift 22s ease-in-out infinite alternate",
          }}
        />
        <style>{`@keyframes backdropShift { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(3%,-2%) scale(1.06)} }`}</style>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {frames.map((svg, idx) => (
        <div
          key={idx}
          className="absolute inset-0 transition-opacity duration-[1400ms]"
          style={{
            opacity: idx === i ? opacity : 0,
            filter: "blur(40px) saturate(1.4)",
            transform: "scale(1.4)",
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ))}
      {/* vignette on top */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at center, transparent 30%, rgba(7,8,10,0.85) 90%)" }} />
    </div>
  );
}

/**
 * ScrollPipeline — vertical pipeline that reveals stage-by-stage as user scrolls.
 * Data flows through as a moving coral particle.
 */
export function ScrollPipeline({ stages }) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "end start"] });
  const dotY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const lineFill = useTransform(scrollYProgress, [0, 0.9], ["0%", "100%"]);

  return (
    <div ref={containerRef} className="relative py-16">
      <div className="grid md:grid-cols-[80px_1fr] gap-8">
        {/* Vertical rail */}
        <div className="relative hidden md:block">
          <div className="sticky top-32 h-[520px] w-[2px] mx-auto bg-[color:var(--border-strong)] overflow-hidden">
            <motion.div className="w-full bg-[color:var(--brand)]" style={{ height: lineFill }} />
          </div>
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 top-32 w-3 h-3 rounded-full bg-[color:var(--brand)]"
            style={{ top: dotY, boxShadow: "0 0 16px rgba(255,99,99,0.9)" }}
          />
        </div>
        {/* Content column */}
        <div className="space-y-16">
          {stages.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              data-testid={`scroll-stage-${i}`}
              className="glass p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-[8px] bg-[color:var(--surface-200)] border border-[color:var(--border-strong)] flex items-center justify-center font-mono text-[11px] text-[color:var(--brand)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="text-[11px] tracking-widest uppercase text-[color:var(--text-tertiary)]">{s.eyebrow}</div>
                  <div className="text-lg font-semibold">{s.title}</div>
                </div>
              </div>
              <div className="text-[14px] text-[color:var(--text-secondary)] leading-relaxed">{s.body}</div>
              {s.example && (
                <div className="mt-3 border-t border-[color:var(--border-strong)] pt-3 font-mono text-[11px] text-white/85 leading-relaxed">
                  <span className="text-[color:var(--brand)]">→</span> {s.example}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * AlgoComparisonRace — animated head-to-head with morphing bars.
 * Renders 3 algorithms competing on 4 axes; bars animate on view.
 */
export function AlgoComparisonRace({ title, items, accent = "var(--brand)" }) {
  return (
    <div className="glass p-6">
      <div className="text-[11px] tracking-[0.3em] uppercase mb-1" style={{ color: accent }}>Comparison</div>
      <div className="font-display text-xl font-semibold mb-6">{title}</div>
      <div className="space-y-5">
        {items.map((it, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
          >
            <div className="flex items-center justify-between text-[13px] mb-2">
              <span className="font-mono text-white">{it.name}</span>
              <span className="text-[11px] text-[color:var(--text-tertiary)]">{it.note}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {it.axes.map((a, j) => (
                <div key={j}>
                  <div className="flex justify-between text-[9px] tracking-widest uppercase mb-0.5">
                    <span className="text-[color:var(--text-tertiary)]">{a.label}</span>
                    <span style={{ color: accent }}>{a.value}</span>
                  </div>
                  <div className="h-1 bg-[color:var(--surface-200)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${a.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.4, delay: 0.3 + j * 0.1, ease: "easeOut" }}
                      className="h-full"
                      style={{ background: accent }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/**
 * StackShowcase — animated marquee of tech-stack chips (Ollama, PyTorch, ncnn, etc.).
 */
export function StackShowcase({ stacks }) {
  return (
    <div className="glass p-6 relative overflow-hidden">
      <div className="text-[11px] tracking-[0.3em] uppercase text-[color:var(--brand)] mb-1">Tech stack</div>
      <div className="font-display text-xl font-semibold mb-5">Swap once. Re-benchmark.</div>
      <div className="relative overflow-hidden py-2 marquee-mask">
        <motion.div
          className="flex gap-3 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
        >
          {[...stacks, ...stacks].map((s, i) => (
            <div key={i} className="shrink-0 border border-[color:var(--border-strong)] rounded-[10px] px-3 py-2 text-[12px] font-mono flex items-center gap-2 hover:border-[color:var(--brand)] transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--brand)]" />
              <span className="text-white">{s.name}</span>
              <span className="text-[color:var(--text-tertiary)]">·</span>
              <span className="text-[color:var(--text-tertiary)]">{s.lang}</span>
              <span className="text-[color:var(--text-tertiary)]">·</span>
              <span className="text-[color:var(--brand)]">★{s.stars}k</span>
            </div>
          ))}
        </motion.div>
      </div>
      <style>{`
        .marquee-mask {
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
                  mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
        }
      `}</style>
    </div>
  );
}
