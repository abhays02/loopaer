import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { ChevronLeft, Lock, Calendar } from "lucide-react";
import ReasoningTree from "../components/ReasoningTree";

/** Read-only shareable Diff snapshot. Frozen at time of creation. */
export default function Snapshot() {
  const { snapId } = useParams();
  const [snap, setSnap] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.getSnapshot(snapId).then(setSnap).catch((e) => setErr(e?.message || "not found"));
  }, [snapId]);

  const diff = useMemo(() => {
    if (!snap) return { only1: [], only2: [], shared: [] };
    const walk = (n, set) => {
      if (!n) return;
      if (["fact", "entity", "gap"].includes(n.kind)) set.add(n.label);
      (n.children || []).forEach(c => walk(c, set));
    };
    const s1 = new Set(); const s2 = new Set();
    walk(snap.session_a?.reasoning_tree, s1);
    walk(snap.session_b?.reasoning_tree, s2);
    return {
      only1: [...s1].filter(x => !s2.has(x)),
      only2: [...s2].filter(x => !s1.has(x)),
      shared: [...s1].filter(x => s2.has(x)),
    };
  }, [snap]);

  if (err) {
    return (
      <div className="min-h-screen bg-[var(--ink)] flex items-center justify-center text-[var(--ivory)]">
        <div className="text-center">
          <div className="label-tag mb-2">snapshot not found</div>
          <div className="font-display text-2xl">{snapId}</div>
          <Link to="/" className="btn-ghost mt-6 inline-flex text-xs">← home</Link>
        </div>
      </div>
    );
  }
  if (!snap) return <div className="min-h-screen bg-[var(--ink)] flex items-center justify-center text-[var(--ivory)]/40 text-sm">loading snapshot…</div>;

  return (
    <div className="min-h-screen bg-[var(--ink)] text-[var(--ivory)] p-6 relative">
      <div className="fixed inset-0 grain pointer-events-none z-0" />

      <div className="relative z-10 flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-white/50 hover:text-white transition-colors inline-flex items-center gap-1">
            <ChevronLeft size={16} /> <span className="text-sm">home</span>
          </Link>
          <div className="w-px h-6 bg-white/12" />
          <div className="font-display text-[22px] tracking-tight">Reasoning Diff · Snapshot</div>
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--acid)] font-mono uppercase tracking-widest">
            <Lock size={10} /> read only
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono text-white/50">
          <div className="flex items-center gap-1.5"><Calendar size={11} /> {new Date(snap.created_at).toLocaleString()}</div>
          <div><span className="text-[var(--acid)]">{diff.shared.length}</span> shared · <span className="text-[var(--ivory)]">{diff.only1.length + diff.only2.length}</span> divergent</div>
        </div>
      </div>

      {snap.note && (
        <div className="relative z-10 mb-4 glass rounded-2xl px-5 py-3 text-[13px] text-[var(--ivory)]/80">
          <span className="label-tag mr-3">note</span> {snap.note}
        </div>
      )}

      <div className="relative z-10 grid grid-cols-2 gap-4 h-[calc(100vh-240px)]">
        {[
          { s: snap.session_a, side: "A", accent: "var(--acid)" },
          { s: snap.session_b, side: "B", accent: "var(--cyan)" },
        ].map((p) => (
          <div key={p.side} className="glass rounded-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <span className="font-display text-lg tracking-tight" style={{ color: p.accent }}>Session {p.side}</span>
                <span className="label-tag">{p.s?.id?.slice(-8)}</span>
              </div>
              <span className="label-tag">{(p.s?.loops || []).length} loops · {(p.s?.knowledge?.facts || []).length} facts</span>
            </div>
            <div className="px-5 pt-4 pb-2">
              <div className="text-[12px] text-white/70 truncate">{p.s?.goal}</div>
            </div>
            <div className="flex-1 overflow-y-auto thin-scroll">
              <ReasoningTree tree={p.s?.reasoning_tree} events={[]} />
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-4 glass rounded-2xl p-5">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="label-tag mb-2 !text-[var(--acid)]">only in A · {diff.only1.length}</div>
            <div className="space-y-1 text-[11px] text-white/80 max-h-[160px] overflow-y-auto thin-scroll">
              {diff.only1.slice(0, 40).map((f, i) => <div key={i} className="truncate">— {f}</div>)}
              {diff.only1.length === 0 && <div className="text-white/30 italic">nothing unique</div>}
            </div>
          </div>
          <div>
            <div className="label-tag mb-2">shared · {diff.shared.length}</div>
            <div className="space-y-1 text-[11px] text-white/80 max-h-[160px] overflow-y-auto thin-scroll">
              {diff.shared.slice(0, 40).map((f, i) => <div key={i} className="truncate">= {f}</div>)}
              {diff.shared.length === 0 && <div className="text-white/30 italic">no overlap</div>}
            </div>
          </div>
          <div>
            <div className="label-tag mb-2 !text-[var(--cyan)]">only in B · {diff.only2.length}</div>
            <div className="space-y-1 text-[11px] text-white/80 max-h-[160px] overflow-y-auto thin-scroll">
              {diff.only2.slice(0, 40).map((f, i) => <div key={i} className="truncate">— {f}</div>)}
              {diff.only2.length === 0 && <div className="text-white/30 italic">nothing unique</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
