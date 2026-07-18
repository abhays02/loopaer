import React from "react";
import { motion } from "framer-motion";

const ACCENT = { acid: "var(--acid)", cyan: "var(--cyan)", amber: "var(--amber)", hot: "var(--hot)", ivory: "var(--ivory)" };

function anim(idx) {
  return { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: idx * 0.04, duration: 0.35 } };
}

/** Render one component in a switch. Grids/containers render their children
 *  via a nested map that calls renderOne — NOT a self-referencing component. */
function renderOne(node, idx) {
  const a = anim(idx);
  const t = node?.type;
  if (!t) return null;
  switch (t) {
    case "heading": {
      const lvl = node.level || 2;
      const size = { 1: "clamp(28px,3.6vw,42px)", 2: "clamp(22px,2.8vw,32px)", 3: "18px" }[lvl] || "20px";
      return <motion.div {...a} key={idx} className="display-hero text-[var(--ivory)]" style={{ fontSize: size }}>{node.text}</motion.div>;
    }
    case "text":
      return <motion.p {...a} key={idx} className="text-[var(--ivory)]/75 text-[14px] leading-relaxed font-display">{node.content}</motion.p>;
    case "stat":
      return (
        <motion.div {...a} key={idx} className="glass rounded-2xl px-5 py-4">
          <div className="label-tag">{node.label}</div>
          <div className="font-display text-[36px] tracking-tight mt-1" style={{ color: ACCENT[node.accent] || "var(--ivory)" }}>{node.value}</div>
        </motion.div>
      );
    case "badge":
      return <motion.span {...a} key={idx} className="inline-block text-[11px] px-3 py-1 rounded-full border font-mono uppercase tracking-wider" style={{ color: ACCENT[node.tone] || "var(--ivory)", borderColor: (ACCENT[node.tone] || "rgba(255,255,255,0.3)") + "40" }}>{node.text}</motion.span>;
    case "list":
      return (
        <motion.ul {...a} key={idx} className="space-y-1.5">
          {(node.items || []).map((it, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--ivory)]/80">
              <span className="text-[var(--acid)] mt-1 text-[10px]">◇</span>
              <span>{it}</span>
            </li>
          ))}
        </motion.ul>
      );
    case "kv":
      return (
        <motion.div {...a} key={idx} className="glass rounded-2xl divide-y divide-white/[0.06]">
          {(node.pairs || []).map((p, i) => (
            <div key={i} className="flex items-baseline justify-between px-5 py-3">
              <span className="text-[11px] uppercase tracking-widest text-[var(--ivory)]/50 font-mono">{p.k}</span>
              <span className="text-[13px] text-[var(--ivory)]">{p.v}</span>
            </div>
          ))}
        </motion.div>
      );
    case "card":
      return (
        <motion.div {...a} key={idx} className="glass rounded-2xl px-5 py-4">
          {node.title && <div className="font-display text-[18px] tracking-tight mb-1.5 text-[var(--ivory)]">{node.title}</div>}
          {node.body && <div className="text-[13px] text-[var(--ivory)]/70 leading-relaxed font-display">{node.body}</div>}
        </motion.div>
      );
    case "callout": {
      const tone = ACCENT[node.tone] || "var(--acid)";
      return (
        <motion.div {...a} key={idx} className="rounded-2xl px-4 py-3 border" style={{ borderColor: tone + "40", background: tone + "0a", color: tone }}>
          <div className="text-[13px]">{node.text}</div>
        </motion.div>
      );
    }
    case "chart_bar": {
      const data = node.data || [];
      const max = Math.max(1, ...data.map((d) => d.value || 0));
      return (
        <motion.div {...a} key={idx} className="glass rounded-2xl px-5 py-4 space-y-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="text-[11px] text-[var(--ivory)]/60 w-24 truncate font-mono">{d.label}</div>
              <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(d.value / max) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.05 }} className="h-full rounded-full" style={{ background: "var(--acid)" }} />
              </div>
              <div className="text-[11px] w-10 text-right font-mono text-[var(--acid)]">{d.value}</div>
            </div>
          ))}
        </motion.div>
      );
    }
    case "grid": {
      const cols = Math.min(4, Math.max(2, node.columns || 2));
      return (
        <motion.div {...a} key={idx} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {(node.children || []).map((c, i) => renderOne(c, i))}
        </motion.div>
      );
    }
    case "container":
      return (
        <motion.div {...a} key={idx} className="flex flex-col gap-3">
          {(node.children || []).map((c, i) => renderOne(c, i))}
        </motion.div>
      );
    case "divider":
      return <motion.div {...a} key={idx} className="h-px bg-white/[0.08] my-2" />;
    case "code":
      return (
        <motion.pre {...a} key={idx} className="glass rounded-2xl p-4 overflow-x-auto thin-scroll">
          <code className="text-[11px] text-[var(--ivory)]/85 font-mono whitespace-pre">{node.content}</code>
        </motion.pre>
      );
    default:
      return null;
  }
}

/** Renders a GenUI schema produced by the runtime. */
export default function GenUIRenderer({ schema }) {
  if (!schema) return null;
  return (
    <div className="p-8 max-w-[900px]">
      {schema.title ? (
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="display-hero text-[var(--ivory)]" style={{ fontSize: "clamp(28px, 4vw, 46px)" }}>
          {schema.title}
        </motion.h2>
      ) : null}
      {schema.subtitle ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-[var(--ivory)]/55 text-sm mt-2 font-display">
          {schema.subtitle}
        </motion.p>
      ) : null}
      <div className="mt-8 flex flex-col gap-4">
        {(schema.components || []).map((c, i) => renderOne(c, i))}
      </div>
    </div>
  );
}
