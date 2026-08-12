import React, { useState } from "react";
import { m, useReducedMotion, AnimatePresence } from "framer-motion";
import { SPRING_STANDARD } from "./shared";

const NODE_W = 150;
const NODE_H = 92;
const NODE_Y = 128;
const STEP = 212;
const X0 = 20;
const VIEW_W = 1250;
const VIEW_H = 320;

const nodeX = (i) => X0 + i * STEP;
const centerX = (i) => nodeX(i) + NODE_W / 2;
const MID_Y = NODE_Y + NODE_H / 2;

const stateLabel = { pending: "STANDBY", active: "ACTIVE", done: "COMPLETE" };

export default function PipelineDiagram({ stages, runState, motionOk, visible }) {
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(null);
  const animateEntry = motionOk && !reduced;
  const packetsOn = !reduced && motionOk && visible;

  const centerPath = stages
    .map((_, i) => `${i === 0 ? "M" : "L"} ${centerX(i)} ${MID_Y}`)
    .join(" ");

  const toggleFocus = (id) => setFocused((cur) => (cur === id ? null : id));
  const clearFocus = () => setFocused(null);

  return (
    <div className="relative">
      <div className="lc-diagram-scroll overflow-x-auto pb-2 lg:overflow-visible" role="group" aria-label="Six-stage orchestration pipeline diagram">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block min-w-[860px] w-full lg:min-w-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) clearFocus();
          }}
        >
          {/* edges */}
          {stages.slice(0, -1).map((s, i) => {
            const x1 = nodeX(i) + NODE_W;
            const x2 = nodeX(i + 1);
            const d = `M ${x1} ${MID_Y} C ${x1 + 30} ${MID_Y - 30}, ${x2 - 30} ${MID_Y - 30}, ${x2} ${MID_Y}`;
            const touchesFocus = focused === s.id || focused === stages[i + 1].id;
            const stroke = touchesFocus ? "#00E5FF" : "rgba(255,255,255,0.22)";
            const opacity = focused && !touchesFocus ? 0.3 : 1;
            return (
              <m.path
                key={s.id}
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth={1.5}
                style={{ opacity, transition: "stroke 0.2s ease-out, opacity 0.2s ease-out" }}
                initial={animateEntry ? { pathLength: 0 } : { pathLength: 1 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 1.2, delay: i * 0.15, ease: [0.65, 0, 0.35, 1] }}
              />
            );
          })}

          {/* ambient packets ride the center line */}
          {packetsOn && stages.length > 1 && (
            <g aria-hidden="true">
              <path id="lc-pipeline-track" d={centerPath} fill="none" stroke="none" />
              <circle r="3.5" className="lc-packet">
                <animateMotion dur="6s" repeatCount="indefinite" rotate="none">
                  <mpath href="#lc-pipeline-track" />
                </animateMotion>
              </circle>
              <circle r="3" className="lc-packet-echo">
                <animateMotion dur="6s" begin="-0.35s" repeatCount="indefinite" rotate="none">
                  <mpath href="#lc-pipeline-track" />
                </animateMotion>
              </circle>
              <circle r="3" className="lc-packet">
                <animateMotion dur="6s" begin="-3s" repeatCount="indefinite" rotate="none">
                  <mpath href="#lc-pipeline-track" />
                </animateMotion>
              </circle>
            </g>
          )}

          {/* nodes */}
          {stages.map((stage, i) => {
            const x = nodeX(i);
            const active = stage.state === "active";
            const done = stage.state === "done";
            const stroke = active ? "#D4FF00" : done ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.1)";
            return (
              <m.g
                key={stage.id}
                role="button"
                tabIndex={0}
                aria-label={`${stage.name} stage — ${stateLabel[stage.state] || stage.state}`}
                aria-pressed={focused === stage.id}
                data-cursor="interactive"
                style={{ cursor: "pointer", outline: "none" }}
                onClick={() => toggleFocus(stage.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleFocus(stage.id);
                  }
                }}
                initial={animateEntry ? { scale: 0.96, opacity: 0 } : false}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={reduced ? { duration: 0.2 } : { delay: 0.4 + i * 0.15, ...SPRING_STANDARD }}
                whileHover={reduced ? undefined : { scale: 1.02 }}
              >
                {/* 44px+ hit area */}
                <rect x={x - 6} y={NODE_Y - 10} width={NODE_W + 12} height={NODE_H + 20} fill="transparent" />
                <rect
                  x={x}
                  y={NODE_Y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={12}
                  fill={active ? "#101010" : "#0A0A0A"}
                  stroke={stroke}
                  strokeWidth={active ? 1.5 : 1}
                  style={active ? { filter: "drop-shadow(0 0 14px rgba(212,255,0,0.28))" } : undefined}
                />
                <text x={x + 14} y={NODE_Y + 26} fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="'JetBrains Mono', monospace" letterSpacing="2">
                  {String(i + 1).padStart(2, "0")}
                </text>
                <text x={x + NODE_W - 14} y={NODE_Y + 26} textAnchor="end" fill={done ? "#D4FF00" : active ? "#D4FF00" : "rgba(255,255,255,0.25)"} fontSize="10" fontFamily="'JetBrains Mono', monospace" letterSpacing="1">
                  {done ? "DONE" : active ? `${Math.round(stage.percent || 0)}%` : "· · ·"}
                </text>
                <text x={x + 14} y={NODE_Y + 52} fill={active || done ? "#FFFFFF" : "rgba(255,255,255,0.55)"} fontSize="17" fontWeight="800" fontFamily="'Cabinet Grotesk', sans-serif">
                  {stage.name}
                </text>
                {/* progress hairline */}
                <rect x={x + 14} y={NODE_Y + 66} width={NODE_W - 28} height={2} rx={1} fill="rgba(255,255,255,0.08)" />
                <rect
                  x={x + 14}
                  y={NODE_Y + 66}
                  width={(NODE_W - 28) * ((stage.percent || 0) / 100)}
                  height={2}
                  rx={1}
                  fill={done ? "rgba(212,255,0,0.55)" : "#D4FF00"}
                  style={{ transition: "width 0.4s cubic-bezier(0.16,1,0.3,1)" }}
                />
              </m.g>
            );
          })}
        </svg>
      </div>

      {/* focus tooltip */}
      <AnimatePresence>
        {focused &&
          (() => {
            const idx = stages.findIndex((s) => s.id === focused);
            if (idx < 0) return null;
            const stage = stages[idx];
            const leftPct = Math.min(82, Math.max(12, (centerX(idx) / VIEW_W) * 100));
            return (
              <m.div
                key={focused}
                className="pointer-events-none absolute z-30 hidden w-64 -translate-x-1/2 lg:block"
                style={{ left: `${leftPct}%`, top: 0 }}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                role="status"
              >
                <div className="rounded-xl border border-white/10 bg-[rgba(16,16,16,0.9)] p-4 backdrop-blur-md">
                  <p className="lc-caption uppercase tracking-[0.18em] text-[#00E5FF]">
                    {String(idx + 1).padStart(2, "0")} / {stage.name}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{stage.description}</p>
                  <p className="lc-caption mt-3 uppercase tracking-[0.18em]">
                    {stateLabel[stage.state] || stage.state}
                  </p>
                </div>
              </m.div>
            );
          })()}
      </AnimatePresence>

      {/* touch legend for the focused node on small screens */}
      <div className="mt-4 lg:hidden" role="status">
        {focused &&
          (() => {
            const stage = stages.find((s) => s.id === focused);
            return stage ? (
              <p className="lc-caption leading-relaxed text-white/60">
                <span className="text-[#00E5FF]">{stage.name}</span> — {stage.description}
              </p>
            ) : null;
          })()}
        {!focused && runState !== "idle" && (
          <p className="lc-caption text-white/40">Tap a stage to read what it does.</p>
        )}
      </div>
    </div>
  );
}
