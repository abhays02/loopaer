import React, { useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play, X, Send } from "lucide-react";

const STATE_STYLE = {
  running:    { color: "var(--acid)", label: "RUNNING" },
  waiting:    { color: "var(--cyan)", label: "WAITING" },
  paused:     { color: "var(--amber)", label: "PAUSED" },
  needs_user: { color: "var(--hot)", label: "NEEDS USER" },
  cancelled:  { color: "rgba(255,255,255,0.3)", label: "CANCELLED" },
  finished:   { color: "rgba(255,255,255,0.7)", label: "FINISHED" },
  failed:     { color: "var(--hot)", label: "FAILED" },
};

export default function LoopInspector({ loop, onPause, onResume, onCancel, onInject }) {
  const [inj, setInj] = useState("");
  const s = STATE_STYLE[loop.state] || { color: "white", label: loop.state };
  return (
    <div className="p-4 border-t border-white/5">
      <div className="flex items-center justify-between mb-3">
        <div className="label-tag">loop inspector</div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: s.color }}>{s.label}</span>
        </div>
      </div>

      <div className="text-xs text-white/85 mb-2">{loop.title}</div>
      <div className="grid grid-cols-3 gap-2 text-[10px] text-white/50 mb-3">
        <div>iter <span className="text-white/85">{loop.iterations}</span></div>
        <div>budget <span className="text-white/85">{loop.budget}</span></div>
        <div>kind <span className="text-white/85">{loop.kind}</span></div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {loop.state === "running" && (
          <button data-testid="loop-pause-btn" onClick={onPause} className="btn-ghost !py-1 !px-2 !text-[10px] inline-flex items-center gap-1"><Pause size={10} /> pause</button>
        )}
        {loop.state === "paused" && (
          <button data-testid="loop-resume-btn" onClick={onResume} className="btn-ghost !py-1 !px-2 !text-[10px] inline-flex items-center gap-1"><Play size={10} /> resume</button>
        )}
        {(loop.state === "running" || loop.state === "paused") && (
          <button data-testid="loop-cancel-btn" onClick={onCancel} className="btn-ghost !py-1 !px-2 !text-[10px] inline-flex items-center gap-1 !border-[var(--hot)]/40 hover:!bg-[var(--hot)]/10"><X size={10} /> cancel</button>
        )}
      </div>

      {/* Injection */}
      <div className="flex items-center gap-1.5">
        <input
          data-testid="loop-inject-input"
          value={inj}
          onChange={(e) => setInj(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && inj.trim()) {
              onInject(inj.trim()); setInj("");
            }
          }}
          placeholder="inject instruction…"
          className="flex-1 bg-black/40 border border-white/10 rounded-full px-3 py-1.5 text-[11px] outline-none focus:border-[var(--acid)]/50"
        />
        <button data-testid="loop-inject-btn" onClick={() => { if (inj.trim()) { onInject(inj.trim()); setInj(""); } }} className="btn-acid !py-1 !px-2 !text-[10px]"><Send size={10} /></button>
      </div>

      {loop.error && (
        <div className="mt-3 text-[10px] text-[var(--hot)] bg-[var(--hot)]/5 rounded-lg p-2 border border-[var(--hot)]/20">
          {loop.error}
        </div>
      )}
    </div>
  );
}
