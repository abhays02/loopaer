import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import KnowledgeGraph from "./KnowledgeGraph";
import ConfidenceMeter from "./ConfidenceMeter";
import SkillPanel from "./SkillPanel";
import PlanReveal from "./PlanReveal";
import ReplayScrubber from "./ReplayScrubber";
import { Layers, Brain, ShieldCheck, Sparkles, Rewind } from "lucide-react";

const TABS = [
  { id: "plan", label: "Plan", icon: Brain },
  { id: "knowledge", label: "Knowledge", icon: Layers },
  { id: "confidence", label: "Confidence", icon: ShieldCheck },
  { id: "skill", label: "Skill", icon: Sparkles },
  { id: "replay", label: "Replay", icon: Rewind },
];

export default function ArtifactCanvas({ tab, setTab, session, plan, knowledge, skill, events, replayIdx, setReplayIdx, activeLoop, onRunStage, onBranch }) {
  return (
    <div className="h-full flex flex-col">
      {/* tab strip */}
      <div className="px-4 pt-3 pb-0 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                data-testid={`tab-${t.id}`}
                className={`relative px-4 py-2.5 text-xs uppercase tracking-wider font-medium transition-colors ${
                  active ? "text-[var(--acid)]" : "text-white/40 hover:text-white/70"
                }`}
              >
                <span className="flex items-center gap-2"><t.icon size={12} /> {t.label}</span>
                {active && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute left-2 right-2 bottom-0 h-[2px] bg-[var(--acid)]"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="text-[10px] text-white/40 uppercase tracking-wider">
          {session?.model?.split("/")[1]}
        </div>
      </div>

      {/* body */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 overflow-y-auto thin-scroll"
          >
            {tab === "plan" && (
              <PlanReveal plan={plan} events={events} onRunStage={onRunStage} activeLoop={activeLoop} onBranch={onBranch} />
            )}
            {tab === "knowledge" && (
              <KnowledgeGraph knowledge={knowledge} />
            )}
            {tab === "confidence" && (
              <ConfidenceMeter knowledge={knowledge} />
            )}
            {tab === "skill" && (
              <SkillPanel skill={skill} onGenerate={() => onRunStage("skill")} />
            )}
            {tab === "replay" && (
              <ReplayScrubber events={events} replayIdx={replayIdx} setReplayIdx={setReplayIdx} onBranch={onBranch} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
