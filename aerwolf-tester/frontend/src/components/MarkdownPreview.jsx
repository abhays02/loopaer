import React from "react";
import { withSkillMentions } from "./SkillMention";

/**
 * Ultra-lightweight markdown → React renderer.
 * Supports: # / ## / ### headings, **bold**, *italic*, `code`, [text](url), lists, ---, blank lines, [[skill: name]] mentions.
 * Not a full spec — but enough for research notebooks.
 */
export default function MarkdownPreview({ source }) {
  if (!source) return <div className="text-white/40 text-xs font-mono py-6 text-center">Nothing to preview yet.</div>;
  const lines = source.split(/\n/);
  const blocks = [];
  let list = null;
  const flushList = () => { if (list) { blocks.push({ type: "list", items: list }); list = null; } };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("### ")) { flushList(); blocks.push({ type: "h3", text: line.slice(4) }); }
    else if (line.startsWith("## ")) { flushList(); blocks.push({ type: "h2", text: line.slice(3) }); }
    else if (line.startsWith("# ")) { flushList(); blocks.push({ type: "h1", text: line.slice(2) }); }
    else if (line.startsWith("---")) { flushList(); blocks.push({ type: "hr" }); }
    else if (line.startsWith("- ")) { list = list || []; list.push(line.slice(2)); }
    else if (line.trim() === "") { flushList(); blocks.push({ type: "space" }); }
    else { flushList(); blocks.push({ type: "p", text: line }); }
  }
  flushList();

  return (
    <div className="prose-custom text-white/90 text-sm font-mono leading-relaxed space-y-2" data-testid="notebook-md-preview">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h1": return <h1 key={i} className="text-2xl font-bold font-display tracking-tight mt-4 mb-2 text-white">{inline(b.text)}</h1>;
          case "h2": return <h2 key={i} className="text-xl font-semibold font-display tracking-tight mt-3 mb-1 text-white">{inline(b.text)}</h2>;
          case "h3": return <h3 key={i} className="text-base font-semibold mt-2 mb-1 text-[color:var(--brand)]">{inline(b.text)}</h3>;
          case "hr": return <hr key={i} className="border-[color:var(--border-strong)] my-3" />;
          case "list": return (
            <ul key={i} className="list-none pl-3 space-y-1">
              {b.items.map((it, j) => <li key={j} className="flex gap-2"><span className="text-[color:var(--brand)]">·</span> <span>{inline(it)}</span></li>)}
            </ul>
          );
          case "space": return <div key={i} className="h-1" />;
          case "p":
          default:
            return <p key={i} className="text-white/85">{inline(b.text)}</p>;
        }
      })}
    </div>
  );
}

function inline(text) {
  if (!text) return null;
  // Split around [[skill: ...]] first
  const parts = [];
  const re = /\[\[skill:\s*([^\]]+?)\s*\]\]/g;
  let last = 0, m, key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(applyInline(text.slice(last, m.index), key++));
    // We reuse withSkillMentions' chip via a mini adapter
    parts.push(withSkillMentions(`[[skill: ${m[1]}]]`));
    last = m.index + m[0].length;
    key++;
  }
  if (last < text.length) parts.push(applyInline(text.slice(last), key++));
  return parts;
}

function applyInline(text, key) {
  // bold **x**, italic *x*, inline `code`, link [t](url)
  const nodes = [];
  let cursor = 0;
  const patterns = [
    { re: /\*\*(.+?)\*\*/g, wrap: (v, k) => <strong key={k} className="text-white">{v}</strong> },
    { re: /`([^`]+)`/g,     wrap: (v, k) => <code key={k} className="px-1 py-0.5 rounded-[4px] bg-[color:var(--surface-200)] border border-[color:var(--border-strong)] text-[color:var(--brand)] text-[12px]">{v}</code> },
    { re: /\[([^\]]+)\]\(([^)]+)\)/g, wrap: (v, k, url) => <a key={k} href={url} target="_blank" rel="noreferrer" className="text-[color:var(--brand)] underline underline-offset-2">{v}</a> },
  ];
  // Sequential single-pass matcher — take earliest of all patterns each round
  let s = text;
  let k2 = 0;
  while (s.length) {
    let earliest = null;
    for (const p of patterns) {
      p.re.lastIndex = 0;
      const m = p.re.exec(s);
      if (m && (!earliest || m.index < earliest.m.index)) earliest = { p, m };
    }
    if (!earliest) { nodes.push(<span key={`${key}-${k2++}`}>{s}</span>); break; }
    if (earliest.m.index > 0) nodes.push(<span key={`${key}-${k2++}`}>{s.slice(0, earliest.m.index)}</span>);
    nodes.push(earliest.p.wrap(earliest.m[1], `${key}-${k2++}`, earliest.m[2]));
    s = s.slice(earliest.m.index + earliest.m[0].length);
  }
  return nodes;
}
