import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { X, Loader2, GitCompare, TrendingUp } from "lucide-react";

export default function ComparePanel({ items, topic, provider, model, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true); setError(null); setData(null);
    (async () => {
      try {
        const r = await api.post("/compare", { algorithms: items, topic, provider, model });
        if (!cancel) setData(r.data);
      } catch (e) {
        if (!cancel) setError(e?.response?.data?.detail || "Failed to compare");
      } finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [items, topic, provider, model]);

  const axes = data?.axes || [];
  const cmpItems = data?.items || [];

  return (
    <motion.div
      data-testid="compare-panel-modal"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass w-full max-w-4xl max-h-[85vh] flex flex-col"
      >
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare size={14} className="text-[#00E5FF]" />
            <span className="text-xs tracking-[0.25em] uppercase font-bold">Comparison · {items.length} items</span>
          </div>
          <button data-testid="compare-close-btn" onClick={onClose} className="border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold hover:border-[#FF0055] hover:text-[#FF0055] transition-colors">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16" data-testid="compare-loading">
              <Loader2 size={28} className="text-[#00E5FF] animate-spin" />
              <div className="mt-4 text-[10px] tracking-[0.3em] uppercase text-white/40">comparing on {axes.length || "…"} axes...</div>
            </div>
          )}
          {error && <div className="p-4 border border-[#FF0055]/40 bg-[#FF0055]/5 text-[#FF0055] text-xs font-mono">{error}</div>}

          {!loading && !error && cmpItems.length > 0 && (
            <>
              <div className={`grid gap-4 mb-6`} style={{ gridTemplateColumns: `repeat(${cmpItems.length}, minmax(0,1fr))` }}>
                {cmpItems.map((it, i) => {
                  const color = ["#00E5FF", "#FFB000", "#FF0055"][i % 3];
                  return (
                    <div key={i} data-testid={`compare-card-${i}`} className="border border-white/10 p-4 relative bg-white/[0.02]">
                      <div className="absolute top-0 left-0 h-[2px] w-12" style={{ background: color }} />
                      <div className="font-bold text-sm mb-1" style={{ color }}>{it.name}</div>
                      <div className="text-[10px] font-mono text-white/60 leading-relaxed mb-3">{it.summary}</div>
                      {axes.map((ax) => {
                        const v = it.scores?.[ax];
                        return (
                          <div key={ax} className="mb-2">
                            <div className="flex justify-between text-[9px] tracking-widest uppercase text-white/50 mb-0.5">
                              <span>{ax}</span>
                              <span style={{ color }}>{typeof v === "number" ? v : (v ?? "—")}</span>
                            </div>
                            <div className="h-1 bg-white/5">
                              <div className="h-full transition-all" style={{ width: `${Math.min(100, Number(v) || 0)}%`, background: color }} />
                            </div>
                          </div>
                        );
                      })}
                      {it.best_at?.length > 0 && (
                        <div className="mt-3 text-[10px] font-mono">
                          <div className="text-[9px] tracking-widest uppercase text-[#00E5FF] mb-1">best at</div>
                          <ul className="text-white/70 space-y-0.5">{it.best_at.map((b, k) => <li key={k}>· {b}</li>)}</ul>
                        </div>
                      )}
                      {it.worst_at?.length > 0 && (
                        <div className="mt-2 text-[10px] font-mono">
                          <div className="text-[9px] tracking-widest uppercase text-[#FF0055] mb-1">weak at</div>
                          <ul className="text-white/70 space-y-0.5">{it.worst_at.map((b, k) => <li key={k}>· {b}</li>)}</ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {data.verdict && (
                <div className="border border-[#FFB000]/40 bg-[#FFB000]/5 p-4" data-testid="compare-verdict">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={12} className="text-[#FFB000]" />
                    <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#FFB000]">Verdict</span>
                  </div>
                  <div className="text-xs font-mono text-white/80 leading-relaxed">{data.verdict}</div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
