import React, { useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, RefreshCcw } from "lucide-react";

/**
 * ScorePromptWidget — public interactive marketing demo.
 * Paste any prompt → grades it on 4 axes + suggests a pipeline-ready rewrite.
 * No auth required.
 */
export default function ScorePromptWidget() {
  const [prompt, setPrompt] = useState("Write me an essay about the French Revolution");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const score = async () => {
    if (!prompt.trim()) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await api.post("/prompt/score", { prompt });
      setResult(r.data);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to score");
    } finally { setBusy(false); }
  };

  const axes = result ? [
    { key: "determinism",    label: "Determinism",     value: result.determinism, color: "var(--data-cyan)" },
    { key: "citability",     label: "Citability",      value: result.citability, color: "var(--data-amber)" },
    { key: "specificity",    label: "Specificity",     value: result.specificity, color: "var(--data-lime)" },
    { key: "decomposability", label: "Decomposability", value: result.decomposability, color: "var(--brand)" },
  ] : [];

  return (
    <div className="glass p-6 sm:p-8 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-[color:var(--data-cyan)]" />
        <span className="text-[11px] tracking-[0.25em] uppercase font-medium text-[color:var(--data-cyan)]">Try it live · no signup</span>
      </div>
      <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-1">Score your prompt.</h3>
      <p className="text-[color:var(--text-secondary)] text-sm mb-5">
        Paste any prompt you send to an LLM. We&apos;ll grade its determinism, citability, specificity, and decomposability — then show you the pipeline-ready rewrite.
      </p>

      <div className="grid md:grid-cols-[1fr_140px] gap-3 mb-6">
        <textarea
          data-testid="score-prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="e.g. Summarize this earnings report..."
          className="bg-[color:var(--surface-100)] border border-[color:var(--border-strong)] focus:border-[color:var(--data-cyan)] outline-none px-4 py-3 rounded-[10px] text-sm font-mono resize-none text-white placeholder:text-white/25"
        />
        <button
          data-testid="score-prompt-btn"
          onClick={score}
          disabled={busy || !prompt.trim()}
          className="btn-brand flex items-center justify-center gap-2 disabled:opacity-40 !py-3"
        >
          {busy ? <><Loader2 size={14} className="animate-spin" /> Scoring</> : <><Sparkles size={14} /> Score</>}
        </button>
      </div>

      {error && (
        <div className="border border-[#ff4a4a]/40 bg-[#ff4a4a]/5 text-[#ff4a4a] text-xs font-mono p-3 rounded-[10px]" data-testid="score-prompt-error">
          {error}
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4" data-testid="score-prompt-result">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {axes.map((a) => (
              <div key={a.key} className="border border-[color:var(--border-strong)] rounded-[10px] p-3">
                <div className="flex justify-between text-[10px] tracking-widest uppercase mb-1">
                  <span className="text-[color:var(--text-tertiary)]">{a.label}</span>
                  <span style={{ color: a.color }}>{a.value}</span>
                </div>
                <div className="h-1.5 bg-[color:var(--surface-200)] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, a.value)}%` }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: a.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="border border-[color:var(--border-strong)] rounded-[10px] p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={12} className="text-[#ff4a4a]" />
                <span className="text-[10px] tracking-widest uppercase text-[#ff4a4a]">Hallucination risk</span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-display text-3xl font-bold" style={{ color: (result.hallucination_risk || 0) >= 50 ? "#ff4a4a" : "var(--data-lime)" }}>
                  {result.hallucination_risk}%
                </span>
              </div>
              <div className="h-1.5 bg-[color:var(--surface-200)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, result.hallucination_risk || 0)}%` }}
                  transition={{ duration: 1.4 }}
                  className="h-full"
                  style={{ background: (result.hallucination_risk || 0) >= 50 ? "#ff4a4a" : "var(--data-lime)" }}
                />
              </div>
              <div className="text-[11px] text-[color:var(--text-secondary)] mt-3 leading-relaxed font-mono">{result.verdict}</div>
            </div>

            <div className="border border-[color:var(--brand)]/40 bg-[color:var(--brand)]/5 rounded-[10px] p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 size={12} className="text-[color:var(--brand)]" />
                <span className="text-[10px] tracking-widest uppercase text-[color:var(--brand)]">Pipeline-ready rewrite</span>
              </div>
              <div className="text-[12px] text-white/90 font-mono leading-relaxed" data-testid="score-prompt-rewrite">
                {result.fixed_prompt}
              </div>
            </div>
          </div>

          <button onClick={() => { setResult(null); }} className="text-[10px] tracking-widest uppercase text-[color:var(--text-tertiary)] hover:text-[color:var(--brand)] flex items-center gap-1">
            <RefreshCcw size={10} /> Try another
          </button>
        </motion.div>
      )}
    </div>
  );
}
