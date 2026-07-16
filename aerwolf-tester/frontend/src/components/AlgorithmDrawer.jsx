import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { X, Loader2, Cpu, Star, Clock, Gauge, CheckCircle2, Eye, GitCompare, ChevronRight } from "lucide-react";

/**
 * AlgorithmDrawer — Stage 1 of two-stage flow.
 * On card click → onGoTech(algo) opens TechFinder (Stage 2).
 * Each card has "Watch it run" (opens hyperframes) and multi-select for "Compare".
 */
export default function AlgorithmDrawer({ node, topic, provider, model, onClose, onGoTech, onWatch, onCompare }) {
  const [algos, setAlgos] = useState(null);
  const [visible, setVisible] = useState(0); // progressive reveal count
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setAlgos(null); setVisible(0); setSelected([]);
    (async () => {
      try {
        const r = await api.post("/algorithms/suggest", {
          node_label: node.data.label,
          node_type: node.data.type,
          topic,
          provider,
          model,
        });
        if (!cancelled) {
          const list = r.data.algorithms || [];
          setAlgos(list);
          setLoading(false);
          // Progressive reveal — mimics streaming token-by-token
          list.forEach((_, idx) => {
            setTimeout(() => { if (!cancelled) setVisible((v) => Math.max(v, idx + 1)); }, idx * 220);
          });
        }
      } catch (e) {
        if (!cancelled) { setError(e?.response?.data?.detail || "Failed to load algorithms"); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [node.id, topic, provider, model, node.data.label, node.data.type]);

  const toggleSelect = (name) => {
    setSelected((s) => s.includes(name) ? s.filter((x) => x !== name) : (s.length >= 3 ? s : [...s, name]));
  };

  return (
    <motion.div
      data-testid="algorithm-drawer-panel"
      initial={{ x: 480, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 480, opacity: 0 }}
      transition={{ type: "spring", damping: 22, stiffness: 220 }}
      className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-full sm:w-[460px] max-w-full bg-[#060608]/97 backdrop-blur-3xl border-l border-white/10 z-50 overflow-hidden flex flex-col"
    >
      <div className="absolute inset-0 aer-scanlines opacity-20 pointer-events-none" />
      <div className="px-6 py-5 border-b border-white/10 relative z-10 flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-[#FFB000] mb-1">AlgoFinder · Stage 1</div>
          <div className="font-display font-black text-xl tracking-tight">{node.data.label}</div>
          <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{node.data.type}</div>
        </div>
        <button
          data-testid="algorithm-drawer-close-btn"
          onClick={onClose}
          className="p-2 border border-white/10 hover:border-[#FF0055] hover:text-[#FF0055] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {selected.length >= 2 && (
        <div className="px-4 py-3 border-b border-white/10 bg-[#00E5FF]/[0.05] flex items-center justify-between">
          <div className="text-[10px] font-mono text-[#00E5FF]" data-testid="compare-selection-count">
            {selected.length} selected · max 3
          </div>
          <button
            data-testid="compare-launch-btn"
            onClick={() => onCompare(selected)}
            className="flex items-center gap-1.5 bg-[#00E5FF] text-black px-3 py-1.5 text-[10px] uppercase tracking-widest font-black hover:bg-white transition-colors"
          >
            <GitCompare size={11} /> Compare
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 relative z-10 space-y-3">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16" data-testid="algorithm-drawer-loading">
            <div className="relative">
              <Loader2 size={28} className="text-[#00E5FF] animate-spin" />
              <div className="absolute inset-0 rounded-full pulse-ring" />
            </div>
            <div className="mt-4 text-[10px] tracking-[0.3em] uppercase text-white/40">consulting {provider}</div>
            <div className="mt-1 text-[10px] font-mono text-white/30">ranking algorithms for {node.data.label}...</div>
          </div>
        )}
        {error && (
          <div className="p-4 border border-[#FF0055]/40 bg-[#FF0055]/5 text-[#FF0055] text-xs font-mono" data-testid="algorithm-drawer-error">
            {error}
          </div>
        )}
        {!loading && !error && algos?.length === 0 && (
          <div className="text-white/40 text-xs font-mono p-6 text-center">No algorithms suggested. Try renaming the node.</div>
        )}
        {algos?.slice(0, visible).map((a, i) => {
          const isSel = selected.includes(a.name);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              data-testid={`algorithm-swap-btn-${i}`}
              className={`group border p-4 transition-all bg-white/[0.03] hover:bg-[#FFB000]/[0.05] ${isSel ? "border-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.3)]" : "border-white/10 hover:border-[#FFB000]"}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <button
                  data-testid={`algorithm-select-toggle-${i}`}
                  onClick={() => toggleSelect(a.name)}
                  className="flex items-center gap-2 text-left flex-1"
                  title="Select for comparison"
                >
                  <div className={`w-4 h-4 border-2 flex items-center justify-center transition-colors ${isSel ? "border-[#00E5FF] bg-[#00E5FF]/20" : "border-white/25 hover:border-[#00E5FF]/60"}`}>
                    {isSel && <div className="w-1.5 h-1.5 bg-[#00E5FF]" />}
                  </div>
                  <Cpu size={13} className="text-[#00E5FF]" />
                  <span className="font-bold text-sm">{a.name}</span>
                </button>
              </div>
              {a.notes && <div className="text-[11px] font-mono text-white/60 mb-3 leading-relaxed pl-6">{a.notes}</div>}
              <div className="flex flex-wrap gap-1.5 mb-3 pl-6">
                {(a.tech_stack || []).slice(0, 4).map((t, j) => (
                  <span key={j} className="text-[9px] tracking-widest uppercase border border-white/10 text-white/70 px-2 py-0.5">{t}</span>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2 text-[9px] tracking-widest uppercase pl-6 mb-3">
                <Badge icon={Star} label="Pop" value={a.popularity} color="#00E5FF" />
                <Badge icon={CheckCircle2} label="Off" value={a.official_rating} color="#FFB000" />
                <Badge icon={Gauge} label="VRAM" value={a.vram_gb ? `${a.vram_gb}G` : "—"} color="#FF0055" raw />
                <Badge icon={Clock} label="Lat" value={a.latency_ms ? `${a.latency_ms}ms` : "—"} color="#9CA3AF" raw />
              </div>
              <div className="flex gap-2 pl-6">
                <button
                  data-testid={`algorithm-watch-btn-${i}`}
                  onClick={(e) => { e.stopPropagation(); onWatch(a); }}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-[#FFB000]/40 text-[#FFB000] px-2 py-1.5 text-[10px] uppercase tracking-widest font-bold hover:bg-[#FFB000]/10 transition-colors"
                >
                  <Eye size={11} /> Watch it run
                </button>
                <button
                  data-testid={`algorithm-go-tech-btn-${i}`}
                  onClick={(e) => { e.stopPropagation(); onGoTech(a); }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#00E5FF] text-black px-2 py-1.5 text-[10px] uppercase tracking-widest font-black hover:bg-white transition-colors"
                >
                  Pick Tech <ChevronRight size={11} />
                </button>
              </div>
            </motion.div>
          );
        })}
        {!loading && !error && algos && visible < algos.length && (
          <div className="flex items-center gap-2 text-[10px] tracking-widest uppercase text-[color:var(--brand)] pl-2" data-testid="algorithm-drawer-streaming">
            <Loader2 size={10} className="animate-spin" /> streaming {visible}/{algos.length}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Badge({ icon: Icon, label, value, color, raw }) {
  const display = raw ? value : (typeof value === "number" ? `${value}` : (value ?? "—"));
  return (
    <div className="border border-white/10 p-1.5 flex flex-col items-center">
      <Icon size={9} style={{ color }} />
      <span className="text-[8px] text-white/40 mt-0.5">{label}</span>
      <span className="text-[10px] font-bold" style={{ color }}>{display}</span>
    </div>
  );
}
