# Loopaer — PRD

## Original problem statement
Build an AI-native operating environment where autonomous research loops continuously
discover, verify, organize, visualize, and transform knowledge into reusable AI skills.
Event-driven, loop-driven. UI is a visualization of cognition. Not a chatbot, not an
IDE, not a search engine — a runtime that executes autonomous reasoning loops while
dynamically generating the best interface to expose those loops.

## Rebrand — Iteration 5
- **Lumen → Loopaer** across FE + BE + browser title + logo mark + copy.
- Apple product-page discipline: warm-ivory + ink base, SF Pro Display + New York italic, one small acid accent, massive whitespace, single focal moments per section.
- **Three.js interactive hero** (`LoopScene.jsx`) — real WebGL: physical glass torus rings tilted at different angles orbiting a pulsing physical-material core (glass + emissive + clearcoat + transmission), 100 particles drifting through space, rim lights (ivory · cyan · amber · acid), auto-rotation with pointer-drag control. React Three Fiber v9 (React 19 compatible).
- Section transitions driven by scroll (`useScroll` + parallax y/opacity per section).
- Warm ambient grain + radial glow instead of stark black + neon.

## Reasoning Diff view (`/diff/:sid1/:sid2`) — Iteration 5
- Side-by-side reasoning trees from two sessions (typically a session and its branch).
- Independent live event streams per side (WebSocket subscription per session).
- Per-session controls: pause all · resume all · compile skill.
- Loop state pills (planner finished · research running etc.) per side.
- **Diff strip** at the bottom: `only in A` (acid) · `shared` · `only in B` (cyan). Turns Loopaer into a science-of-cognition instrument — see exactly where two versions of thinking diverged.
- Dock now has a `branch → diff` icon that clones the current session and jumps straight to the diff view with auto-started plan/research on the branch.

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
- **Iteration 2**: Event persistence to Mongo + cold-session rehydration (any /events or WS request rebuilds the in-memory buffer from the persisted `events` collection).
- **Iteration 2**: Real SSE token streaming from OpenRouter — planner now emits `TokenStreamed` events with live deltas. Falls back to non-streaming, then to a static plan if all free models rate-limit.
- **Iteration 2**: Memory loop — verified facts + entities archive to a global `memory` collection at end of verification. New sessions receive `MemoryHit` events from token-overlap recall over prior sessions before planning begins.
- **Iteration 2**: Persisted sessions (only in Mongo) now accept /plan /research /verify /skill /run-all — routes call `runtime.get() or await load_session()`.
- **Iteration 2 UI upgrade**: Landing gets scramble text, mouse-parallax gradient blobs, animated marquee, big animated counters, shimmer sweep on goal input, rotating dashed circle. Bottom dock gets true dock.cool magnification (icons balloon toward the cursor with spring physics).
- **Iteration 3**: MongoDB text index (`memory_fulltext` on `text` + `goal` fields) — recall now runs `$text` search with textScore ranking (O(log n) at scale) and normalizes scores to [0,1]. Token-overlap fallback kept for edge queries.
- **Iteration 3**: Extraction & verification loops now stream tokens too (previously only planner). Shared `_stream_json` helper on the Runtime class.
- **Iteration 3**: Animated Reasoning Tree tab in the artifact canvas — iterative walkFlat renderer (no recursion → no stack overflow risk at any depth), color-coded row types (SEARCH/EXTRACT/VERIFY/SYNTH/ITER/FACT/ENT/GAP), confidence pills, expandable chevrons with layout-animated collapse/expand, structure sidebar with leaf/depth stats and legend.
- **Iteration 3**: Rehydrate now compares in-memory buffer length vs `db.events.count_documents({session_id})` and tops up when Mongo has more (previously only rehydrated when buffer was strictly empty).
- **Iteration 4 UI upgrade**: Hero got a proper illustration (`HeroLoopViz.jsx`) — pulsing central reasoning core, 3 concentric orbits with 30 nodes, incoming signal pings on dashed lines, rotating outer scale ticks, flickering corner sensor labels. Landing metrics ticker under the headline (typewriter cycling through memory states, live loop counter, pulsing bus indicator). Each of the 8 loop cards on the grid has its own hand-drawn continuously-animating SVG mini-viz (`LoopMiniViz.jsx`) — bars filling, orbits spinning, confidence bars breathing, spark bursts, pulse rings, graph nodes drawing, memory stacks bobbing, replay waveforms dancing.
- **Iteration 4**: Reasoning tree unified — research loop's iteration nodes now attach to the planner's existing search/extract task node instead of creating a duplicate `research` container.

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
