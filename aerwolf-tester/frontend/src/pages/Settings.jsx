import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { MODELS } from "../lib/models";
import { Key, Loader2, Save, CheckCircle2, AlertTriangle } from "lucide-react";

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [localUrl, setLocalUrl] = useState("");
  const [localModel, setLocalModel] = useState("");
  const [modelIdx, setModelIdx] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/settings");
        setSettings(r.data);
        setLocalUrl(r.data.local_llm_base_url || "");
        setLocalModel(r.data.local_llm_model || "");
        const idx = MODELS.findIndex((m) => m.provider === r.data.default_provider && m.model === r.data.default_model);
        if (idx >= 0) setModelIdx(idx);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      const m = MODELS[modelIdx];
      const payload = {
        default_provider: m.provider,
        default_model: m.model,
        local_llm_base_url: localUrl,
        local_llm_model: localModel,
      };
      if (openrouterKey.trim()) payload.openrouter_key = openrouterKey.trim();
      const r = await api.put("/settings", payload);
      setSettings(r.data);
      setOpenrouterKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const clearKey = async () => {
    setSaving(true);
    try {
      const r = await api.put("/settings", { openrouter_key: "" });
      setSettings(r.data);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="absolute inset-0 aer-grid opacity-25 pointer-events-none" />
      <div className="relative z-10 max-w-3xl mx-auto px-6 sm:px-10 py-12">
        <div className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-2">
          <span className="text-[#00E5FF]">◉</span> Configuration
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tighter uppercase mb-8">
          <span className="text-[#00E5FF]">Settings</span>
        </h1>

        {loading ? (
          <div className="flex items-center gap-2 text-white/50 text-sm"><Loader2 size={14} className="animate-spin" /> Loading...</div>
        ) : (
          <div className="space-y-8">
            {/* Default model */}
            <section className="glass p-6">
              <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#FFB000] mb-4">Default LLM</div>
              <select
                data-testid="settings-default-model"
                value={modelIdx}
                onChange={(e) => setModelIdx(parseInt(e.target.value))}
                className="w-full bg-[#0D0D12] border border-white/15 focus:border-[#00E5FF] outline-none text-sm font-mono px-4 py-3"
              >
                {MODELS.map((m, i) => (
                  <option key={i} value={i}>
                    {m.label} · {m.tag === "open" ? "open-source" : "closed"}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-[10px] font-mono text-white/40">
                Used across the app for wisdom, algorithm suggestions, tech finder, hyperframes, comparisons and skill.md export.
              </div>
            </section>

            {/* OpenRouter BYO */}
            <section className="glass p-6">
              <div className="flex items-center gap-2 mb-4">
                <Key size={12} className="text-[#00E5FF]" />
                <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#00E5FF]">OpenRouter · BYO Key</span>
                {settings?.openrouter_key_set ? (
                  <span className="ml-auto text-[9px] tracking-widest uppercase font-bold text-[#00E5FF] flex items-center gap-1" data-testid="settings-openrouter-status-set">
                    <CheckCircle2 size={11} /> Key set
                  </span>
                ) : settings?.openrouter_demo_available ? (
                  <span className="ml-auto text-[9px] tracking-widest uppercase text-white/40" data-testid="settings-openrouter-status-demo">
                    Using shared demo key
                  </span>
                ) : (
                  <span className="ml-auto text-[9px] tracking-widest uppercase text-[#FF0055] flex items-center gap-1" data-testid="settings-openrouter-status-missing">
                    <AlertTriangle size={11} /> No key
                  </span>
                )}
              </div>
              <input
                data-testid="settings-openrouter-input"
                type="password"
                placeholder="sk-or-v1-..."
                value={openrouterKey}
                onChange={(e) => setOpenrouterKey(e.target.value)}
                className="w-full bg-[#0D0D12] border border-white/15 focus:border-[#00E5FF] outline-none text-sm font-mono px-4 py-3"
                autoComplete="off"
              />
              <div className="mt-2 text-[10px] font-mono text-white/40">
                Get one at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-[#00E5FF] hover:underline">openrouter.ai/keys</a>. Stored per user, only used server-side.
              </div>
              {settings?.openrouter_key_set && (
                <button
                  data-testid="settings-openrouter-clear-btn"
                  onClick={clearKey}
                  className="mt-3 text-[10px] tracking-widest uppercase font-bold text-[#FF0055] hover:underline"
                >
                  Clear stored key
                </button>
              )}
            </section>

            {/* Local LLM (Ollama / LM Studio) */}
            <section className="glass p-6">
              <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-[color:var(--brand)] mb-4">Local LLM · Ollama / LM Studio</div>
              <div className="grid gap-3">
                <input
                  data-testid="settings-local-url-input"
                  value={localUrl}
                  onChange={(e) => setLocalUrl(e.target.value)}
                  placeholder="Base URL (e.g. http://localhost:11434/v1 for Ollama, http://localhost:1234/v1 for LM Studio)"
                  className="w-full bg-[color:var(--surface-100)] border border-[color:var(--border-strong)] focus:border-[color:var(--brand)] outline-none text-sm font-mono px-4 py-3 rounded-[8px]"
                  autoComplete="off"
                />
                <input
                  data-testid="settings-local-model-input"
                  value={localModel}
                  onChange={(e) => setLocalModel(e.target.value)}
                  placeholder="Model name (e.g. llama3.2, qwen2.5:7b, mistral)"
                  className="w-full bg-[color:var(--surface-100)] border border-[color:var(--border-strong)] focus:border-[color:var(--brand)] outline-none text-sm font-mono px-4 py-3 rounded-[8px]"
                  autoComplete="off"
                />
              </div>
              <div className="mt-2 text-[10px] font-mono text-[color:var(--text-tertiary)]">
                OpenAI-compatible endpoint · Only reachable server-side · Select &quot;Local · Ollama / LM Studio&quot; in the workspace model picker to use.
              </div>
            </section>

            <div className="flex items-center gap-3">
              <button
                data-testid="settings-save-btn"
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 bg-[#00E5FF] text-black px-6 py-3 text-xs font-black tracking-widest uppercase hover:bg-white transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
              </button>
              {saved && <span data-testid="settings-saved-flash" className="text-[10px] tracking-widest uppercase text-[#00E5FF]">✓ saved</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
