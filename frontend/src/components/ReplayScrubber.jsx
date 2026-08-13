import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Rewind, GitBranch, FastForward } from "lucide-react";

const TYPE_COLOR = {
  LoopStarted: "var(--acid)",
  PaperFound: "rgba(255,255,255,0.7)",
  RepositoryFound: "rgba(255,255,255,0.5)",
  FactExtracted: "rgba(255,255,255,0.85)",
  EntityDetected: "var(--cyan)",
  ConfidenceChanged: "var(--acid)",
  GapDetected: "var(--amber)",
  SkillGenerated: "var(--acid)",
  LoopFinished: "var(--acid)",
  LoopFailed: "var(--hot)",
  UserInjection: "var(--hot)",
};

export default function ReplayScrubber({ events, replayIdx, setReplayIdx, onBranch }) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!playing) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setReplayIdx((i) => {
        const next = (i == null ? 0 : i + 1);
        if (next >= events.length) { setPlaying(false); return events.length - 1; }
        return next;
      });
    }, 600 / speed);
    return () => clearInterval(timerRef.current);
  }, [playing, speed, events.length, setReplayIdx]);

  const cur = replayIdx == null ? events.length - 1 : replayIdx;
  const currentEvent = events[cur];

  return (
    <div className="p-10 h-full flex flex-col">
      <div className="label-tag">research replay</div>
      <div className="font-display text-3xl mt-1 tracking-tight">
        {events.length ? `Scrub through ${events.length} events` : "no events yet"}
      </div>
      <div className="text-white/50 mt-2 max-w-2xl text-sm">
        Move through the entire cognition timeline. Pause at any point to inspect what the runtime knew. Branch from here with a new objective.
      </div>

      {/* Track */}
      <div className="mt-10 glass rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setPlaying(!playing)} className="btn-acid !py-2 !px-3">
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={() => setReplayIdx(0)} className="btn-ghost !py-2 !px-3">
            <Rewind size={14} />
          </button>
          <button onClick={() => setSpeed((s) => (s >= 4 ? 1 : s * 2))} className="btn-ghost !py-2 !px-3 flex items-center gap-1 text-xs">
            <FastForward size={12} /> {speed}x
          </button>
          <div className="flex-1 mx-3">
            <input
              type="range"
              min="0"
              max={Math.max(0, events.length - 1)}
              value={cur}
              onChange={(e) => { setReplayIdx(parseInt(e.target.value)); setPlaying(false); }}
              className="w-full accent-[var(--acid)]"
              data-testid="replay-scrubber"
            />
          </div>
          <div className="text-[11px] text-white/60 font-mono w-24 text-right">
            {cur + 1} / {events.length}
          </div>
        </div>

        {currentEvent && (
          <motion.div
            key={currentEvent.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 border-t border-white/8 pt-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: TYPE_COLOR[currentEvent.type] || "white" }} />
              <div className="text-xs uppercase tracking-wider" style={{ color: TYPE_COLOR[currentEvent.type] || "white" }}>
                {currentEvent.type}
              </div>
              <div className="text-[10px] text-white/40">{new Date(currentEvent.ts).toLocaleString()}</div>
            </div>
            <pre className="text-[11px] text-white/70 bg-black/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-40">
              {JSON.stringify(currentEvent.payload, null, 2)}
            </pre>
          </motion.div>
        )}
      </div>

      {/* Density visualization */}
      <div className="mt-6 flex-1 overflow-hidden">
        <div className="label-tag mb-3">event density</div>
        <div className="flex gap-[2px] h-10">
          {events.map((ev, i) => (
            <motion.div
              key={ev.id}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.005, duration: 0.3 }}
              className="flex-1 rounded-sm cursor-pointer"
              style={{
                background: TYPE_COLOR[ev.type] || "rgba(255,255,255,0.15)",
                opacity: i <= cur ? 1 : 0.15,
                minWidth: 2,
              }}
              onClick={() => setReplayIdx(i)}
              title={ev.type}
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <button onClick={() => onBranch(undefined)} className="btn-ghost inline-flex items-center gap-2 text-xs">
          <GitBranch size={12} /> branch from here
        </button>
      </div>
    </div>
  );
}
