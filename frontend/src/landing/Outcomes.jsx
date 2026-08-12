import React, { useEffect, useState } from "react";
import { m, useMotionValue, useTransform, animate, useReducedMotion } from "framer-motion";
import { Reveal, EXPO } from "./shared";
import { platform, FALLBACK_OUTCOMES } from "../lib/platform";

const STATEMENTS = [
  "Mornings start sorted. The overnight queue is already triaged, routed, and waiting on decisions instead of attention.",
  "Handoffs stop being a relay of screenshots. Each run carries its own context, evidence, and event record.",
  "Leadership sees the transformation as a live system — stages, throughput, and blockers — not a quarterly anecdote.",
];

function CountUp({ value, start }) {
  const reduced = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => Math.round(v).toString());
  useEffect(() => {
    if (!start) return undefined;
    if (reduced) {
      mv.set(value);
      return undefined;
    }
    const controls = animate(mv, value, { duration: 1.2, ease: EXPO });
    return () => controls.stop();
  }, [start, value, reduced, mv]);
  return <m.span>{text}</m.span>;
}

function MetricBar({ metric, index, started }) {
  const reduced = useReducedMotion();
  const max = Math.max(metric.baseline, metric.current);
  const baseW = (metric.baseline / max) * 100;
  const curW = (metric.current / max) * 100;
  return (
    <div className="border-b border-white/[0.06] py-6 first:pt-0 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-grotesk font-medium text-sm text-white/80">{metric.label}</p>
        <p className="font-datamono text-[0.6875rem] tracking-[0.1em] text-white/40">
          {metric.direction === "down" ? "LOWER IS BETTER" : "HIGHER IS BETTER"}
        </p>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <m.div
              className="h-full rounded-full bg-white/25"
              initial={{ width: reduced ? `${baseW}%` : "0%" }}
              whileInView={{ width: `${baseW}%` }}
              viewport={{ once: true, amount: 0.6 }}
              transition={reduced ? { duration: 0.2 } : { duration: 0.9, ease: EXPO }}
            />
          </div>
          <p className="lc-caption mt-1.5">
            BEFORE — {metric.baseline} {metric.unit}
          </p>
        </div>
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <m.div
              className="h-full rounded-full bg-[#D4FF00]"
              initial={{ width: reduced ? `${curW}%` : "0%" }}
              whileInView={{ width: `${curW}%` }}
              viewport={{ once: true, amount: 0.6 }}
              transition={reduced ? { duration: 0.2 } : { duration: 1.1, delay: 0.15, ease: EXPO }}
            />
          </div>
          <p className="lc-caption mt-1.5 text-white/70">
            WITH LOOPAER — <span className="text-[#D4FF00]"><CountUp value={metric.current} start={started} /></span>{" "}
            {metric.unit}
          </p>
        </div>
      </div>
      <p className="mt-3 text-[0.8125rem] leading-relaxed text-white/40">{metric.note}</p>
    </div>
  );
}

export default function Outcomes() {
  const [outcomes, setOutcomes] = useState(FALLBACK_OUTCOMES.outcomes);
  const [barsInView, setBarsInView] = useState(false);
  const barsRef = React.useRef(null);

  useEffect(() => {
    platform
      .outcomes()
      .then((d) => setOutcomes(d.outcomes))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!barsRef.current) return undefined;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setBarsInView(true);
        io.disconnect();
      }
    }, { threshold: 0.25 });
    io.observe(barsRef.current);
    return () => io.disconnect();
  }, []);

  return (
    <section id="outcomes" className="lc-anchor relative py-20 lg:py-40">
      <div className="mx-auto grid max-w-[1200px] gap-14 px-6 md:px-10 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <Reveal>
            <p className="lc-overline mb-5">04 — Outcomes</p>
            <h2 className="lc-section-title">{outcomes.headline}</h2>
          </Reveal>
          <div className="mt-10 space-y-8">
            {STATEMENTS.map((line, i) => (
              <Reveal key={line} delay={i * 0.08}>
                <div className="flex gap-5">
                  <span className="mt-2 h-px w-8 flex-none bg-[#D4FF00]" aria-hidden="true" />
                  <p className="font-grotesk font-medium text-lg leading-relaxed text-white/80 md:text-xl">{line}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5">
          <Reveal delay={0.1}>
            <div ref={barsRef} className="lc-card p-6 md:p-8">
              <p className="lc-caption uppercase tracking-[0.2em] text-white/35">Demo figures</p>
              <div className="mt-4">
                {outcomes.metrics.map((metric, i) => (
                  <MetricBar key={metric.id} metric={metric} index={i} started={barsInView} />
                ))}
              </div>
              <p className="mt-6 border-t border-white/[0.08] pt-4 font-datamono text-[0.625rem] leading-relaxed tracking-[0.04em] text-white/35">
                {outcomes.framing}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
