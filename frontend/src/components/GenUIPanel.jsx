import React, { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, Wand2 } from "lucide-react";
import GenUIRenderer from "./GenUIRenderer";

const PRESETS = [
  "Summarize the current session's verified facts as stat cards + a top-5 list",
  "Show a comparison of the loops running in this session with iteration counts",
  "Design a briefing card explaining the goal, plan tasks, and confidence estimate",
  "Render a mini dashboard: total facts, entities, sources, avg confidence, gaps found",
];

/** GenUI panel — user gives an intent, the runtime generates a UI schema.
 *  Renders live using the small safe component grammar. Free models only. */
export default function GenUIPanel({ session, knowledge }) {
  const [intent, setIntent] = useState("");
  const [schema, setSchema] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async (text) => {
    const q = (text ?? intent).trim();
    if (!q) return;
    setIntent(q);
    setBusy(true);
    setSchema(null);
    try {
      const backend = process.env.REACT_APP_BACKEND_URL;
      const ctx = {
        goal: session?.goal,
        facts_count: knowledge?.facts?.length,
        entities_count: knowledge?.entities?.length,
        sources_count: knowledge?.sources?.length,
        top_facts: (knowledge?.facts || []).slice(0, 6).map((f) => ({ text: f.text, conf: f.verified_confidence })),
        loops: (session?.loops || []).map((l) => ({ kind: l.kind, state: l.state, iterations: l.iterations })),
      };
      const r = await fetch(`${backend}/api/genui`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: q, context: ctx }),
      });
      const data = await r.json();
      if (data?.schema) setSchema(data.schema);
      else toast.error("GenUI failed", { description: data?.detail?.slice(0, 120) });
    } catch (e) {
      toast.error("GenUI failed", { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="label-tag mb-2">GENUI · LLM-GENERATED INTERFACE</div>
          <div className="font-display text-3xl tracking-tight leading-tight">
            Ask for a UI. Get a UI.
          </div>
          <div className="text-[var(--ivory)]/55 mt-2 max-w-2xl text-sm font-display">
            The runtime picks components and layout from a small safe grammar. Free models only.
            Session context is streamed in automatically.
          </div>
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-2.5 flex items-center gap-2 max-w-[860px]">
        <div className="pl-3 text-[var(--acid)]">
          <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
            <Wand2 size={16} />
          </motion.div>
        </div>
        <input
          data-testid="genui-intent-input"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Describe the UI you want…"
          className="flex-1 bg-transparent outline-none text-[var(--ivory)] font-display px-2 py-2.5 placeholder:text-[var(--ivory)]/30"
        />
        <button
          data-testid="genui-generate-btn"
          onClick={() => run()}
          disabled={busy || !intent.trim()}
          className="btn-primary disabled:opacity-40 inline-flex items-center gap-2 text-[13px]"
        >
          {busy ? "generating…" : (<><Sparkles size={13} /> Generate</>)}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 max-w-[860px]">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => run(p)}
            className="text-[11px] font-mono px-2.5 py-1 rounded-full text-[var(--ivory)]/45 hover:text-[var(--ivory)] hover:bg-white/[0.04] transition-colors border border-white/[0.08]"
          >
            {p.slice(0, 60)}…
          </button>
        ))}
      </div>

      <motion.div
        key={schema ? "loaded" : busy ? "loading" : "idle"}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-10"
      >
        {busy && (
          <div className="glass rounded-2xl p-12 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 mx-auto border-2 border-white/10 border-t-[var(--acid)] rounded-full"
            />
            <div className="mt-4 text-[13px] text-[var(--ivory)]/50 font-mono">the model is choosing components…</div>
          </div>
        )}
        {!busy && !schema && (
          <div className="text-[13px] text-[var(--ivory)]/40 font-mono">— no UI yet · type an intent or pick a preset —</div>
        )}
        {schema && <GenUIRenderer schema={schema} />}
      </motion.div>
    </div>
  );
}
