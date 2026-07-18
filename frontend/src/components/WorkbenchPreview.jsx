import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useEventBus } from "../lib/useEventBus";
import { ArrowUpRight, Cpu, Search, ShieldCheck, Sparkles, Circle } from "lucide-react";

const KIND_ICON = {
  planner: Cpu, research: Search, verification: ShieldCheck, skill_builder: Sparkles,
};

/** Live-updating preview of the workbench, driven by a real session picked
 *  from the runtime — visitors can see actual reasoning happening. */
export default function WorkbenchPreview() {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await api.listSessions();
        if (!alive) return;
        const list = r.sessions || [];
        setSessions(list);
        if (!selected && list.length) setSelected(list[0].id);
      } catch (e) {}
    };
    load();
    const t = setInterval(load, 8000);
    return () => { alive = false; clearInterval(t); };
    // eslint-disable-next-line
  }, []);

  const activeId = selected || sessions[0]?.id;

  return (
    <section id="workbench" className="relative z-10 py-40 px-6 border-t border-white/[0.06]">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <div className="label-tag mb-4">THE WORKBENCH</div>
            <h2 className="display-hero text-[var(--ivory)] leading-[0.98]" style={{ fontSize: "clamp(40px, 6vw, 88px)" }}>
              Watch the runtime <em className="font-serif italic text-[var(--ivory)]/60">think.</em>
            </h2>
            <p className="mt-6 text-[16px] text-[var(--ivory)]/60 max-w-[560px] font-display">
              Loop tree on the left · dynamic artifact canvas at the center · event stream on the right ·
              liquid dock at the bottom. Every panel is live.
            </p>
          </div>
          {activeId && (
            <Link
              to={`/runtime/${activeId}`}
              data-testid="open-live-session-btn"
              className="btn-primary inline-flex items-center gap-2 text-[13px]"
            >
              Open live session
              <ArrowUpRight size={15} />
            </Link>
          )}
        </div>

        {/* Session picker */}
        {sessions.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {sessions.slice(0, 6).map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                data-testid={`session-pill-${s.id}`}
                className={`text-[11px] font-mono px-3 py-1.5 rounded-full border transition-colors ${
                  s.id === activeId
                    ? "border-[var(--acid)]/60 bg-[var(--acid)]/8 text-[var(--acid)]"
                    : "border-white/10 text-[var(--ivory)]/50 hover:text-[var(--ivory)] hover:border-white/25"
                }`}
              >
                {s.goal?.slice(0, 46) || s.id.slice(-8)}
              </button>
            ))}
          </div>
        )}

        {activeId ? (
          <PreviewCanvas key={activeId} sessionId={activeId} />
        ) : (
          <div className="glass rounded-[26px] p-24 text-center text-[var(--ivory)]/40 text-sm">
            No sessions yet — launch one above to see the workbench in action.
          </div>
        )}
      </div>
    </section>
  );
}

/* ============ Live canvas ============ */

function PreviewCanvas({ sessionId }) {
  const [session, setSession] = useState(null);
  const { events, connected } = useEventBus(sessionId);

  useEffect(() => {
    let alive = true;
    const load = () => api.getSession(sessionId).then((s) => alive && setSession(s)).catch(() => {});
    load();
    const t = setInterval(load, 4000);
    return () => { alive = false; clearInterval(t); };
  }, [sessionId]);

  const derived = useMemo(() => {
    const facts = [], entities = [], sources = [], conf = [];
    for (const ev of events) {
      if (ev.type === "FactExtracted" && ev.payload?.fact) facts.push(ev.payload.fact);
      if (ev.type === "EntityDetected" && ev.payload?.entity) entities.push(ev.payload.entity);
      if (ev.type === "PaperFound" || ev.type === "RepositoryFound") sources.push(ev.payload);
      if (ev.type === "ConfidenceChanged") conf.push(ev.payload);
    }
    return { facts, entities, sources, conf };
  }, [events]);

  const loops = session?.loops || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="glass rounded-[26px] p-3 overflow-hidden"
    >
      {/* mock top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-[18px] bg-black/25 border border-white/[0.06] mb-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--hot)]/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--amber)]/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--acid)]/70" />
          </div>
          <div className="w-2 h-2 rounded-full bg-[var(--acid)] relative pulse-dot text-[var(--acid)]" />
          <div className="font-display text-[13px] tracking-tight text-[var(--ivory)] truncate max-w-[520px]" title={session?.goal}>
            {session?.goal || "loading session…"}
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-[var(--ivory)]/50 uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-[var(--acid)]" : "bg-white/30"}`} />
            bus {connected ? "live" : "off"}
          </span>
          <span>{loops.length} loops</span>
          <span>{events.length} events</span>
        </div>
      </div>

      {/* 3-column preview */}
      <div className="grid grid-cols-[240px_1fr_280px] gap-3 h-[560px]">
        {/* left: loop tree */}
        <div className="rounded-[18px] bg-black/30 border border-white/[0.06] p-4 overflow-y-auto thin-scroll">
          <div className="label-tag mb-3">loop tree</div>
          {session?.plan && (
            <div className="mb-4">
              <div className="text-[10px] text-[var(--ivory)]/50 leading-relaxed">
                {session.plan.understanding?.slice(0, 130)}…
              </div>
              <div className="mt-3 space-y-1">
                {(session.plan.tasks || []).slice(0, 5).map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="text-[var(--acid)]">◇</span>
                    <span className="text-[var(--ivory)]/75 truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="label-tag mb-2">loops</div>
          <div className="space-y-2">
            {loops.length === 0 && <div className="text-[11px] text-[var(--ivory)]/30">no loops yet</div>}
            {loops.map((l) => {
              const Ic = KIND_ICON[l.kind] || Circle;
              const running = l.state === "running";
              return (
                <div key={l.id} className="rounded-lg px-2.5 py-2 border border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <Ic size={11} className={running ? "text-[var(--acid)]" : "text-[var(--ivory)]/60"} />
                    <span className="text-[10px] uppercase tracking-wider text-[var(--ivory)]">{l.kind.replace("_", " ")}</span>
                    <span className={`ml-auto text-[9px] uppercase tracking-wider ${running ? "text-[var(--acid)]" : "text-[var(--ivory)]/40"}`}>{l.state}</span>
                  </div>
                  <div className="text-[10px] text-[var(--ivory)]/40 mt-1">iter {l.iterations}/{l.budget}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* center: knowledge summary + facts */}
        <div className="rounded-[18px] bg-black/30 border border-white/[0.06] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="label-tag">artifact canvas · knowledge</div>
          </div>
          <div className="grid grid-cols-3 gap-3 p-4">
            <Stat n={derived.facts.length} l="facts" c="var(--acid)" />
            <Stat n={derived.entities.length} l="entities" c="var(--cyan)" />
            <Stat n={derived.sources.length} l="sources" c="var(--ivory)" />
          </div>
          <div className="flex-1 overflow-y-auto thin-scroll px-4 pb-4 space-y-1.5">
            {derived.facts.slice(0, 12).map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-2 text-[11px] leading-snug"
              >
                <span className="text-[var(--acid)] text-[10px] mt-0.5">◇</span>
                <span className="text-[var(--ivory)]/80 flex-1">{f.text}</span>
                {f.verified_confidence != null && (
                  <span className="text-[9px] text-[var(--ivory)]/40 shrink-0">{f.verified_confidence}%</span>
                )}
              </motion.div>
            ))}
            {derived.facts.length === 0 && (
              <div className="text-[11px] text-[var(--ivory)]/30 mt-4">facts will appear as the research loop runs…</div>
            )}
          </div>
        </div>

        {/* right: event stream */}
        <div className="rounded-[18px] bg-black/30 border border-white/[0.06] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? "live-pulse" : "bg-white/30"}`} />
              <span className="label-tag">event bus</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--ivory)]/40">{events.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto thin-scroll px-3 py-3 text-[10px] leading-snug flex flex-col-reverse">
            <AnimatePresence initial={false}>
              {events.slice(-40).reverse().map((ev) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 24 }}
                  className="mb-1.5"
                >
                  <div className="text-[9px] uppercase tracking-wider text-[var(--acid)]/70">{ev.type}</div>
                  <div className="text-[var(--ivory)]/70 truncate">{summarize(ev)}</div>
                </motion.div>
              ))}
            </AnimatePresence>
            {events.length === 0 && <div className="text-[var(--ivory)]/30">— waiting —</div>}
          </div>
        </div>
      </div>

      {/* footer callout */}
      <div className="mt-3 flex items-center justify-between px-4 py-3 rounded-[18px] bg-black/25 border border-white/[0.06]">
        <div className="text-[11px] text-[var(--ivory)]/50 font-mono">
          this preview is a real session · connected to the same runtime you're about to launch
        </div>
        <Link to={`/runtime/${sessionId}`} data-testid="preview-open-full-btn" className="btn-ghost !py-1.5 !px-4 !text-[11px] inline-flex items-center gap-1.5">
          open full workbench <ArrowUpRight size={13} />
        </Link>
      </div>
    </motion.div>
  );
}

function Stat({ n, l, c }) {
  return (
    <div className="rounded-lg border border-white/[0.08] px-3 py-3">
      <div className="text-[9px] uppercase tracking-widest text-[var(--ivory)]/40">{l}</div>
      <div className="font-display text-[26px] tracking-tight mt-1" style={{ color: c }}>{n}</div>
    </div>
  );
}

function summarize(ev) {
  const p = ev.payload || {};
  switch (ev.type) {
    case "PaperFound": return "📄 " + (p.title || "").slice(0, 60);
    case "RepositoryFound": return "⌥ " + (p.name || "").slice(0, 40) + " · ★" + (p.stars || 0);
    case "FactExtracted": return (p.fact?.text || "").slice(0, 70);
    case "EntityDetected": return (p.entity?.type || "") + ": " + (p.entity?.label || "");
    case "ConfidenceChanged": return p.confidence + "% · " + (p.fact || "").slice(0, 40);
    case "GapDetected": return "gap → " + (p.gap || "").slice(0, 50);
    case "SkillGenerated": return p.skill?.name;
    case "LoopStarted": return p.kind + " · " + (p.title || "");
    case "LoopFinished": return p.kind + " complete";
    case "TokenStreamed": return "↳ " + (p.delta || "").replace(/\n/g, " ").slice(0, 60);
    default: return "";
  }
}
