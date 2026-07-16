import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

/**
 * SkillMention — renders `[[skill: name]]` chips inside markdown text.
 * Fetches skill metadata on mount, shows a compact resolvable pill.
 */
export function SkillMention({ name }) {
  const [state, setState] = useState({ loading: true, found: false, skill: null });
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await api.get("/skills/lookup", { params: { name } });
        if (!cancel) setState({ loading: false, found: !!r.data.found, skill: r.data.skill });
      } catch { if (!cancel) setState({ loading: false, found: false, skill: null }); }
    })();
    return () => { cancel = true; };
  }, [name]);

  if (state.loading) {
    return <span className="inline-flex items-center gap-1 pill px-2 py-0.5 text-[11px]" data-testid={`skill-mention-loading-${name}`}>
      <Loader2 size={10} className="animate-spin" /> [[skill: {name}]]
    </span>;
  }
  if (!state.found) {
    return <span className="inline-flex items-center gap-1 pill px-2 py-0.5 text-[11px] text-[color:var(--text-tertiary)] border-dashed" data-testid={`skill-mention-missing-${name}`} title="Skill not found in your library">
      [[skill: {name}]] · missing
    </span>;
  }
  const s = state.skill;
  return (
    <Link
      to={`/workspace?topic=${encodeURIComponent(s.topic || "")}`}
      data-testid={`skill-mention-${s.id}`}
      className="inline-flex items-center gap-1.5 pill px-2 py-0.5 text-[11px] hover:border-[color:var(--brand)] transition-colors"
      title={s.description || s.name}
    >
      <Sparkles size={10} className="text-[color:var(--brand)]" />
      <span className="text-[color:var(--text-primary)]">{s.name}</span>
      <ArrowRight size={10} className="text-[color:var(--text-tertiary)]" />
    </Link>
  );
}

/**
 * Parse a text block and render `[[skill: name]]` occurrences as SkillMention chips.
 * Everything else is passed as plain text. Preserves newlines.
 */
export function withSkillMentions(text) {
  if (!text) return null;
  const parts = [];
  const re = /\[\[skill:\s*([^\]]+?)\s*\]\]/g;
  let last = 0, m;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={key++}>{text.slice(last, m.index)}</span>);
    parts.push(<SkillMention key={key++} name={m[1]} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
  return parts;
}
