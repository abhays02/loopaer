import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Search, TrendingUp, ArrowRight, BookOpen, Layers, FileCode2 } from "lucide-react";

const TRENDING = ["OCR", "HTR", "LLM Agents", "Vision Transformers", "RAG", "Diffusion", "Speech Recognition", "GNNs"];

export default function Dashboard() {
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const navigate = useNavigate();
  const go = (t) => t?.trim() && navigate(`/workspace?topic=${encodeURIComponent(t.trim())}`);

  return (
    <div className="relative min-h-[calc(100vh-5rem)] liquid-glass">
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 py-14">
        <div className="text-[11px] uppercase tracking-widest text-[color:var(--text-tertiary)] mb-2" data-testid="dashboard-welcome">
          <span className="text-[color:var(--brand)]">●</span> signed in · {user?.email}
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          Type any research <span className="text-[color:var(--brand)]">frontier</span>
        </h1>
        <p className="text-[color:var(--text-secondary)] text-[15px] mb-10 max-w-2xl">
          One query · papers, reviews, awesome-lists, architecture canvas. Everything a researcher's right hand should do.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); go(topic); }} className="glass p-2 flex items-center gap-2">
          <Search size={18} className="ml-3 text-[color:var(--brand)]" />
          <input
            data-testid="search-topic-input"
            value={topic} onChange={(e) => setTopic(e.target.value)} autoFocus
            placeholder="e.g. OCR, protein folding, sparse mixture of experts..."
            className="flex-1 bg-transparent text-lg font-mono outline-none placeholder:text-white/25 px-2 py-3"
          />
          <button data-testid="search-submit-btn" type="submit" className="btn-brand !py-2.5 flex items-center gap-2">
            Investigate <ArrowRight size={14} />
          </button>
        </form>

        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={12} className="text-[color:var(--brand)]" />
            <span className="text-[11px] tracking-widest uppercase font-medium text-[color:var(--text-secondary)]">Trending frontiers</span>
          </div>
          <div className="flex flex-wrap gap-2" data-testid="trending-topics">
            {TRENDING.map((t) => (
              <button
                key={t}
                data-testid={`trending-topic-${t.replace(/\s+/g, "-").toLowerCase()}`}
                onClick={() => go(t)}
                className="text-[13px] font-medium border border-[color:var(--border-strong)] px-3 py-1.5 rounded-[8px] hover:border-[color:var(--brand)] hover:text-[color:var(--brand)] transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-4">
          <StepCard n="01" title="Notebook" body="Draft with markdown + sources. Run STORM multi-perspective report. Chat grounded in your notes." icon={BookOpen} to="/notebook/new" />
          <StepCard n="02" title="Canvas" body="Design as a graph. Click a node → AlgoFinder → TechFinder. Watch algorithms run." icon={Layers} />
          <StepCard n="03" title="Export" body="SKILL.md · YAML + Markdown. Ready for any LLM." icon={FileCode2} />
        </div>
      </div>
    </div>
  );
}

function StepCard({ n, title, body, icon: Icon, to }) {
  const inner = (
    <div className="glass glass-hover p-5 h-full flex flex-col relative group">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] tracking-widest uppercase text-[color:var(--text-tertiary)]">{n}</span>
        <Icon size={16} className="text-[color:var(--brand)]" />
      </div>
      <div className="text-[15px] font-semibold mb-1.5">{title}</div>
      <div className="text-[12px] text-[color:var(--text-secondary)] leading-relaxed">{body}</div>
    </div>
  );
  return to ? <a href={to} data-testid={`step-card-${n}`}>{inner}</a> : <div data-testid={`step-card-${n}`}>{inner}</div>;
}
