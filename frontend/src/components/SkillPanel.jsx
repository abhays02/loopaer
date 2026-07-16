import React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Download, Sparkles, Copy } from "lucide-react";

function download(name, content) {
  const blob = new Blob([content], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function SkillPanel({ skill, onGenerate }) {
  if (!skill) {
    return (
      <div className="p-12">
        <div className="label-tag">skill builder idle</div>
        <div className="font-display text-4xl mt-3 leading-tight max-w-2xl">
          Once research is <span className="italic font-serif text-white/60">verified</span>, the runtime can compile it into a portable AI skill.
        </div>
        <button data-testid="generate-skill-btn" onClick={onGenerate} className="btn-acid mt-8 inline-flex items-center gap-2">
          <Sparkles size={14} /> compile skill
        </button>
      </div>
    );
  }

  const asJson = JSON.stringify(skill, null, 2);
  const asMarkdown = `# ${skill.name}\n\n${skill.purpose || ""}\n\n## System Prompt\n\n\`\`\`\n${skill.system_prompt || ""}\n\`\`\`\n\n## Workflow\n${(skill.workflow || []).map((w, i) => `${i+1}. ${w}`).join("\n")}\n\n## Tool Requirements\n${(skill.tool_requirements || []).map(t => `- ${t}`).join("\n")}\n\n## Recommended Models\n${(skill.recommended_models || []).map(m => `- ${m}`).join("\n")}\n\n## Example\n**Input:** ${skill.example_input || ""}\n\n**Output:** ${skill.example_output || ""}\n\n## Failure Modes\n${(skill.failure_modes || []).map(f => `- ${f}`).join("\n")}\n\n_Version: ${skill.version || "1.0.0"}_\n`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10">
      <div className="flex items-start justify-between">
        <div>
          <div className="label-tag">portable skill</div>
          <div className="font-display text-4xl mt-1 tracking-tight">{skill.name}</div>
          <div className="text-white/60 mt-2 max-w-2xl">{skill.purpose}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { navigator.clipboard.writeText(asJson); toast("copied JSON"); }} className="btn-ghost inline-flex items-center gap-2 text-xs">
            <Copy size={12} /> JSON
          </button>
          <button onClick={() => download(`${skill.name}.md`, asMarkdown)} className="btn-acid inline-flex items-center gap-2 text-xs" data-testid="export-skill-md-btn">
            <Download size={12} /> SKILL.md
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-5">
          <div className="label-tag mb-2">system prompt</div>
          <pre className="text-[11px] text-white/85 whitespace-pre-wrap leading-relaxed font-mono">{skill.system_prompt}</pre>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="label-tag mb-2">workflow</div>
          <ol className="text-[12px] text-white/85 space-y-1.5 list-decimal list-inside">
            {(skill.workflow || []).map((w, i) => <li key={i}>{w}</li>)}
          </ol>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="label-tag mb-2">tool requirements</div>
          <div className="flex flex-wrap gap-2">
            {(skill.tool_requirements || []).map((t, i) => (
              <span key={i} className="text-[11px] px-2 py-1 rounded-full border border-white/12 text-white/80">{t}</span>
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
        <div className="glass rounded-xl p-5 col-span-2">
          <div className="label-tag mb-2">failure modes</div>
          <div className="text-[11px] text-white/70 grid grid-cols-2 gap-2">
            {(skill.failure_modes || []).map((f, i) => <div key={i} className="flex items-start gap-2"><span className="text-[var(--hot)]">×</span> {f}</div>)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
