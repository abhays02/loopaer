import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { X, Play, Pause, ExternalLink, BookOpen, Sparkles, Loader2 } from "lucide-react";

/**
 * HyperframePlayer — cross-fades through 4-6 SVG "hyperframes" (LEFT)
 * and displays curated interactive references (distill.pub, colah, d2l.ai) (RIGHT).
 */
export default function HyperframePlayer({ algorithm, topic, provider, model, onClose, embedded = false }) {
  const [data, setData] = useState(null);
  const [refs, setRefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [tab, setTab] = useState("frames"); // "frames" | "refs"
  const [embedRef, setEmbedRef] = useState(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true); setError(null); setData(null); setRefs([]); setI(0); setEmbedRef(null); setTab("frames");
    (async () => {
      try {
        const [h, r] = await Promise.all([
          api.post("/hyperframes", { algorithm, topic, provider, model }),
          api.get("/references", { params: { algorithm, topic } }),
        ]);
        if (cancel) return;
        setData(h.data);
        const refList = r.data?.references || [];
        setRefs(refList);
        // Default embed = first iframe-able ref
        const embed = refList.find((x) => x.iframe);
        if (embed) setEmbedRef(embed);
      } catch (e) {
        if (!cancel) setError(e?.response?.data?.detail || "Failed to load hyperframes");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [algorithm, topic, provider, model]);

  useEffect(() => {
    if (!playing || !data?.frames?.length || tab !== "frames") return;
    const t = setInterval(() => setI((x) => (x + 1) % data.frames.length), 1600);
    return () => clearInterval(t);
  }, [playing, data, tab]);

  const frames = data?.frames || [];
  const current = frames[i];

  const body = (
    <div className={embedded ? "w-full" : "w-full max-w-5xl"}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-[#FFB000]">Hyperframes</div>
          <div className="font-display font-black text-lg tracking-tight">{data?.algorithm || algorithm}</div>
          {data?.source && (
            <div className="text-[9px] font-mono text-white/40 tracking-widest uppercase">
              source · {data.source} · {data?.family || "—"}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex border border-white/15">
            <button
              data-testid="hyperframes-tab-frames"
              onClick={() => setTab("frames")}
              className={`px-3 py-1.5 text-[10px] tracking-widest uppercase font-bold flex items-center gap-1 transition-colors ${tab === "frames" ? "bg-[#00E5FF] text-black" : "text-white/60 hover:text-[#00E5FF]"}`}
            >
              <Sparkles size={11} /> Frames
            </button>
            <button
              data-testid="hyperframes-tab-refs"
              onClick={() => setTab("refs")}
              className={`px-3 py-1.5 text-[10px] tracking-widest uppercase font-bold flex items-center gap-1 transition-colors border-l border-white/15 ${tab === "refs" ? "bg-[#FFB000] text-black" : "text-white/60 hover:text-[#FFB000]"}`}
            >
              <BookOpen size={11} /> Refs {refs.length > 0 && <span className="opacity-60">·{refs.length}</span>}
            </button>
          </div>
          {!embedded && onClose && (
            <button onClick={onClose} data-testid="hyperframes-close-btn" className="p-2 border border-white/10 hover:border-[#FF0055] hover:text-[#FF0055] transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {loading && tab === "frames" && (
        <div className="border border-white/10 bg-[#060608] aspect-[16/10] flex items-center justify-center">
          <div className="text-white/50 text-xs font-mono flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" /> loading hyperframes for {algorithm}...
          </div>
        </div>
      )}
      {error && !loading && tab === "frames" && (
        <div className="border border-[#FF0055]/40 bg-[#FF0055]/5 text-[#FF0055] text-xs font-mono p-4">{error}</div>
      )}

      {!loading && !error && tab === "frames" && (
        <>
          <div data-testid="hyperframes-stage" className="relative aspect-[16/10] bg-[#060608] border border-white/10 overflow-hidden">
            {frames.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-white/40 text-xs font-mono">no frames</div>
            )}
            <AnimatePresence mode="wait">
              {current && (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, filter: "blur(8px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(8px)" }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                  dangerouslySetInnerHTML={{ __html: current.svg }}
                />
              )}
            </AnimatePresence>
            <div className="absolute inset-0 aer-scanlines opacity-20 pointer-events-none" />
          </div>

          {frames.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-mono text-white/80" data-testid="hyperframes-caption">
                  <span className="text-[#00E5FF]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-white/30 mx-2">/</span>
                  <span className="text-white/50">{String(frames.length).padStart(2, "0")}</span>
                  <span className="ml-3 text-white/80">{current?.caption}</span>
                </div>
                <button
                  data-testid="hyperframes-play-toggle"
                  onClick={() => setPlaying((p) => !p)}
                  className="p-1.5 border border-white/15 hover:border-[#00E5FF] hover:text-[#00E5FF] transition-colors"
                >
                  {playing ? <Pause size={12} /> : <Play size={12} />}
                </button>
              </div>
              <div className="flex gap-1">
                {frames.map((_, idx) => (
                  <button
                    key={idx}
                    data-testid={`hyperframes-dot-${idx}`}
                    onClick={() => { setI(idx); setPlaying(false); }}
                    className={`flex-1 h-1 transition-colors ${idx === i ? "bg-[#00E5FF]" : "bg-white/15 hover:bg-white/30"}`}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "refs" && (
        <div className="grid md:grid-cols-[280px_1fr] gap-3 h-[560px]">
          {/* Ref list */}
          <div className="border border-white/10 bg-[#060608] p-3 overflow-y-auto" data-testid="hyperframes-refs-list">
            <div className="text-[9px] tracking-[0.3em] uppercase font-bold text-[#FFB000] mb-3">Curated · distill / d2l / colah</div>
            {loading && refs.length === 0 && (
              <div className="flex items-center gap-2 text-white/40 text-xs font-mono">
                <Loader2 size={12} className="animate-spin" /> loading...
              </div>
            )}
            {!loading && refs.length === 0 && <div className="text-white/40 text-xs font-mono">no references</div>}
            {refs.map((r, idx) => (
              <button
                key={idx}
                data-testid={`hyperframes-ref-${idx}`}
                onClick={() => r.iframe ? setEmbedRef(r) : window.open(r.url, "_blank", "noopener")}
                className={`w-full text-left border p-3 mb-2 transition-all ${embedRef?.url === r.url ? "border-[#FFB000] bg-[#FFB000]/10" : "border-white/10 hover:border-[#FFB000]/60 bg-white/[0.02]"}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[9px] tracking-widest uppercase font-bold text-[#FFB000] truncate">{r.source}</span>
                  <div className="flex items-center gap-1 text-[8px] tracking-widest uppercase text-white/40">
                    {r.type}
                    {!r.iframe && <ExternalLink size={9} />}
                  </div>
                </div>
                <div className="text-[11px] font-mono text-white/85 leading-snug line-clamp-3">{r.title}</div>
              </button>
            ))}
          </div>
          {/* Embed frame */}
          <div className="border border-white/10 bg-[#060608] relative overflow-hidden" data-testid="hyperframes-refs-embed">
            {embedRef ? (
              <>
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#0D0D12]">
                  <div className="text-[10px] font-mono text-white/70 truncate">
                    <span className="text-[#FFB000]">{embedRef.source}</span> · {embedRef.title}
                  </div>
                  <a
                    href={embedRef.url}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="hyperframes-refs-open-tab"
                    className="text-[9px] tracking-widest uppercase font-bold text-[#00E5FF] hover:text-white flex items-center gap-1 shrink-0"
                  >
                    Open <ExternalLink size={9} />
                  </a>
                </div>
                <iframe
                  key={embedRef.url}
                  src={embedRef.url}
                  title={embedRef.title}
                  className="w-full h-[calc(100%-2.25rem)] bg-white"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  referrerPolicy="no-referrer"
                />
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-white/40 text-xs font-mono p-8 text-center">
                Pick a reference on the left. Some publishers block iframes — those open in a new tab.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) return body;

  return (
    <motion.div
      data-testid="hyperframes-modal"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass p-6 w-full max-w-5xl max-h-[90vh] overflow-auto"
      >
        {body}
      </motion.div>
    </motion.div>
  );
}
