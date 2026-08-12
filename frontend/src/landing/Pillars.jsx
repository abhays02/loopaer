import React, { useEffect, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { Reveal, Stagger } from "./shared";
import { platform, FALLBACK_PILLARS } from "../lib/platform";

const EVENT_WORDS = ["StageStarted", "StageProgress", "StageCompleted", "PipelineCompleted", "EventReplay", "RunCanceled"];

/* Pillar 0 — live ticker: event names cycle in mono */
function LiveTicker() {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (reduced) return undefined;
    const id = window.setInterval(() => setIdx((i) => (i + 1) % EVENT_WORDS.length), 1600);
    return () => window.clearInterval(id);
  }, [reduced]);
  return (
    <p className="font-datamono text-[0.6875rem] tracking-[0.14em] text-[#D4FF00]" aria-hidden="true">
      EVT // {EVENT_WORDS[idx]}
    </p>
  );
}

/* Pillar 1 — ring fill: a stroke ring sweeps on hover */
function GuardRing() {
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11" aria-hidden="true">
      <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <circle
        cx="22"
        cy="22"
        r="19"
        fill="none"
        stroke="#D4FF00"
        strokeWidth="1.5"
        strokeDasharray="119.4"
        strokeDashoffset="119.4"
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
        className="lc-ring-fill"
      />
      <circle cx="22" cy="22" r="3" fill="rgba(212,255,0,0.7)" />
    </svg>
  );
}

/* Pillar 2 — edge draw: the card border traces itself on hover */
function EdgeDrawFrame({ children }) {
  return (
    <div className="relative">
      {children}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <rect
          x="0.5"
          y="0.5"
          width="calc(100% - 1px)"
          height="calc(100% - 1px)"
          rx="16"
          fill="none"
          stroke="#D4FF00"
          strokeWidth="1"
          strokeDasharray="1400"
          strokeDashoffset="1400"
          className="lc-edge-draw"
        />
      </svg>
    </div>
  );
}

/* Pillar 3 — flip: tagline flips to a second reading on hover/focus */
function FlipLine({ a, b }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      className="block min-h-[44px] text-left font-datamono text-[0.6875rem] uppercase tracking-[0.16em] text-white/50"
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onFocus={() => setFlipped(true)}
      onBlur={() => setFlipped(false)}
      onClick={() => setFlipped((v) => !v)}
      aria-label="Reveal the short version"
    >
      {flipped ? b : a}
    </button>
  );
}

export default function Pillars() {
  const [pillars, setPillars] = useState(FALLBACK_PILLARS.pillars);
  useEffect(() => {
    platform
      .pillars()
      .then((d) => setPillars(d.pillars))
      .catch(() => {});
  }, []);

  return (
    <section id="pillars" className="lc-anchor relative py-20 lg:py-40">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-6 md:px-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <Reveal>
              <p className="lc-overline mb-5">02 — Why teams choose Loopaer</p>
              <h2 className="lc-section-title">
                Automation that
                <br />
                answers for itself.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="lc-intro mt-6">
                Four commitments shape everything the platform does. They are not marketing
                claims — each one is a mechanism you can inspect in the running system.
              </p>
            </Reveal>
          </div>
        </div>

        <Stagger className="grid gap-6 sm:grid-cols-2 lg:col-span-7" step={0.08}>
          {pillars.map((pillar, i) => {
            const offset = i % 2 === 1 ? "sm:translate-y-8" : "";
            const body = (
              <article className={`lc-card group h-full p-6 md:p-8 ${offset}`} data-interactive="true" data-pillar={i}>
                <div className="flex min-h-[44px] items-center justify-between">
                  <span className="font-datamono text-[0.6875rem] tracking-[0.2em] text-white/30">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {i === 0 && <LiveTicker />}
                  {i === 1 && <GuardRing />}
                </div>
                <h3 className="mt-4 font-grotesk font-black text-xl tracking-tight text-white">{pillar.title}</h3>
                <p className="mt-2 font-datamono text-[0.6875rem] uppercase tracking-[0.14em] text-[#D4FF00]/80">
                  {pillar.tagline}
                </p>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-white/55">{pillar.description}</p>
                <ul className="mt-5 space-y-2 border-t border-white/[0.06] pt-4">
                  {pillar.proof_points.map((pp) => (
                    <li key={pp} className="flex gap-2 font-datamono text-[0.6875rem] leading-relaxed text-white/40">
                      <span className="text-[#D4FF00]" aria-hidden="true">/</span>
                      {pp}
                    </li>
                  ))}
                </ul>
                {i === 3 && <div className="mt-4"><FlipLine a="HOVER — OR TAP — FOR THE SHORT VERSION" b="FAST ENOUGH TO MATTER. LEGIBLE ENOUGH TO TRUST." /></div>}
              </article>
            );
            return i === 2 ? <EdgeDrawFrame key={pillar.id}>{body}</EdgeDrawFrame> : <React.Fragment key={pillar.id}>{body}</React.Fragment>;
          })}
        </Stagger>
      </div>

      <style>{`
        .group:hover .lc-ring-fill, .group:focus-within .lc-ring-fill {
          stroke-dashoffset: 0;
          transition: stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1);
        }
        .group:hover .lc-edge-draw, .group:focus-within .lc-edge-draw {
          stroke-dashoffset: 0;
          transition: stroke-dashoffset 1.4s cubic-bezier(0.65,0,0.35,1);
        }
        @media (prefers-reduced-motion: reduce) {
          .group:hover .lc-ring-fill, .group:hover .lc-edge-draw { transition: none; }
        }
      `}</style>
    </section>
  );
}
