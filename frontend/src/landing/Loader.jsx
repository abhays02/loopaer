import React, { useEffect, useMemo, useRef, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { EXPO, INOUT } from "./shared";

const OVERLINE = "LOOPAER // COMMAND CENTER";
const WORDMARK = "LOOPAER";

/*
 * Arrival choreography (design_guidelines.json landing_motion_spec.loading_sequence):
 * 0ms    overline typewriter, 14ms per glyph
 * 250ms  wordmark letters mask-reveal, 40ms stagger
 * 600ms  1px acid rule draws left to right
 * 900ms  veil lifts while the page reveals underneath
 * 1200ms loader unmounts
 * Tap anywhere to skip. Reduced motion collapses to a 300ms fade.
 */
export default function Loader({ onLift, onDone }) {
  const reduced = useReducedMotion();
  const [typedCount, setTypedCount] = useState(0);
  const [wordmarkIn, setWordmarkIn] = useState(false);
  const [ruleIn, setRuleIn] = useState(false);
  const [lifting, setLifting] = useState(false);
  const timersRef = useRef([]);

  const schedule = useMemo(
    () => (fn, ms) => {
      const id = window.setTimeout(fn, ms);
      timersRef.current.push(id);
    },
    []
  );

  useEffect(() => {
    const timers = timersRef.current;
    if (reduced) {
      setTypedCount(OVERLINE.length);
      setWordmarkIn(true);
      setRuleIn(true);
      schedule(() => {
        setLifting(true);
        onLift();
      }, 300);
      schedule(onDone, 600);
      return () => timers.forEach(clearTimeout);
    }

    let i = 0;
    const typer = window.setInterval(() => {
      i += 1;
      setTypedCount(i);
      if (i >= OVERLINE.length) window.clearInterval(typer);
    }, 14);
    timers.push(typer);

    schedule(() => setWordmarkIn(true), 250);
    schedule(() => setRuleIn(true), 600);
    schedule(() => {
      setLifting(true);
      onLift();
    }, 900);
    schedule(onDone, 1250);

    return () => {
      timers.forEach(clearTimeout);
      window.clearInterval(typer);
    };
  }, [reduced, schedule, onLift, onDone]);

  const skip = () => {
    if (lifting) return;
    timersRef.current.forEach(clearTimeout);
    setTypedCount(OVERLINE.length);
    setWordmarkIn(true);
    setRuleIn(true);
    setLifting(true);
    onLift();
    window.setTimeout(onDone, 260);
  };

  return (
    <m.div
      className="lc-loader-veil flex items-center"
      role="status"
      aria-label="Loading Loopaer command center"
      onClick={skip}
      initial={{ opacity: 1 }}
      animate={{ opacity: lifting ? 0 : 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-10">
        <p className="lc-caption tracking-[0.24em] uppercase text-white/45 min-h-[1.2em]">
          {OVERLINE.slice(0, typedCount)}
          {typedCount < OVERLINE.length && !reduced ? <span className="lc-caret ml-1" /> : null}
        </p>
        <div className="mt-5 overflow-hidden" aria-hidden="true">
          <div className="flex">
            {WORDMARK.split("").map((ch, i) => (
              <span key={i} className="block overflow-hidden">
                <m.span
                  className="block font-grotesk font-extrabold text-[clamp(2.5rem,6vw,4.5rem)] leading-none tracking-[-0.03em] text-white"
                  initial={{ y: "100%" }}
                  animate={wordmarkIn ? { y: "0%" } : undefined}
                  transition={reduced ? { duration: 0.2 } : { duration: 0.5, delay: i * 0.04, ease: EXPO }}
                >
                  {ch}
                </m.span>
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 h-px w-full max-w-[280px] bg-white/10 overflow-hidden">
          <m.div
            className="h-full bg-[#D4FF00]"
            style={{ transformOrigin: "left" }}
            initial={{ scaleX: 0 }}
            animate={ruleIn ? { scaleX: 1 } : undefined}
            transition={reduced ? { duration: 0.2 } : { duration: 0.6, ease: INOUT }}
          />
        </div>
      </div>
    </m.div>
  );
}
