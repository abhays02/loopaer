import React, { useEffect, useMemo, useState } from "react";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import { Reveal } from "./shared";
import { platform, FALLBACK_USE_CASES } from "../lib/platform";

export default function UseCases() {
  const reduced = useReducedMotion();
  const [data, setData] = useState(FALLBACK_USE_CASES);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    platform
      .useCases()
      .then(setData)
      .catch(() => {});
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? data.use_cases : data.use_cases.filter((u) => u.function === filter)),
    [data, filter]
  );

  return (
    <section id="use-cases" className="lc-anchor relative py-20 lg:py-40">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <Reveal>
          <p className="lc-overline mb-5">03 — Use-case library</p>
          <h2 className="lc-section-title max-w-[24ch]">Where teams start their first run.</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="lc-intro mt-6">
            Six starting points across four functions, each one shaped around work that already
            happens in your estate. Pick a lane, open a card, read how the run would walk.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="lc-chip-scroll mt-10 lg:flex-wrap" role="group" aria-label="Filter use cases by function">
            <button type="button" className="lc-chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
              All functions
            </button>
            {data.functions.map((fn) => (
              <button key={fn} type="button" className="lc-chip" aria-pressed={filter === fn} onClick={() => setFilter(fn)}>
                {fn}
              </button>
            ))}
          </div>
        </Reveal>

        <m.div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {visible.map((uc) => {
              const open = expanded === uc.id;
              return (
                <m.article
                  key={uc.id}
                  className="lc-card p-6 md:p-7"
                  data-interactive="true"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                  transition={reduced ? { duration: 0.2 } : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="font-datamono text-[0.625rem] uppercase tracking-[0.2em] text-[#00E5FF]">
                    {uc.function} · value in {uc.time_to_value}
                  </p>
                  <h3 className="mt-3 font-grotesk font-extrabold text-lg leading-snug tracking-tight text-white">{uc.title}</h3>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/55">{uc.summary}</p>

                  <AnimatePresence initial={false}>
                    {open && (
                      <m.div
                        key="detail"
                        initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                        exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={reduced ? { duration: 0.2 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="mt-4 border-t border-white/[0.08] pt-4 text-[0.875rem] leading-relaxed text-white/65">
                          {uc.narrative}
                        </p>
                        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Signals this run reads">
                          {uc.signals.map((sig) => (
                            <li key={sig} className="rounded-full border border-white/10 px-3 py-1.5 font-datamono text-[0.625rem] tracking-[0.08em] text-white/45">
                              {sig}
                            </li>
                          ))}
                        </ul>
                      </m.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="button"
                    className="mt-5 inline-flex min-h-[44px] items-center gap-2 font-datamono text-[0.6875rem] uppercase tracking-[0.18em] text-white/60 transition-colors duration-200 hover:text-[#D4FF00]"
                    aria-expanded={open}
                    onClick={() => setExpanded(open ? null : uc.id)}
                  >
                    {open ? "Close" : "Read the run"}
                    <m.span
                      aria-hidden="true"
                      animate={{ rotate: open ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="inline-block text-[#D4FF00]"
                    >
                      +
                    </m.span>
                  </button>
                </m.article>
              );
            })}
          </AnimatePresence>
        </m.div>
      </div>
    </section>
  );
}
