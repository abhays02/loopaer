import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { MODELS } from "../lib/models";
import {
  Save, Loader2, Plus, FileText, Sparkles, Link as LinkIcon, X,
  ArrowRight, BookOpen, MessageSquare, Trash2, Eye, EyeOff,
  Zap, Scissors, ListChecks, Shield, Expand,
} from "lucide-react";
import { withSkillMentions } from "../components/SkillMention";
import MarkdownPreview from "../components/MarkdownPreview";

const TRANSFORMATIONS = [
  { key: "summarize",     label: "Summarize",    icon: Scissors },
  { key: "expand",        label: "Expand",       icon: Expand },
  { key: "critique",      label: "Critique",     icon: Shield },
  { key: "extract_todos", label: "Extract todos", icon: ListChecks },
  { key: "counterargue",  label: "Steelman counter", icon: Zap },
];

/**
 * Notebook — open-notebook style research surface.
 * Layout: [Markdown editor] │ [Sources rail]  with bottom sticky Chat bar and STORM report action.
 */
export default function Notebook() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [nb, setNb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modelIdx, setModelIdx] = useState(0);
  const [newSource, setNewSource] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [stormBusy, setStormBusy] = useState(false);
  const [compileBusy, setCompileBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [transformBusy, setTransformBusy] = useState(null);
  const model = MODELS[modelIdx];

  const runTransform = async (action) => {
    if (!nb) return;
    setTransformBusy(action);
    try {
      await save({});
      const r = await api.post("/notebooks/transform", { notebook_id: nb.id, action, provider: model.provider, model: model.model });
      const out = r.data?.output || "";
      await save({ markdown: (nb.markdown || "").trimEnd() + "\n\n" + out.trim() + "\n" });
    } catch (e) { console.error(e); alert("Transform failed: " + (e?.response?.data?.detail || e.message)); }
    finally { setTransformBusy(null); }
  };

  useEffect(() => {
    (async () => {
      try {
        if (id === "new") {
          const r = await api.post("/notebooks", { title: "Untitled research", topic: "", markdown: "" });
          navigate(`/notebook/${r.data.id}`, { replace: true });
          return;
        }
        const r = await api.get(`/notebooks/${id}`);
        setNb(r.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id, navigate]);

  const save = async (patch = {}) => {
    if (!nb) return;
    setSaving(true);
    try {
      const merged = { ...nb, ...patch };
      const r = await api.put(`/notebooks/${nb.id}`, {
        title: merged.title, topic: merged.topic, markdown: merged.markdown,
        sources: merged.sources || [], chat: merged.chat || [],
      });
      setNb(r.data);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const addSource = async () => {
    const s = newSource.trim();
    if (!s) return;
    const isUrl = /^https?:\/\//.test(s);
    const isArxiv = /arxiv\.org|\d{4}\.\d{4,5}/.test(s.toLowerCase());
    const src = isUrl
      ? { kind: isArxiv ? "arxiv" : "url", title: s, url: s, added_at: new Date().toISOString() }
      : { kind: "note", title: s.slice(0, 80), text: s, added_at: new Date().toISOString() };
    setNewSource("");
    await save({ sources: [...(nb.sources || []), src] });
  };

  const removeSource = async (idx) => {
    const next = [...(nb.sources || [])];
    next.splice(idx, 1);
    await save({ sources: next });
  };

  const runStorm = async () => {
    if (!nb?.topic?.trim()) { alert("Set a topic first"); return; }
    setStormBusy(true);
    try {
      const r = await api.post("/storm/report", { topic: nb.topic, perspectives: 3, provider: model.provider, model: model.model });
      const md = renderStormMarkdown(r.data);
      await save({ markdown: (nb.markdown || "") + "\n\n" + md });
    } catch (e) { console.error(e); alert("STORM failed: " + (e?.response?.data?.detail || e.message)); }
    finally { setStormBusy(false); }
  };

  const compileToCanvas = async () => {
    if (!nb) return;
    setCompileBusy(true);
    try {
      // save first
      await save({});
      const r = await api.post("/notebooks/compile", { notebook_id: nb.id, provider: model.provider, model: model.model });
      // seed workspace via sessionStorage
      sessionStorage.setItem("aerwolf_seeded_graph", JSON.stringify({
        nodes: r.data.nodes || [], edges: r.data.edges || [],
        topic: r.data.topic || nb.topic, name: r.data.name || nb.title,
      }));
      navigate(`/workspace?topic=${encodeURIComponent(r.data.topic || nb.topic || "")}&seeded=1`);
    } catch (e) { console.error(e); alert("Compile failed: " + (e?.response?.data?.detail || e.message)); }
    finally { setCompileBusy(false); }
  };

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || !nb) return;
    setChatBusy(true);
    const nextChat = [...(nb.chat || []), { role: "user", content: q, at: new Date().toISOString() }];
    setChatInput("");
    setNb({ ...nb, chat: nextChat });
    try {
      // Reuse wisdom for a quick research answer grounded in topic + notebook markdown
      const system = "You are a research assistant grounded in the user's notebook. Answer concisely (max 6 short paragraphs). Cite sources by title when useful.";
      const notebookCtx = `Topic: ${nb.topic}\nSources: ${(nb.sources || []).map((s) => s.title).join(" · ")}\n\nNotebook markdown so far:\n${(nb.markdown || "").slice(0, 3000)}\n\nUser question: ${q}`;
      const r = await api.post("/wisdom", { topic: notebookCtx, provider: model.provider, model: model.model });
      // Wisdom returns structured JSON; render its summary as chat answer
      const answer = r.data.summary || JSON.stringify(r.data).slice(0, 600);
      const finalChat = [...nextChat, { role: "assistant", content: answer, at: new Date().toISOString() }];
      await save({ chat: finalChat });
    } catch (e) { console.error(e); }
    finally { setChatBusy(false); }
  };

  if (loading) return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-white/50 text-sm"><Loader2 className="animate-spin mr-2" size={14}/> Loading notebook...</div>;
  if (!nb) return <div className="p-10 text-white/60">Notebook not found.</div>;

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="absolute inset-0 liquid-glass pointer-events-none" />
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            data-testid="notebook-title-input"
            value={nb.title}
            onChange={(e) => setNb({ ...nb, title: e.target.value })}
            onBlur={() => save({})}
            className="bg-transparent text-2xl sm:text-3xl font-display font-bold tracking-tight outline-none flex-1 min-w-[200px] border-b border-transparent focus:border-[color:var(--brand)] transition-colors"
            placeholder="Untitled research"
          />
          <input
            data-testid="notebook-topic-input"
            value={nb.topic}
            onChange={(e) => setNb({ ...nb, topic: e.target.value })}
            onBlur={() => save({})}
            className="bg-[color:var(--surface-100)] border border-[color:var(--border-strong)] focus:border-[color:var(--brand)] outline-none text-sm font-mono px-3 py-2 rounded-[8px] w-40"
            placeholder="topic (e.g. OCR)"
          />
          <select
            data-testid="notebook-model-select"
            value={modelIdx}
            onChange={(e) => setModelIdx(parseInt(e.target.value))}
            className="bg-[color:var(--surface-100)] border border-[color:var(--border-strong)] text-xs font-mono px-3 py-2 rounded-[8px] outline-none focus:border-[color:var(--brand)]"
          >
            {MODELS.map((m, i) => <option key={i} value={i}>{m.label}</option>)}
          </select>
          <button data-testid="notebook-storm-btn" onClick={runStorm} disabled={stormBusy} className="btn-ghost flex items-center gap-2 disabled:opacity-50">
            {stormBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} STORM report
          </button>
          <button data-testid="notebook-compile-btn" onClick={compileToCanvas} disabled={compileBusy} className="btn-brand flex items-center gap-2 disabled:opacity-50">
            {compileBusy ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />} Compile to Canvas
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          {/* Markdown editor */}
          <div className="glass p-5 relative">
            <div className="flex items-center gap-2 mb-3 text-[11px] tracking-widest uppercase text-[color:var(--text-secondary)]">
              <FileText size={12} /> Notebook · markdown
              <button
                data-testid="notebook-preview-toggle"
                onClick={() => setPreview((p) => !p)}
                className="ml-3 flex items-center gap-1 text-[color:var(--brand)] hover:text-white transition-colors"
                title="Toggle preview"
              >
                {preview ? <EyeOff size={11} /> : <Eye size={11} />}
                {preview ? "Edit" : "Preview"}
              </button>
              {saving && <span className="ml-auto flex items-center gap-1 text-[color:var(--brand)]"><Loader2 size={10} className="animate-spin" /> saving</span>}
            </div>
            {preview ? (
              <div className="min-h-[380px] p-2" data-testid="notebook-preview-pane">
                <MarkdownPreview source={nb.markdown} />
              </div>
            ) : (
              <textarea
                data-testid="notebook-markdown-editor"
                value={nb.markdown}
                onChange={(e) => setNb({ ...nb, markdown: e.target.value })}
                onBlur={() => save({})}
                placeholder="# Your research notebook

Paste papers, jot ideas, ask questions. Mention a saved skill with [[skill: my-pipeline]] — it becomes a clickable pill.

Click **STORM report** to auto-populate a cited overview, or **Compile to Canvas** to turn this into a runnable pipeline."
                className="w-full min-h-[380px] bg-transparent text-sm leading-relaxed font-mono resize-y outline-none text-white/90 placeholder:text-white/25"
              />
            )}
            {!preview && /(\[\[skill:)/.test(nb.markdown || "") && (
              <div className="mt-4 border-t border-[color:var(--border-strong)] pt-3">
                <div className="flex items-center gap-2 mb-2 text-[10px] tracking-widest uppercase text-[color:var(--text-tertiary)]">
                  <Eye size={11} /> Skill mentions preview
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono text-white/85" data-testid="notebook-mentions-preview">
                  {withSkillMentions(nb.markdown)}
                </div>
              </div>
            )}
          </div>

          {/* Sources rail */}
          <div className="space-y-4">
            <div className="glass p-4">
              <div className="flex items-center gap-2 mb-3 text-[11px] tracking-widest uppercase text-[color:var(--text-secondary)]">
                <LinkIcon size={12} /> Sources
                <span className="ml-auto text-[color:var(--text-tertiary)]">{(nb.sources || []).length}</span>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); addSource(); }} className="flex gap-2 mb-3">
                <input
                  data-testid="notebook-source-input"
                  value={newSource} onChange={(e) => setNewSource(e.target.value)}
                  placeholder="arxiv id, URL, or a note..."
                  className="flex-1 bg-[color:var(--surface-100)] border border-[color:var(--border-strong)] outline-none focus:border-[color:var(--brand)] px-3 py-2 text-xs font-mono rounded-[8px]"
                />
                <button data-testid="notebook-source-add" className="btn-ghost !py-2 !px-3"><Plus size={12} /></button>
              </form>
              <div className="space-y-2 max-h-[380px] overflow-y-auto">
                {(nb.sources || []).map((s, i) => (
                  <div key={i} data-testid={`notebook-source-${i}`} className="border border-[color:var(--border-strong)] rounded-[8px] p-2.5 flex items-start gap-2 group">
                    <span className="text-[9px] tracking-widest uppercase text-[color:var(--brand)] shrink-0 mt-0.5">{s.kind}</span>
                    <div className="flex-1 min-w-0">
                      {s.url
                        ? <a href={s.url} target="_blank" rel="noreferrer" className="text-[11px] text-white/85 hover:text-[color:var(--brand)] transition-colors line-clamp-2 break-all">{s.title}</a>
                        : <div className="text-[11px] text-white/85 line-clamp-2">{s.title}</div>}
                    </div>
                    <button data-testid={`notebook-source-remove-${i}`} onClick={() => removeSource(i)} className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-[color:var(--brand)] transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {(nb.sources || []).length === 0 && <div className="text-white/40 text-xs font-mono py-3 text-center">no sources yet</div>}
              </div>
            </div>

            {/* Chat */}
            <div className="glass p-4">
              <div className="flex items-center gap-2 mb-3 text-[11px] tracking-widest uppercase text-[color:var(--text-secondary)]">
                <MessageSquare size={12} /> Ask · grounded chat
              </div>
              <div className="space-y-2 max-h-[220px] overflow-y-auto mb-2 text-xs" data-testid="notebook-chat-log">
                {(nb.chat || []).slice(-6).map((m, i) => (
                  <div key={i} className={`p-2 rounded-[8px] ${m.role === "user" ? "bg-[color:var(--surface-200)]" : "bg-[color:var(--surface-100)] border border-[color:var(--border-strong)]"}`}>
                    <div className={`text-[9px] tracking-widest uppercase mb-1 ${m.role === "user" ? "text-white/60" : "text-[color:var(--brand)]"}`}>{m.role}</div>
                    <div className="text-white/85 font-mono leading-relaxed whitespace-pre-wrap">{m.content}</div>
                  </div>
                ))}
                {(nb.chat || []).length === 0 && <div className="text-white/30 font-mono py-3 text-center">no messages</div>}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} className="flex gap-2">
                <input
                  data-testid="notebook-chat-input"
                  value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  placeholder="ask about your topic..."
                  className="flex-1 bg-[color:var(--surface-100)] border border-[color:var(--border-strong)] outline-none focus:border-[color:var(--brand)] px-3 py-2 text-xs font-mono rounded-[8px]"
                  disabled={chatBusy}
                />
                <button data-testid="notebook-chat-send" disabled={chatBusy} className="btn-brand !py-2 !px-3 disabled:opacity-50">
                  {chatBusy ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderStormMarkdown(report) {
  if (!report) return "";
  const perspectives = (report.perspectives || []).join(" · ") || "beginner · practitioner · critic";
  const outline = (report.outline || []).map((s) => `- **${s.section}**\n${(s.bullets || []).map((b) => `  - ${b}`).join("\n")}`).join("\n");
  const problems = (report.key_open_problems || []).map((p) => `- ${p}`).join("\n");
  const citations = Object.entries(report.citations || {}).map(([k, v]) => `[${k}] ${v.title} — ${v.url}`).join("\n");
  return `\n## STORM report\n_perspectives: ${perspectives}_\n\n### Outline\n${outline}\n\n### Article\n${report.article || ""}\n\n### Open problems\n${problems}\n\n### Citations\n${citations}\n`;
}
ect.entries(report.citations || {}).map(([k, v]) => `[${k}] ${v.title} — ${v.url}`).join("\n");
  return `\n## STORM report\n_perspectives: ${perspectives}_\n\n### Outline\n${outline}\n\n### Article\n${report.article || ""}\n\n### Open problems\n${problems}\n\n### Citations\n${citations}\n`;
}
