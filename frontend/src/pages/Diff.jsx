import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { ChevronLeft, GitBranch, Play, Pause, Sparkles, Share2 } from "lucide-react";
import ReasoningTree from "../components/ReasoningTree";
import { toast } from "sonner";
import { useEventBus } from "../lib/useEventBus";

/** Reasoning Diff — pause + branch + resume + compare two sessions side-by-side. */
export default function Diff() {
  const { sid1, sid2 } = useParams();
  const nav = useNavigate();
  const [s1, setS1] = useState(null);
  const [s2, setS2] = useState(null);
  const [t1, setT1] = useState(null);
  const [t2, setT2] = useState(null);
  const evs1 = useEventBus(sid1);
  const evs2 = useEventBus(sid2);

  useEffect(() => {
    let alive = true;
    const load = () => {
      Promise.all([api.getSession(sid1), api.getSession(sid2)]).then(([a, b]) => {
        if (!alive) return;
        setS1(a); setS2(b);
      }).catch(() => {});
      Promise.all([api.getKnowledge?.(sid1) || fetch(`/api/sessions/${sid1}/tree`).then(r=>r.json()),
                   api.getKnowledge?.(sid2) || fetch(`/api/sessions/${sid2}/tree`).then(r=>r.json())]).catch(()=>{});
    };
    // fetch trees
    const grabTree = async () => {
      try {
        const [a, b] = await Promise.all([
          fetch(`${process.env.REACT_APP_BACKEND_URL}/api/sessions/${sid1}/tree`).then(r=>r.json()),
          fetch(`${process.env.REACT_APP_BACKEND_URL}/api/sessions/${sid2}/tree`).then(r=>r.json()),
        ]);
        if (!alive) return;
        setT1(a.tree); setT2(b.tree);
      } catch (e) {}
    };
    load(); grabTree();
    const t = setInterval(() => { load(); grabTree(); }, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [sid1, sid2]);

  // Diff computation — walk both trees, collect labels at each depth level.
  const diff = useMemo(() => {
    const facts1 = new Set(); const facts2 = new Set();
    const walk = (n, set) => {
      if (!n) return;
      if (n.kind === "fact" || n.kind === "entity" || n.kind === "gap") set.add(n.label);
      (n.children || []).forEach(c => walk(c, set));
    };
    walk(t1, facts1);
    walk(t2, facts2);
    const only1 = [...facts1].filter(x => !facts2.has(x));
    const only2 = [...facts2].filter(x => !facts1.has(x));
    const shared = [...facts1].filter(x => facts2.has(x));
    return { only1, only2, shared };
  }, [t1, t2]);

  const pause = (sid) => api.pauseLoop && Promise.all(
    (sid === sid1 ? s1 : s2)?.loops.filter(l => l.state === "running").map(l => api.pauseLoop(sid, l.id)) || []
  ).then(() => toast(`paused ${sid.slice(-6)}`));
  const resume = (sid) => Promise.all(
    (sid === sid1 ? s1 : s2)?.loops.filter(l => l.state === "paused").map(l => api.resumeLoop(sid, l.id)) || []
  ).then(() => toast(`resumed ${sid.slice(-6)}`));
  const runSkill = (sid) => api.runSkill(sid).then(() => toast("compiling skill…"));

  const shareSnapshot = async () => {
    try {
      const note = window.prompt("Note for this snapshot (optional):") || "";
      const snap = await api.createSnapshot(sid1, sid2, note);
      const url = `${window.location.origin}/snapshot/${snap.id}`;
      try { await navigator.clipboard.writeText(url); } catch (e) {}
      toast.success("Snapshot created", { description: "URL copied to clipboard" });
      window.open(url, "_blank");
    } catch (e) {
      toast.error("Snapshot failed", { description: e?.message });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--ink)] text-[var(--ivory)] p-6 relative">
      <div className="fixed inset-0 grain pointer-events-none z-0" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-white/50 hover:text-white transition-colors inline-flex items-center gap-1">
            <ChevronLeft size={16} /> <span className="text-sm">home</span>
          </Link>
          <div className="w-px h-6 bg-white/12" />
          <div className="font-display text-[22px] tracking-tight">Reasoning Diff</div>
          <span className="label-tag ml-2">A ⇔ B · side-by-side cognition</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/50 font-mono">
          <span>{diff.shared.length} shared</span>
          <span className="text-[var(--acid)]">·</span>
          <span>{diff.only1.length + diff.only2.length} divergent</span>
          <div className="w-px h-4 bg-white/12 mx-2" />
          <button data-testid="diff-share-btn" onClick={shareSnapshot} className="btn-ghost !py-1.5 !px-3 !text-[11px] inline-flex items-center gap-1.5">
            <Share2 size={11} /> share snapshot
          </button>
        </div>
      </div>

      {/* Two panels */}
      <div className="relative z-10 grid grid-cols-2 gap-4 h-[calc(100vh-140px)]">
        {[{ sid: sid1, s: s1, tree: t1, side: "A", accent: "var(--acid)" },
          { sid: sid2, s: s2, tree: t2, side: "B", accent: "var(--cyan)" }].map((p) => (
          <div key={p.sid} className="glass rounded-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <span className="font-display text-lg tracking-tight" style={{ color: p.accent }}>Session {p.side}</span>
                <span className="label-tag">{p.sid.slice(-8)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button data-testid={`diff-pause-${p.side}`} onClick={() => pause(p.sid)} className="btn-ghost !py-1.5 !px-3 !text-[11px] inline-flex items-center gap-1"><Pause size={11}/> pause</button>
                <button data-testid={`diff-resume-${p.side}`} onClick={() => resume(p.sid)} className="btn-ghost !py-1.5 !px-3 !text-[11px] inline-flex items-center gap-1"><Play size={11}/> resume</button>
                <button data-testid={`diff-skill-${p.side}`} onClick={() => runSkill(p.sid)} className="btn-ghost !py-1.5 !px-3 !text-[11px] inline-flex items-center gap-1"><Sparkles size={11}/> compile</button>
              </div>
            </div>
            <div className="px-5 pt-4 pb-2">
              <div className="text-[12px] text-white/70 truncate" title={p.s?.goal}>{p.s?.goal || "loading…"}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(p.s?.loops || []).map(l => (
                  <span key={l.id} className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-white/10"
                    style={{ color: l.state === "running" ? p.accent : l.state === "finished" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)" }}>
                    {l.kind} · {l.state}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto thin-scroll">
              <ReasoningTree tree={p.tree} events={(p.side === "A" ? evs1 : evs2).events} />
            </div>
          </div>
        ))}
      </div>

      {/* Diff strip */}
      <div className="relative z-10 mt-4 glass rounded-2xl p-5">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="label-tag mb-2 !text-[var(--acid)]">only in A</div>
            <div className="space-y-1 text-[11px] text-white/80 max-h-[140px] overflow-y-auto thin-scroll">
              {diff.only1.slice(0, 30).map((f, i) => <div key={i} className="truncate">— {f}</div>)}
              {diff.only1.length === 0 && <div className="text-white/30 italic">nothing unique</div>}
            </div>
          </div>
          <div>
            <div className="label-tag mb-2">shared</div>
            <div className="space-y-1 text-[11px] text-white/80 max-h-[140px] overflow-y-auto thin-scroll">
              {diff.shared.slice(0, 30).map((f, i) => <div key={i} className="truncate">= {f}</div>)}
              {diff.shared.length === 0 && <div className="text-white/30 italic">no overlap yet</div>}
            </div>
          </div>
          <div>
            <div className="label-tag mb-2 !text-[var(--cyan)]">only in B</div>
            <div className="space-y-1 text-[11px] text-white/80 max-h-[140px] overflow-y-auto thin-scroll">
              {diff.only2.slice(0, 30).map((f, i) => <div key={i} className="truncate">— {f}</div>)}
              {diff.only2.length === 0 && <div className="text-white/30 italic">nothing unique</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
