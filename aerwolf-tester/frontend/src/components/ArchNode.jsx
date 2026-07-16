import React from "react";
import { Handle, Position } from "reactflow";
import { Cpu, Boxes, Brain, ScanText, Layers, GitMerge, Sparkles } from "lucide-react";

const ICONS = {
  input: Boxes,
  preprocess: Layers,
  detection: ScanText,
  recognition: Brain,
  postprocess: GitMerge,
  output: Sparkles,
  default: Cpu,
};

export default function ArchNode({ data, selected }) {
  const Icon = ICONS[data.type] || ICONS.default;
  const busy = !!data.busy;
  const description = data.description || "";
  const hasMentions = /\[\[skill:/.test(description);

  return (
    <div
      data-testid={`architecture-node-${data.id}`}
      className={`min-w-[210px] rounded-[12px] p-3 transition-all cursor-pointer relative overflow-hidden ${
        selected
          ? "border-[color:var(--brand)] shadow-[0_0_20px_var(--brand-glow)] scale-[1.03] bg-[color:var(--surface-200)]"
          : "border-[color:var(--border-strong)] hover:border-[color:var(--brand)]/60 bg-[color:var(--surface-100)]"
      }`}
      style={{ borderWidth: 1, borderStyle: "solid" }}
    >
      {busy && (
        <>
          <div className="absolute inset-0 pointer-events-none opacity-70">
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(120deg, transparent 30%, var(--brand-glow) 50%, transparent 70%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s ease-in-out infinite",
              }}
            />
          </div>
          <span className="absolute top-1.5 right-1.5 text-[8px] tracking-widest uppercase font-bold text-[color:var(--brand)] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--brand)] pulse-ring" /> consulting
          </span>
          <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        </>
      )}
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2 mb-2 relative z-10">
        <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center border ${selected ? "border-[color:var(--brand)] text-[color:var(--brand)]" : "border-[color:var(--border-strong)] text-[color:var(--text-secondary)]"}`}>
          <Icon size={13} />
        </div>
        <div className="text-[9px] tracking-[0.25em] uppercase font-medium text-[color:var(--text-tertiary)]">{data.type}</div>
      </div>
      <div className="text-sm font-semibold text-[color:var(--text-primary)] mb-1 relative z-10">{data.label}</div>
      <div className="text-[10px] font-mono text-[color:var(--brand)] truncate relative z-10">
        {data.algorithm ? `▸ ${data.algorithm}` : <span className="text-[color:var(--text-tertiary)]">— click to pick algorithm</span>}
      </div>
      {data.tech && (
        <div className="mt-2 text-[9px] tracking-widest uppercase text-[color:var(--text-tertiary)] truncate relative z-10">tech · {data.tech}</div>
      )}
      {hasMentions && (
        <div className="mt-2 pt-2 border-t border-[color:var(--border-strong)] text-[10px] font-mono text-white/70 leading-relaxed relative z-10" data-testid={`archnode-mentions-${data.id}`}>
          {(() => {
            const parts = [];
            const re = /\[\[skill:\s*([^\]]+?)\s*\]\]/g;
            let last = 0, m, key = 0;
            while ((m = re.exec(description)) !== null) {
              if (m.index > last) parts.push(<span key={key++}>{description.slice(last, m.index)}</span>);
              parts.push(<span key={key++} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[color:var(--surface-200)] border border-[color:var(--brand)]/40 text-[color:var(--brand)]">▸ {m[1]}</span>);
              last = m.index + m[0].length;
            }
            if (last < description.length) parts.push(<span key={key++}>{description.slice(last)}</span>);
            return parts;
          })()}
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
