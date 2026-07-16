import React from "react";
import { FileText, Github, Star, AlertTriangle, Sparkles, ExternalLink, Loader2, Zap } from "lucide-react";

export default function ResultsPanel({ results, wisdom, loadingResults, loadingWisdom, topic }) {
  return (
    <div className="p-5 space-y-6" data-testid="results-panel">
      {/* Wisdom */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={12} className="text-[#FFB000]" />
          <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#FFB000]">Word of Wisdom</span>
        </div>
        {loadingWisdom && (
          <div className="border border-white/10 p-4 flex items-center gap-2 text-white/40 text-xs" data-testid="wisdom-loading">
            <Loader2 size={12} className="animate-spin" /> Synthesising review...
          </div>
        )}
        {!loadingWisdom && wisdom && (
          <div
            data-testid="wisdom-review-card"
            className="border border-[#FFB000]/30 bg-gradient-to-br from-[#16161E] to-[#0D0D12] p-4 relative"
          >
            <div className="absolute top-0 left-0 h-full w-[2px] bg-[#FFB000]" />
            <div className="text-xs text-white/80 leading-relaxed mb-3">{wisdom.summary}</div>
            {wisdom.flaws?.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle size={10} className="text-[#FF0055]" />
                  <span className="text-[9px] tracking-widest uppercase font-bold text-[#FF0055]">Flaws</span>
                </div>
                <ul className="space-y-1 text-[11px] font-mono text-white/70">
                  {wisdom.flaws.slice(0, 4).map((f, i) => (<li key={i}>· {f}</li>))}
                </ul>
              </div>
            )}
            {wisdom.not_together?.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Zap size={10} className="text-[#00E5FF]" />
                  <span className="text-[9px] tracking-widest uppercase font-bold text-[#00E5FF]">Doesn&apos;t Add Up</span>
                </div>
                <ul className="space-y-1 text-[11px] font-mono text-white/70">
                  {wisdom.not_together.slice(0, 3).map((f, i) => (<li key={i}>· {f}</li>))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Papers */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText size={12} className="text-[#00E5FF]" />
            <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#00E5FF]">Papers</span>
          </div>
          <span className="text-[9px] font-mono text-white/40">{results?.papers?.length ?? "—"}</span>
        </div>
        {loadingResults && <SkeletonRows n={3} />}
        {!loadingResults && (results?.papers || []).slice(0, 10).map((p, i) => (
          <a
            key={i}
            href={p.url}
            target="_blank"
            rel="noreferrer"
            data-testid={`paper-result-card-${i}`}
            className="block border border-white/10 hover:border-[#00E5FF]/50 bg-white/[0.03] p-3 mb-2 group relative overflow-hidden transition-all"
          >
            <div className="absolute top-0 left-0 h-full w-[2px] bg-transparent group-hover:bg-[#00E5FF] transition-colors" />
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] tracking-widest uppercase font-bold text-[#FFB000]">{p.source}</span>
              {p.published && <span className="text-[9px] font-mono text-white/40">· {p.published}</span>}
              {p.citations ? <span className="text-[9px] font-mono text-white/40">· {p.citations} cites</span> : null}
              <ExternalLink size={10} className="ml-auto text-white/30 group-hover:text-[#00E5FF]" />
            </div>
            <div className="text-xs font-bold leading-snug mb-1">{p.title}</div>
            {p.abstract && <div className="text-[10px] font-mono text-white/50 leading-relaxed line-clamp-3">{p.abstract}</div>}
          </a>
        ))}
      </section>

      {/* Awesome */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Github size={12} className="text-[#FF0055]" />
          <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#FF0055]">Awesome · GitHub</span>
        </div>
        {loadingResults && <SkeletonRows n={2} />}
        {!loadingResults && (results?.awesome || []).slice(0, 8).map((r, i) => (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            data-testid={`awesome-list-repo-${i}`}
            className="block border border-white/10 bg-white/[0.03] p-3 mb-2 hover:border-[#FF0055]/50 hover:bg-[#FF0055]/[0.03] transition-all"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-bold truncate">{r.name}</span>
              <span className="text-[10px] font-mono text-[#FFB000] flex items-center gap-1 shrink-0">
                <Star size={9} /> {r.stars}
              </span>
            </div>
            <div className="text-[10px] font-mono text-white/50 line-clamp-2">{r.description}</div>
          </a>
        ))}
      </section>

      {topic === "" && (
        <div className="text-center text-white/30 text-xs font-mono py-12">no topic yet</div>
      )}
    </div>
  );
}

function SkeletonRows({ n = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="border border-white/10 p-3">
          <div className="h-2 w-24 bg-white/10 mb-2 animate-pulse" />
          <div className="h-3 w-full bg-white/10 mb-1 animate-pulse" />
          <div className="h-2 w-3/4 bg-white/5 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
