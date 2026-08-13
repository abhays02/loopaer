import React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Download, Sparkles, Copy } from "lucide-react";
import { API } from "../lib/api";

function download(name, content) {
  const blob = new Blob([typeof content === "string" ? content : JSON.stringify(content, null, 2)], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const EXPORT_TARGETS = [
  { id: "claude", label: "Claude", filename: (n) => `${n}.claude-skill.json`, blurb: "Import into a Claude Project as a custom skill." },
  { id: "cursor", label: "Cursor", filename: () => `.cursorrules`,             blurb: "Drop into your repo root as .cursorrules." },
  { id: "openai", label: "OpenAI Agent", filename: (n) => `${n}.openai-agent.json`, blurb: "Feed to the OpenAI Agents SDK." },
  { id: "mcp",    label: "MCP",    filename: (n) => `${n}.mcp.json`,           blurb: "Register with any MCP-compatible client." },
];

export default function SkillPanel({ skill, onGenerate }) {
  if (!skill) {
    return (
      <div className="p-12">
        <div className="label-tag">skill builder idle</div>
        <div className="font-display text-4xl mt-3 leading-tight max-w-2xl">
          Once research is <em className="font-serif italic text-[var(--ivory)]/60">verified</em>, the runtime compiles it into a portable AI skill.
        </div>
        <button data-testid="generate-skill-btn" onClick={onGenerate} className="btn-primary mt-8 inline-flex items-center gap-2">
          <Sparkles size={14} /> compile skill
        </button>
      </div>
    );
  }

  const asJson = JSON.stringify(skill, null, 2);

  const doExport = async (fmt) => {
    try {
      const r = await fetch(`${API}/skills/${skill.id}/export/${fmt}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "export failed");
      const target = EXPORT_TARGETS.find((t) => t.id === fmt);
      const filename = target.filename(skill.name || "skill");
      download(filename, d.payload);
      toast.success(`${target.label} export`, { description: filename });
    } catch (e) {
      toast.error("Export failed", { description: e.message });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="label-tag">portable skill</div>
          <div className="font-display text-4xl mt-1 tracking-tight text-[var(--ivory)]">{skill.name}</div>
          <div className="text-[var(--ivory)]/60 mt-2 max-w-2xl">{skill.purpose}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { navigator.clipboard.writeText(asJson); toast("copied JSON"); }} className="btn-ghost inline-flex items-center gap-2 text-xs">
            <Copy size={12} /> JSON
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="label-tag mb-3">one-click exports</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {EXPORT_TARGETS.map((t) => (
            <motion.button
              key={t.id}
              onClick={() => doExport(t.id)}
              data-testid={`export-${t.id}`}
              whileHover={{ y: -3 }}
              className="glass rounded-2xl px-4 py-4 text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="font-display text-[15px] tracking-tight text-[var(--ivory)]">{t.label}</div>
                <Download size={13} className="text-[var(--ivory)]/40 group-hover:text-[var(--acid)] transition-colors" />
              </div>
              <div className="text-[11px] text-[var(--ivory)]/50 mt-1 font-mono">{t.blurb}</div>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="glass rounded-xl p-5">
          <div className="label-tag mb-2">system prompt</div>
          <pre className="text-[11px] text-[var(--ivory)]/85 whitespace-pre-wrap leading-relaxed font-mono">{skill.system_prompt}</pre>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="label-tag mb-2">workflow</div>
          <ol className="text-[12px] text-[var(--ivory)]/85 space-y-1.5 list-decimal list-inside">
            {(skill.workflow || []).map((w, i) => <li key={i}>{w}</li>)}
          </ol>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="label-tag mb-2">tool requirements</div>
          <div className="flex flex-wrap gap-2">
            {(skill.tool_requirements || []).map((t, i) => (
              <span key={i} className="text-[11px] px-2 py-1 rounded-full border border-white/12 text-[var(--ivory)]/80">{t}</span>
            ))}
          </div>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="label-tag mb-2">recommended models</div>
          <div className="flex flex-wrap gap-2">
            {(skill.recommended_models || []).map((m, i) => (
              <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-[var(--acid)]/10 border border-[var(--acid)]/30 text-[var(--acid)] font-mono">{m}</span>
            ))}
          </div>
        </div>
        <div className="glass rounded-xl p-5 md:col-span-2">
          <div className="label-tag mb-2">failure modes</div>
          <div className="text-[11px] text-[var(--ivory)]/70 grid grid-cols-1 md:grid-cols-2 gap-2">
            {(skill.failure_modes || []).map((f, i) => <div key={i} className="flex items-start gap-2"><span className="text-[var(--hot)]">×</span> {f}</div>)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
