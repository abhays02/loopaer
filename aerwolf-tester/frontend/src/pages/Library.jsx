import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Loader2, Trash2, ArrowRight, Package, Share2, Check } from "lucide-react";

export default function Library() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/skills");
      setSkills(r.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Delete this skill?")) return;
    await api.delete(`/skills/${id}`);
    load();
  };

  const togglePublish = async (skill) => {
    setBusyId(skill.id);
    try {
      const url = skill.public ? `/skills/${skill.id}/unpublish` : `/skills/${skill.id}/publish`;
      await api.post(url);
      await load();
    } catch (e) { alert("Failed: " + (e?.response?.data?.detail || e.message)); }
    finally { setBusyId(null); }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="absolute inset-0 aer-grid opacity-20 pointer-events-none" />
      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 py-12">
        <div className="mb-8">
          <div className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-2">
            <span className="text-[#00E5FF]">◉</span> Skill library
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tighter uppercase">
            Your <span className="text-[#00E5FF]">skills</span>
          </h1>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-white/50 text-sm" data-testid="library-loading">
            <Loader2 size={14} className="animate-spin" /> Loading skills...
          </div>
        )}

        {!loading && skills.length === 0 && (
          <div className="glass p-10 text-center" data-testid="library-empty">
            <Package size={28} className="mx-auto text-[#00E5FF] mb-4" />
            <div className="text-sm text-white/70 mb-2">No skills yet.</div>
            <div className="text-xs font-mono text-white/40 mb-6">Search a topic, design an architecture, and save your first skill.</div>
            <Link to="/dashboard" className="inline-flex items-center gap-2 bg-[#00E5FF] text-black px-5 py-2 text-xs font-black tracking-widest uppercase hover:bg-white transition-colors">
              Go to Dashboard <ArrowRight size={12} />
            </Link>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((s) => (
            <div key={s.id} data-testid={`library-skill-card-${s.id}`} className="glass p-5 relative group hover:border-[#00E5FF]/40 transition-colors">
              <div className="absolute top-0 left-0 h-[2px] w-10 bg-[#00E5FF] group-hover:w-full transition-all duration-500" />
              <div className="flex items-start justify-between mb-2">
                <div className="text-[9px] tracking-widest uppercase font-bold text-[#FFB000]">{s.topic || "—"}</div>
                <button
                  data-testid={`library-delete-${s.id}`}
                  onClick={() => remove(s.id)}
                  className="text-white/30 hover:text-[#FF0055] transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="text-sm font-bold mb-1 truncate">{s.name}</div>
              <div className="text-[10px] font-mono text-white/50 line-clamp-2 mb-3">{s.description || "no description"}</div>
              <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                <span>{(s.nodes || []).length} nodes · {(s.edges || []).length} edges</span>
                <div className="flex items-center gap-3">
                  <button
                    data-testid={`library-publish-${s.id}`}
                    onClick={() => togglePublish(s)}
                    disabled={busyId === s.id}
                    className={`flex items-center gap-1 transition-colors ${s.public ? "text-[color:var(--data-lime)] hover:text-white" : "text-[color:var(--data-cyan)] hover:text-white"} disabled:opacity-50`}
                    title={s.public ? "Unpublish" : "Publish to public registry"}
                  >
                    {busyId === s.id ? <Loader2 size={10} className="animate-spin" /> : s.public ? <Check size={10} /> : <Share2 size={10} />}
                    {s.public ? "Public" : "Publish"}
                  </button>
                  <Link to={`/workspace?topic=${encodeURIComponent(s.topic || "")}`} className="text-[color:var(--brand)] hover:text-white transition-colors flex items-center gap-1">
                    Open <ArrowRight size={10} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
