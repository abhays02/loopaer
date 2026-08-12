import React, { useEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { Reveal, CornerBrackets, EXPO } from "./shared";
import PipelineDiagram from "./PipelineDiagram";
import usePipelineRun from "./usePipelineRun";
import { platform, FALLBACK_CONNECTORS } from "../lib/platform";

function useInViewFlag(ref, threshold = 0.15) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return undefined;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref, threshold]);
  return inView;
}

const runCaption = {
  idle: "AWAITING FIRST RUN",
  starting: "OPENING RUN",
  running: "RUN IN PROGRESS",
  completed: "RUN COMPLETE",
  canceled: "RUN CANCELED",
};

export default function PipelineSection() {
  const reduced = useReducedMotion();
  const run = usePipelineRun();
  const sectionRef = useRef(null);
  const inView = useInViewFlag(sectionRef, 0.2);
  const [connectors, setConnectors] = useState(FALLBACK_CONNECTORS.connectors);

  useEffect(() => {
    platform
      .connectors()
      .then((d) => setConnectors(d.connectors))
      .catch(() => {});
  }, []);

  // Auto-run the pipeline the first time the section is seen
  const autoStarted = useRef(false);
  useEffect(() => {
    if (inView && !autoStarted.current && run.runState === "idle") {
      autoStarted.current = true;
      run.start();
    }
  }, [inView, run]);

  const activeStage = run.stages.find((s) => s.state === "active");
  const doneCount = run.stages.filter((s) => s.state === "done").length;
  const running = run.runState === "running" || run.runState === "starting";

  return (
    <section id="intelligence" ref={sectionRef} className="lc-anchor relative py-20 lg:py-32">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <div className="lg:grid lg:grid-cols-[0.85fr_1.6fr] lg:gap-12">
          {/* advancing text column */}
          <div className="mb-12 lg:mb-0">
            <Reveal>
              <p className="lc-overline mb-5">01 — Unified intelligence layer</p>
              <h2 className="lc-section-title">
                Six stages.
                <br />
                One visible thread.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="lc-intro mt-6">
                Every transformation run walks the same six stages — intake, plan, connect,
                reason, verify, deliver — and every stage reports itself as an event. This is
                the same stream the backend is emitting right now.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="mt-10 space-y-4">
                {run.stageMap.stages.map((stage, i) => {
                  const live = run.stages.find((s) => s.id === stage.id);
                  const state = live?.state || "pending";
                  return (
                    <div key={stage.id} className="flex items-baseline gap-4 border-b border-white/[0.06] pb-3">
                      <span
                        className={`font-datamono text-[0.6875rem] tracking-[0.2em] ${
                          state === "active" ? "text-[#D4FF00]" : state === "done" ? "text-white/70" : "text-white/30"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <p className={`font-grotesk font-medium text-sm ${state === "pending" ? "text-white/45" : "text-white"}`}>
                          {stage.name}
                        </p>
                        <p className="mt-1 hidden text-[0.8125rem] leading-relaxed text-white/40 xl:block">{stage.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>

          {/* sticky diagram column */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Reveal delay={0.1}>
              <CornerBrackets className="rounded-2xl border border-white/[0.08] bg-[rgba(10,10,10,0.5)] p-5 md:p-7">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="lc-caption uppercase tracking-[0.2em]">
                    LIVE PIPELINE{" "}
                    <span className={running ? "text-[#D4FF00]" : run.runState === "completed" ? "text-[#D4FF00]" : "text-white/40"}>
                      · {runCaption[run.runState]}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    {running ? (
                      <button type="button" className="lc-btn-ghost !h-11 !text-[0.8125rem]" onClick={run.cancel}>
                        Cancel run
                      </button>
                    ) : (
                      <button type="button" className="lc-btn-primary !h-11 !text-[0.8125rem]" onClick={run.start}>
                        {run.runState === "idle" ? "Run the pipeline" : "Run it again"}
                      </button>
                    )}
                  </div>
                </div>

                <PipelineDiagram stages={run.stages} runState={run.runState} motionOk visible={inView} />

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                  <p className="lc-caption" role="status" aria-live="polite">
                    {run.runId ? `RUN ${run.runId}` : "LOCAL TRACK"} · STAGE {doneCount}/{run.stages.length}
                    {activeStage ? ` · ${activeStage.name.toUpperCase()} ${Math.round(activeStage.percent || 0)}%` : ""} · {run.eventCount} EVENTS
                    {run.apiOnline === false ? " · API OFFLINE — SIMULATED" : ""}
                  </p>
                  <p className="lc-caption hidden md:block">SOURCE: /api/platform · WS + SSE</p>
                </div>
              </CornerBrackets>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="mt-8">
                <p className="lc-caption uppercase tracking-[0.2em] text-white/35">Connected systems in this demo</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {connectors.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-full border border-white/10 px-4 py-2 font-datamono text-[0.6875rem] tracking-[0.08em] text-white/55 transition-colors duration-200 hover:border-white/25 hover:text-white"
                      title={c.description}
                    >
                      {c.name}
                      <span className="ml-2 text-white/30">{c.latency_class}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
