import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Search, ArrowRight, BookOpen, Layers, Settings as SettingsIcon, PlusCircle, X, Cpu } from "lucide-react";

/**
 * Command palette — press ⌘K / Ctrl+K anywhere to open.
 * Actions: navigate, search topic, open recent skill/notebook.
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [skills, setSkills] = useState([]);
  const [notebooks, setNotebooks] = useState([]);
  const inputRef = useRef();
  const navigate = useNavigate();

  const openPalette = useCallback(() => {
    setOpen(true);
    setQ("");
    setTimeout(() => inputRef.current?.focus(), 30);
    // Fetch recents lazily on open
    (async () => {
      try {
        const [s, n] = await Promise.all([api.get("/skills"), api.get("/notebooks")]);
        setSkills((s.data || []).slice(0, 6));
        setNotebooks((n.data || []).slice(0, 6));
      } catch { /* not authed */ }
    })();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const editing = ["input", "textarea", "select"].includes(tag) || e.target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      } else if (open && e.key === "Enter" && !editing) {
        // handled inside input
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openPalette]);

  const staticActions = [
    { id: "search", label: "Search a topic", hint: q ? `Investigate "${q}"` : "Type a topic then ↵", icon: Search, run: () => q.trim() && (navigate(`/workspace?topic=${encodeURIComponent(q.trim())}`), setOpen(false)) },
    { id: "notebook-new", label: "New notebook", hint: "Start research", icon: PlusCircle, run: () => (navigate("/notebook/new"), setOpen(false)) },
    { id: "dashboard", label: "Dashboard", icon: Layers, run: () => (navigate("/dashboard"), setOpen(false)) },
    { id: "library", label: "Skill library", icon: BookOpen, run: () => (navigate("/library"), setOpen(false)) },
    { id: "settings", label: "Settings", icon: SettingsIcon, run: () => (navigate("/settings"), setOpen(false)) },
  ];

  const filter = (label) => !q || label.toLowerCase().includes(q.toLowerCase());
  const visibleActions = staticActions.filter((a) => filter(a.label) || a.id === "search");

  if (!open) return (
    <button
      data-testid="cmdk-fab"
      onClick={openPalette}
      className="fixed bottom-6 right-6 z-40 pill px-3 py-2 flex items-center gap-2 text-xs hover:border-[color:var(--brand)] transition-colors"
      title="Command palette"
    >
      <Search size={12} /> <span className="hidden sm:inline">Search</span>
      <span className="kbd">⌘</span><span className="kbd">K</span>
    </button>
  );

  return (
    <div
      data-testid="cmdk-modal"
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-start justify-center p-6 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="glass w-full max-w-xl overflow-hidden liquid-glass"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[color:var(--border-strong)]">
          <Search size={16} className="text-[color:var(--brand)]" />
          <input
            ref={inputRef}
            data-testid="cmdk-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const first = visibleActions[0];
                if (first) first.run();
              }
            }}
            placeholder="Search topics, skills, notebooks..."
            className="flex-1 bg-transparent outline-none text-sm font-mono placeholder:text-white/30"
          />
          <button onClick={() => setOpen(false)} className="p-1 text-white/40 hover:text-[color:var(--brand)]">
            <X size={14} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          <Group title="Actions">
            {visibleActions.map((a) => (
              <Row key={a.id} icon={a.icon} label={a.label} hint={a.hint} testid={`cmdk-action-${a.id}`} onClick={a.run} />
            ))}
          </Group>
          {notebooks.filter((nb) => filter(nb.title) || filter(nb.topic || "")).length > 0 && (
            <Group title="Notebooks">
              {notebooks.filter((nb) => filter(nb.title) || filter(nb.topic || "")).map((nb) => (
                <Row key={nb.id} icon={BookOpen} label={nb.title || "Untitled"} hint={nb.topic || ""} testid={`cmdk-notebook-${nb.id}`}
                  onClick={() => { navigate(`/notebook/${nb.id}`); setOpen(false); }} />
              ))}
            </Group>
          )}
          {skills.filter((sk) => filter(sk.name) || filter(sk.topic || "")).length > 0 && (
            <Group title="Skills">
              {skills.filter((sk) => filter(sk.name) || filter(sk.topic || "")).map((sk) => (
                <Row key={sk.id} icon={Cpu} label={sk.name} hint={sk.topic || ""} testid={`cmdk-skill-${sk.id}`}
                  onClick={() => { navigate(`/workspace?topic=${encodeURIComponent(sk.topic || "")}`); setOpen(false); }} />
              ))}
            </Group>
          )}
        </div>

        <div className="border-t border-[color:var(--border-strong)] px-4 py-2 flex items-center justify-between text-[10px] font-mono text-[color:var(--text-tertiary)]">
          <span>↵ to run · esc to close</span>
          <span><span className="kbd">⌘</span> <span className="kbd">K</span> anywhere</span>
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div className="py-2">
      <div className="px-4 py-1 text-[9px] tracking-[0.3em] uppercase font-bold text-[color:var(--text-tertiary)]">{title}</div>
      {children}
    </div>
  );
}
function Row({ icon: Icon, label, hint, onClick, testid }) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[color:var(--surface-200)] text-left transition-colors group"
    >
      <div className="w-7 h-7 rounded-[6px] border border-[color:var(--border-strong)] flex items-center justify-center group-hover:border-[color:var(--brand)] transition-colors">
        <Icon size={13} className="text-white/60 group-hover:text-[color:var(--brand)]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{label}</div>
        {hint && <div className="text-[10px] font-mono text-[color:var(--text-tertiary)] truncate">{hint}</div>}
      </div>
      <ArrowRight size={12} className="text-white/20 group-hover:text-[color:var(--brand)]" />
    </button>
  );
}
