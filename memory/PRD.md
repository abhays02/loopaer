# Lumen Runtime — PRD

## Original problem statement
Build an AI-native operating environment where autonomous research loops continuously
discover, verify, organize, visualize, and transform knowledge into reusable AI skills.
Event-driven, loop-driven. UI is a visualization of cognition. Not a chatbot, not an
IDE, not a search engine — a runtime that executes autonomous reasoning loops while
dynamically generating the best interface to expose those loops.

Design references: nominal.so (bold animated typography, dark, sharp) + dock.cool
(smooth liquid glass, spring physics, floating dock).

## Architecture
```
User → Goal → Planner Loop → Runtime Event Bus →
   [ Research | Verification | Skill Builder | ... ] →
     Knowledge Graph → Dynamic UI Renderer
```

- **Backend** (`/app/backend`, FastAPI + Motor + OpenRouter)
  - `server.py` — routes + WebSocket event bus
  - `runtime.py` — Session + Loop engine (pause/resume/cancel/branch/inject)
  - `eventbus.py` — in-process pub/sub with per-session buffered replay
  - `openrouter.py` — multi-model LLM client with fallback cascade to free models
  - `sources.py` — arXiv + GitHub search
- **Frontend** (`/app/frontend`, React + Framer Motion + Tailwind + shadcn)
  - `pages/Landing.jsx` — nominal.so-style hero with goal input & model switcher
  - `pages/Runtime.jsx` — 3-column workbench (loop tree · artifact canvas · event stream) + liquid-glass bottom dock
  - Panels: `PlanReveal`, `KnowledgeGraph` (radial SVG), `ConfidenceMeter` (animated dial), `SkillPanel`, `ReplayScrubber`, `LoopInspector`, `EventStream`, `LoopTree`, `BottomDock`

## Loops implemented (all resumable/pausable/cancelable/inspectable)
1. **Planner** — restate goal, questions, tasks, cost/time/confidence estimates
2. **Research** — iterative arXiv+GitHub discovery → extract facts/entities/gaps → re-queue gaps
3. **Verification** — cross-check each fact against sources, emit ConfidenceChanged events
4. **Skill Builder** — compile verified research into portable SKILL package (system prompt, workflow, tools, tests, failure modes)

## Event types emitted
`SessionCreated`, `LoopStarted/Paused/Resumed/Cancelled/Finished/Failed/Warning`,
`PlannerThinking`, `PlanReady`, `ReasoningTreeUpdated`,
`ResearchStarted/Finished`, `SourceFetching`, `PaperFound`, `RepositoryFound`,
`FactExtracted`, `EntityDetected`, `GapDetected`,
`VerificationStarted/Finished`, `ConfidenceChanged`,
`SkillGenerated`, `UserInjection`, `InjectionApplied`, `SessionBranched`

## What's implemented (Jan 2026)
- Full event-driven runtime with WebSocket streaming
- 4 core loops end-to-end with real LLM calls (free OpenRouter models by default)
- Pause / resume / cancel / inject / branch on any loop
- Knowledge graph radial visualization
- Confidence meter with animated dial + per-fact bars
- Research replay scrubber with density heatmap
- SKILL.md export (markdown + JSON)
- User-switchable models (free + paid tiers)

## Backlog / P1
- Real streaming (SSE) tokens from LLM instead of chunked events
- Plugin system for custom loops / renderers
- Persistent knowledge across sessions (Memory Loop)
- Vector search over accumulated facts
- Multi-user auth (JWT or Emergent Google Auth)
- Export to MCP Skill / Claude Skill / OpenAI Agent formats
- Reasoning tree animated visualization (currently text-only in loop tree)
- Skill Testing loop with automated evaluation
- Gap Detection as a dedicated inspectable loop (currently woven into Research)

## Non-negotiable design principles
- Event-driven — loops emit, UI reacts
- Every loop is pausable / resumable / cancelable / inspectable
- User can intervene at any point without losing context
- Knowledge is structured, reusable, cumulative
- UI renders artifacts dynamically — never static pages
- Dark, distinctive, electric acid green (#D4FF00), no AI-slop purple gradients
