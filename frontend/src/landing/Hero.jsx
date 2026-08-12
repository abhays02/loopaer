import React, { useEffect, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { MaskedLines, Magnetic, CornerBrackets, EXPO } from "./shared";

const HeroScene = React.lazy(() => import("./HeroScene"));

function canRender3D() {
  if (typeof window === "undefined") return false;
  if (!window.matchMedia("(pointer: fine)").matches) return false;
  if (window.innerWidth < 1024) return false;
  if (navigator.deviceMemory && navigator.deviceMemory < 4) return false;
  return true;
}

function Typewriter({ text, start, speed = 18, className }) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return undefined;
    if (reduced) {
      setCount(text.length);
      return undefined;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [start, text, speed, reduced]);
  return (
    <p className={className} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, count)}</span>
    </p>
  );
}

function OrbitRingSVG() {
  const reduced = useReducedMotion();
  return (
    <svg
      viewBox="0 0 400 400"
      className="w-full max-w-[420px] opacity-60"
      aria-hidden="true"
      style={reduced ? undefined : { animation: "lc-spin 40s linear infinite" }}
    >
      <style>{`@keyframes lc-spin { to { transform: rotate(360deg); } }`}</style>
      <g style={{ transformOrigin: "200px 200px" }}>
        <circle cx="200" cy="200" r="150" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <circle cx="200" cy="200" r="150" fill="none" stroke="#D4FF00" strokeWidth="1" strokeDasharray="40 660" strokeLinecap="round" />
        <circle cx="200" cy="200" r="104" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="2 6" />
        <circle cx="200" cy="200" r="104" fill="none" stroke="#00E5FF" strokeWidth="1" strokeDasharray="24 630" strokeLinecap="round" opacity="0.5" />
        {["Intake", "Plan", "Connect", "Reason", "Verify", "Deliver"].map((label, i) => {
          const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const x = 200 + Math.cos(angle) * 150;
          const y = 200 + Math.sin(angle) * 150;
          return (
            <g key={label}>
              <circle cx={x} cy={y} r="3" fill={i === 0 ? "#D4FF00" : "rgba(255,255,255,0.4)"} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export default function Hero({ booted, health }) {
  const reduced = useReducedMotion();
  const [sceneReady, setSceneReady] = useState(false);
  const [render3D, setRender3D] = useState(false);

  useEffect(() => {
    if (!booted) return undefined;
    setRender3D(canRender3D());
    const idle = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 300));
    const id = idle(() => setSceneReady(true), { timeout: 2000 });
    return () => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : window.clearTimeout(id));
  }, [booted]);

  const statusLine = `SYS // NOMINAL · ORCHESTRATION ENGINE ${
    health && health.engine === "online" ? "ONLINE" : "STANDBY"
  } · EVENT STREAM LIVE · STORAGE: ${health && health.storage ? health.storage.toUpperCase() : "DETECTING"}`;

  return (
    <section id="top" className="relative flex min-h-[100vh] lg:min-h-[100svh] flex-col justify-center overflow-hidden pt-24 pb-16">
      <div className="absolute -right-28 top-1/3 w-[320px] opacity-20 lg:hidden" aria-hidden="true">
        <OrbitRingSVG />
      </div>
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-6 md:px-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative z-10">
          <m.p
            className="lc-overline mb-5"
            initial={{ opacity: 0 }}
            animate={booted ? { opacity: 1 } : undefined}
            transition={{ duration: reduced ? 0.3 : 0.6, delay: reduced ? 0 : 0.1, ease: EXPO }}
          >
            Enterprise AI transformation
          </m.p>

          <h1 className="lc-display">
            <MaskedLines
              booted={booted}
              delay={reduced ? 0 : 0.15}
              lines={[
                "Every system.",
                <>
                  One <span className="lc-acid">command</span>
                </>,
                "center. Zero blind spots.",
              ]}
            />
          </h1>

          <m.p
            className="lc-intro mt-6"
            initial={{ opacity: 0, y: reduced ? 0 : 16 }}
            animate={booted ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.6, delay: reduced ? 0 : 0.45, ease: EXPO }}
          >
            Loopaer orchestrates planning, connection, reasoning, and verification across the
            systems you already run — and shows you every step as it happens. No black boxes,
            no faith-based automation.
          </m.p>

          <m.div
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={{ opacity: 0, y: reduced ? 0 : 16 }}
            animate={booted ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.6, delay: reduced ? 0 : 0.6, ease: EXPO }}
          >
            <Magnetic>
              <a href="#intelligence" className="lc-btn-primary w-full sm:w-auto">
                Watch the pipeline run
              </a>
            </Magnetic>
            <a href="#use-cases" className="lc-btn-ghost w-full sm:w-auto">
              Explore use cases
            </a>
          </m.div>
        </div>

        <div className="relative hidden items-center justify-center lg:flex" aria-hidden="true">
          <CornerBrackets className="flex h-[420px] w-full items-center justify-center rounded-2xl border border-white/[0.06] bg-[rgba(10,10,10,0.35)]">
            {render3D && sceneReady ? (
              <React.Suspense fallback={<OrbitRingSVG />}>
                <HeroScene />
              </React.Suspense>
            ) : (
              <OrbitRingSVG />
            )}
          </CornerBrackets>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 lg:bottom-8">
        <div className="mx-auto max-w-[1200px] px-6 md:px-10">
          <Typewriter
            className="lc-status-ticker"
            text={statusLine}
            start={booted && !reduced ? true : booted}
            speed={14}
          />
        </div>
      </div>
    </section>
  );
}
