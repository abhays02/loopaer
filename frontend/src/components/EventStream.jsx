import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_COLORS = {
  SessionCreated: "text-white/60",
  LoopStarted: "text-[var(--acid)]",
  LoopFinished: "text-[var(--acid)]",
  LoopCancelled: "text-[var(--hot)]",
  LoopFailed: "text-[var(--hot)]",
  LoopPaused: "text-[var(--amber)]",
  LoopResumed: "text-[var(--acid)]",
  LoopWarning: "text-[var(--amber)]",
  PlannerThinking: "text-[var(--cyan)]",
  PlanReady: "text-[var(--acid)]",
  TokenStreamed: "text-white/40",
  ResearchStarted: "text-[var(--cyan)]",
  ResearchFinished: "text-[var(--acid)]",
  SourceFetching: "text-white/50",
  PaperFound: "text-white/80",
  RepositoryFound: "text-white/80",
  FactExtracted: "text-white/90",
  EntityDetected: "text-[var(--cyan)]",
  GapDetected: "text-[var(--amber)]",
  ConfidenceChanged: "text-[var(--acid)]",
  VerificationStarted: "text-[var(--cyan)]",
  VerificationFinished: "text-[var(--acid)]",
  SkillGenerated: "text-[var(--acid)]",
  UserInjection: "text-[var(--hot)]",
  InjectionApplied: "text-[var(--hot)]",
  ReasoningTreeUpdated: "text-white/40",
  SessionBranched: "text-[var(--cyan)]",
  MemoryHit: "text-[var(--cyan)]",
  MemoryArchived: "text-[var(--acid)]",
  Connected: "text-white/40",
};

function summarize(ev) {
  const p = ev.payload || {};
  switch (ev.type) {
    case "SessionCreated": return `goal: ${p.goal?.slice(0, 60)}`;
    case "LoopStarted": return `${p.kind} · ${p.title || ""}`;
    case "LoopFinished": return `${p.kind} complete`;
    case "LoopPaused": return `paused ${p.loop_id?.slice(-4)}`;
    case "LoopResumed": return `resumed ${p.loop_id?.slice(-4)}`;
    case "LoopWarning": return p.warn;
    case "LoopFailed": return `failed: ${p.error?.slice(0, 80)}`;
    case "PlannerThinking": return `↳ ${p.step}`;
    case "PlanReady": return `plan ready · ${p.plan?.tasks?.length || 0} tasks`;
    case "ResearchStarted": return `iter ${p.iteration} · ${p.query?.slice(0, 60)}`;
    case "ResearchFinished": return `${p.facts} facts · ${p.sources} sources`;
    case "SourceFetching": return `→ ${p.source} · "${p.query?.slice(0, 40)}"`;
    case "PaperFound": return `📄 ${p.title?.slice(0, 70)}`;
    case "RepositoryFound": return `⌥ ${p.name} · ★${p.stars}`;
    case "FactExtracted": return `${p.fact?.text?.slice(0, 80)}`;
    case "EntityDetected": return `${p.entity?.type}: ${p.entity?.label}`;
    case "GapDetected": return `gap → ${p.gap?.slice(0, 60)}`;
    case "ConfidenceChanged": return `${p.confidence}% · ${p.verdict} · ${p.fact?.slice(0, 40)}`;
    case "VerificationStarted": return `verifying: ${p.fact?.slice(0, 60)}`;
    case "VerificationFinished": return `avg conf ${p.average_confidence}`;
    case "SkillGenerated": return `${p.skill?.name} · v${p.skill?.version}`;
    case "UserInjection": return `↳ "${p.instruction?.slice(0, 60)}"`;
    case "InjectionApplied": return `applied: ${p.instruction?.slice(0, 60)}`;
    case "ReasoningTreeUpdated": return `tree updated`;
    case "SessionBranched": return `branched from ${p.parent?.slice(-6)}`;
    case "TokenStreamed": return `↳ ${p.delta?.replace(/\n/g," ").slice(0, 80)}`;
    case "MemoryHit": return `↺ ${Math.round((p.score||0)*100)}% · ${p.text?.slice(0, 70)}`;
    case "MemoryArchived": return `archived ${p.count} items to memory`;
    default: return "";
  }
}

export default function EventStream({ events, live }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${live ? "live-pulse" : "bg-white/30"}`} />
          <span className="label-tag">event bus</span>
        </div>
        <div className="label-tag">{events.length}</div>
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto thin-scroll px-3 py-3 text-[11px] leading-relaxed">
        <AnimatePresence initial={false}>
          {events.map((ev) => {
            const color = TYPE_COLORS[ev.type] || "text-white/60";
            const t = new Date(ev.ts).toLocaleTimeString([], { hour12: false }).slice(0, 8);
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                className="mb-1.5"
                data-testid={`event-${ev.type}`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-white/25 text-[10px] shrink-0">{t}</span>
                  <span className={`${color} text-[10px] shrink-0 uppercase tracking-wider`}>{ev.type}</span>
                </div>
                <div className="text-white/75 pl-[62px] -mt-0.5 truncate">{summarize(ev)}</div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {events.length === 0 && (
          <div className="text-white/30 text-xs mt-4">— waiting for events —</div>
        )}
      </div>
    </div>
  );
}
