import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useEventBus } from "../lib/useEventBus";
import EventStream from "../components/EventStream";
import LoopTree from "../components/LoopTree";
import ArtifactCanvas from "../components/ArtifactCanvas";
import BottomDock from "../components/BottomDock";
import LoopInspector from "../components/LoopInspector";
import { ChevronLeft, Layers, GitBranch, Zap, Cpu, Circle } from "lucide-react";

export default function Runtime() {
  const { sid } = useParams();
  const loc = useLocation();
  const nav = useNavigate();
  const autostart = loc.state?.autostart;

  const [session, setSession] = useState(null);
  const [selectedLoop, setSelectedLoop] = useState(null);
  const [tab, setTab] = useState("plan"); // plan | knowledge | timeline | skill | replay
  const [models, setModels] = useState([]);
  const [replayIdx, setReplayIdx] = useState(null);

  const { events, connected } = useEventBus(sid);

  // load session + models
  useEffect(() => {
    let cancelled = false;
    api.listModels().then((r) => !cancelled && setModels(r.models || []));
    const fetch = () => api.getSession(sid).then((s) => !cancelled && setSession(s)).catch(() => {});
    fetch();
    const t = setInterval(fetch, 3000);
    return () => { cancelled = true; clearInterval(t); };
  }, [sid]);

  // autostart pipeline
  useEffect(() => {
    if (autostart) {
      api.runAll(sid).then(() => toast.success("Pipeline started")).catch(() => toast.error("failed to start"));
      // clear state so refresh doesn't retrigger
      nav(loc.pathname, { replace: true });
    }
    // eslint-disable-next-line
  }, [autostart, sid]);

  const loops = session?.loops || [];
  const plan = session?.plan;
  const activeLoop = useMemo(() => loops.find((l) => l.id === selectedLoop) || loops.find((l) => l.state === "running" || l.state === "paused") || loops[loops.length - 1], [loops, selectedLoop]);

  // derive knowledge from events
  const knowledge = useMemo(() => {
    const facts = []; const entities = []; const sources = []; const confidence = [];
    for (const ev of events) {
      if (ev.type === "FactExtracted" && ev.payload.fact) facts.push(ev.payload.fact);
      if (ev.type === "EntityDetected" && ev.payload.entity) entities.push(ev.payload.entity);
      if (ev.type === "PaperFound") sources.push({ kind: "paper", ...ev.payload });
      if (ev.type === "RepositoryFound") sources.push({ kind: "repo", ...ev.payload });
      if (ev.type === "ConfidenceChanged") confidence.push({ ts: ev.ts, ...ev.payload });
    }
    return { facts, entities, sources, confidence };
  }, [events]);

  const skill = useMemo(() => {
    const ev = [...events].reverse().find((e) => e.type === "SkillGenerated");
    return ev?.payload?.skill;
  }, [events]);

  // controls
  const doPause = (lid) => api.pauseLoop(sid, lid).then(() => toast("paused"));
  const doResume = (lid) => api.resumeLoop(sid, lid).then(() => toast("resumed"));
  const doCancel = (lid) => api.cancelLoop(sid, lid).then(() => toast("cancelled"));
  const doInject = (lid, txt) => api.inject(sid, lid, txt).then(() => toast("injected"));
  const doBranch = async (goal) => {
    const n = await api.branch(sid, goal);
    toast.success("branched", { description: goal || "same goal" });
    nav(`/runtime/${n.id}`);
  };
  const runStage = async (stage) => {
    const fn = { plan: api.runPlan, research: api.runResearch, verify: api.runVerify, skill: api.runSkill }[stage];
    if (fn) { await fn(sid); toast(`${stage} started`); }
  };

  const anyRunning = loops.some((l) => l.state === "running" || l.state === "waiting");

  return (
    <div className="workbench font-mono">
      {/* TOP BAR */}
      <div className="region-top glass-strong rounded-2xl px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-white/50 hover:text-white transition-colors flex items-center gap-1">
            <ChevronLeft size={16} /> <span className="text-xs">home</span>
          </Link>
          <div className="w-px h-6 bg-white/10" />
          <div className="w-2 h-2 rounded-full bg-[var(--acid)] relative pulse-dot text-[var(--acid)]" />
          <div className="font-display text-sm tracking-tight truncate max-w-[600px]" title={session?.goal}>
            {session?.goal || "loading…"}
          </div>
          <span className="label-tag ml-3">session {sid.slice(-6)}</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-[var(--acid)]" : "bg-white/30"}`} />
            <span className="label-tag">{connected ? "bus live" : "offline"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle size={10} className={anyRunning ? "text-[var(--acid)] animate-pulse" : "text-white/40"} fill="currentColor" />
            <span className="label-tag">{loops.length} loops</span>
          </div>
          <div className="label-tag">{events.length} events</div>
          <div className="label-tag">{knowledge.sources.length} sources</div>
        </div>
      </div>

      {/* LEFT: Loop tree */}
      <div className="region-left panel rounded-2xl overflow-hidden flex flex-col">
        <LoopTree
          plan={plan}
          loops={loops}
          selected={selectedLoop}
          onSelect={(id) => { setSelectedLoop(id); setTab("plan"); }}
          knowledge={knowledge}
        />
      </div>

      {/* CENTER: Artifact canvas */}
      <div className="region-center panel rounded-2xl overflow-hidden">
        <ArtifactCanvas
          tab={tab}
          setTab={setTab}
          session={session}
          plan={plan}
          knowledge={knowledge}
          skill={skill}
          events={events}
          replayIdx={replayIdx}
          setReplayIdx={setReplayIdx}
          onRunStage={runStage}
          onBranch={doBranch}
          activeLoop={activeLoop}
        />
      </div>

      {/* RIGHT: Event stream + Loop inspector */}
      <div className="region-right flex flex-col gap-3 overflow-hidden">
        <div className="panel rounded-2xl overflow-hidden flex-1 min-h-0">
          <EventStream events={replayIdx != null ? events.slice(0, replayIdx + 1) : events} live={connected && replayIdx == null} />
        </div>
        {activeLoop && (
          <div className="panel rounded-2xl overflow-hidden">
            <LoopInspector
              loop={activeLoop}
              onPause={() => doPause(activeLoop.id)}
              onResume={() => doResume(activeLoop.id)}
              onCancel={() => doCancel(activeLoop.id)}
              onInject={(txt) => doInject(activeLoop.id, txt)}
            />
          </div>
        )}
      </div>

      {/* BOTTOM DOCK */}
      <BottomDock
        session={session}
        models={models}
        anyRunning={anyRunning}
        onRunStage={runStage}
        onBranch={doBranch}
        onSelectModel={(mid) => { setSession((s) => s ? {...s, model: mid} : s); toast(`model → ${mid.split('/').pop()}`); }}
        onPauseAll={() => loops.filter(l => l.state === "running").forEach(l => doPause(l.id))}
        onResumeAll={() => loops.filter(l => l.state === "paused").forEach(l => doResume(l.id))}
      />
    </div>
  );
}
