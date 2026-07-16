import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Loader2, GitFork, ArrowRight, Globe } from "lucide-react";

export default function Explore() {
  const { user } = useAuth();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forking, setForking] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/skills/public");
      setSkills(r.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const fork = async (id) => {
    if (!user) return alert("Sign in to fork");
    setForking(id);
    try {
      const r = await api.post(`/skills/${id}/fork`);
      window.location.href = `/library`;
    } catch (e) { alert("Fork failed: " + (e?.response?.data?.detail || e.message)); }
    finally { setForking(null); }
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)]">
      <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 py-12">
        <div className="flex items-center gap-2 mb-2 text-[11px] tracking-widest uppercase text-[color:var(--data-cyan)]">
          <Globe size={12} /> Public registry
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-8">
          Explore <span className="text-[color:var(--brand)]">skills</span> · fork any pipeline
        </h1>

        {loading && <div className="flex items-center gap-2 text-white/50 text-sm"><Loader2 size={14} className="animate-spin" /> Loading...</div>}
        {!loading && skills.length === 0 && (
          <div className="glass p-10 text-center" data-testid="explore-empty">
            <Globe size={26} className="mx-auto text-[color:var(--data-cyan)] mb-4" />
            <div className="text-sm text-white/70 mb-2">No public skills yet.</div>
            <div className="text-xs font-mono text-white/40">Be the first — publish one from your Library.</div>
          </div>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((s) => (
            <div key={s.id} data-testid={`explore-skill-${s.id}`} className="glass p-5 group hover:border-[color:var(--brand)]/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[9px] tracking-widest uppercase text-[color:var(--data-cyan)]">{s.topic || "—"}</div>
                <div className="text-[9px] tracking-widest uppercase text-[color:var(--text-tertiary)]">{s.author_name || "anon"}</div>
              </div>
              <div className="text-sm font-semibold mb-1 truncate">{s.name}</div>
              <div className="text-[11px] font-mono text-white/60 line-clamp-2 mb-3">{s.description || "no description"}</div>
              <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
                <span>{(s.nodes || []).length} nodes · {(s.edges || []).length} edges</span>
                <button
                  data-testid={`explore-fork-${s.id}`}
                  onClick={() => fork(s.id)}
                  disabled={forking === s.id}
                  className="flex items-center gap-1 text-[color:var(--brand)] hover:text-white transition-colors disabled:opacity-50"
                >
                  {forking === s.id ? <Loader2 size={10} className="animate-spin" /> : <GitFork size={10} />} Fork
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
