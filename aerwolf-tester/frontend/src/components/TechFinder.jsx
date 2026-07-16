import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { X, Loader2, Package, Star, CheckCircle2, Zap, ArrowLeft } from "lucide-react";

/**
 * TechFinder — 2nd stage after AlgoFinder.
 * Given a chosen algorithm, show ranked tech implementations.
 */
export default function TechFinder({ algorithm, topic, provider, model, onBack, onClose, onApply }) {
  const [tech, setTech] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true); setError(null); setTech(null);
    (async () => {
      try {
        const r = await api.post("/tech/finder", { algorithm: algorithm.name, topic, provider, model });
        if (!cancel) setTech(r.data.tech || []);
      } catch (e) {
        if (!cancel) setError(e?.response?.data?.detail || "Failed to load tech options");
      } finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [algorithm.name, topic, provider, model]);

  return (
    <motion.div
      data-testid="tech-finder-panel"
      initial={{ x: 480, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 480, opacity: 0 }}
      transition={{ type: "spring", damping: 22, stiffness: 220 }}
      className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-full sm:w-[460px] max-w-full bg-[#060608]/97 backdrop-blur-3xl border-l border-white/10 z-50 overflow-hidden flex flex-col"
    >
      <div className="absolute inset-0 aer-scanlines opacity-20 pointer-events-none" />

      <div className="px-6 py-5 border-b border-white/10 relative z-10 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={onBack} data-testid="tech-finder-back-btn" className="p-1 border border-white/10 hover:border-[#00E5FF] hover:text-[#00E5FF] transition-colors">
              <ArrowLeft size={12} />
            </button>
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#FFB000]">TechFinder · Stage 2</span>
          </div>
          <div className="font-display font-black text-xl tracking-tight" data-testid="tech-finder-algo-name">{algorithm.name}</div>
          <div className="text-[10px] font-mono text-white/40">tech implementations · ranked</div>
        </div>
        <button onClick={onClose} data-testid="tech-finder-close-btn" className="p-2 border border-white/10 hover:border-[#FF0055] hover:text-[#FF0055] transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 relative z-10 space-y-3">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16" data-testid="tech-finder-loading">
            <Loader2 size={24} className="text-[#00E5FF] animate-spin" />
            <div className="mt-3 text-[10px] tracking-[0.3em] uppercase text-white/40">finding libraries...</div>
          </div>
        )}
        {error && <div className="p-4 border border-[#FF0055]/40 bg-[#FF0055]/5 text-[#FF0055] text-xs font-mono">{error}</div>}

        {!loading && !error && tech?.length === 0 && (
          <div className="text-white/40 text-xs font-mono p-6 text-center">No tech options found.</div>
        )}

        {tech?.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            data-testid={`tech-swap-btn-${i}`}
            className="group border border-white/10 hover:border-[#00E5FF] bg-white/[0.03] hover:bg-[#00E5FF]/[0.04] p-4 transition-all"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Package size={13} className="text-[#00E5FF]" />
                <span className="font-bold text-sm">{t.name}</span>
                {t.language && <span className="text-[9px] tracking-widest uppercase text-white/40 border border-white/10 px-1.5 py-0.5">{t.language}</span>}
              </div>
              <button
                data-testid={`tech-apply-btn-${i}`}
                onClick={() => onApply({ ...algorithm, tech_stack: [t.name, ...(algorithm.tech_stack || [])].slice(0, 4) })}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] tracking-widest uppercase font-black text-[#00E5FF] flex items-center gap-1"
              >
                Apply <CheckCircle2 size={12} />
              </button>
            </div>
            {t.pros?.length > 0 && (
              <ul className="text-[10px] font-mono text-white/60 mb-2 space-y-0.5">
                {t.pros.slice(0, 3).map((p, k) => <li key={k}>· <span className="text-[#00E5FF]/80">{p}</span></li>)}
              </ul>
            )}
            {t.cons?.length > 0 && (
              <ul className="text-[10px] font-mono text-white/50 mb-2 space-y-0.5">
                {t.cons.slice(0, 2).map((p, k) => <li key={k}>· <span className="text-[#FF0055]/80">{p}</span></li>)}
              </ul>
            )}
            <div className="grid grid-cols-4 gap-2 text-[9px] tracking-widest uppercase mb-2">
              <StatBadge label="Stars" value={t.stars ? `${t.stars}k` : "—"} color="#FFB000" />
              <StatBadge label="Off" value={t.official_score ?? "—"} color="#00E5FF" />
              <StatBadge label="Ease" value={t.beginner_friendly ?? "—"} color="#FF0055" />
              <StatBadge label="Rel" value={t.last_release || "—"} color="#9CA3AF" mini />
            </div>
            {t.install && (
              <div className="text-[10px] font-mono text-white/50 bg-black/30 border border-white/5 px-2 py-1 truncate" title={t.install}>
                $ {t.install}
              </div>
            )}
            {t.license && <div className="mt-2 text-[9px] tracking-widest uppercase text-white/40">{t.license}</div>}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function StatBadge({ label, value, color, mini }) {
  return (
    <div className="border border-white/10 p-1.5 flex flex-col items-center">
      <span className="text-[8px] text-white/40">{label}</span>
      <span className={`text-[10px] font-bold truncate ${mini ? "max-w-full" : ""}`} style={{ color }}>{value}</span>
    </div>
  );
}
