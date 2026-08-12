# Enterprise AI Transformation Platform — Product Brief and Acceptance Note

- Project: loopaer rebuild (branch `devs1`)
- Document owner: Project Administrator (manager)
- Status: Approved for planning
- Plan version: 1
- Task ref: task_zs7u3cimcp | Acceptance ref: acc_t6we5zwa3m | Evidence ref: ev_n6vp3pi7fy
- Date: 2026-08-12

---

## 1. Positioning

We are rebuilding loopaer's public experience as an **Enterprise AI Transformation Platform** — presented as an "AI Command Center". The product story shifts from a developer-facing agentic runtime demo to a confident, executive-grade platform narrative: one place where an organization watches its AI transformation happen live, with pipelines, memory, and outcomes rendered as an immersive, animation-rich experience.

The experience must feel:

- **Elegant and immersive** — dark, kinetic, command-center aesthetic, consistent with the existing design system (dark void base, electric acid-green signal color, Cabinet Grotesk display type, JetBrains Mono data type).
- **Alive** — animation carries the story: a differentiated loading sequence, scroll-driven reveals, and an interactive pipeline visualization, not decorative noise.
- **Lightweight** — fast first paint on mid-range phones over throttled networks; animations must never block interaction.
- **Human** — every line of copy is written fresh, in plain language, as if a senior consultant were walking a client through the platform.

---

## 2. Current-state audit (branch `devs1`, commit 85e0f38)

### 2.1 Frontend

| Item | Finding |
| --- | --- |
| Framework | React 19, CRA via react-scripts with craco overrides |
| Styling | Tailwind CSS 3.4, tailwindcss-animate, design tokens in `design_guidelines.json` |
| Components | Full Radix UI primitive set (accordion through tooltip), lucide-react icons |
| Animation | framer-motion 11 (page transitions via AnimatePresence), custom cursor in `App.js` |
| 3D | three.js 0.185 with @react-three/fiber (`LoopScene.jsx` in the current landing) |
| Data | axios, @tanstack/react-query, swr; react-hook-form + zod for forms |
| Viz | recharts, reactflow, embla-carousel |
| Routing | react-router-dom 7: `/` (Landing), `/signin`, `/signup`, `/runtime/:sid`, `/diff/:sid1/:sid2`, `/snapshot/:snapId` |
| Key files | `frontend/src/pages/Landing.jsx` (328 lines — the surface being replaced), `frontend/src/components/` (16 visualization components), `frontend/src/App.js` |

### 2.2 Backend

| Item | Finding |
| --- | --- |
| Framework | FastAPI 0.110 (`app = FastAPI(title="Loopaer Runtime")`), uvicorn |
| Database | MongoDB via Motor async client; `MONGO_URL` and `DB_NAME` from environment |
| Realtime | Single websocket `/api/ws/{sid}` with an event bus (`eventbus.py`) |
| LLM access | OpenRouter client (`openrouter.py`); keys held in `secretstore.py` |
| Auth | Signup/login/me via `auth.py` |
| API surface | `/api` router: models, sessions, events, knowledge, tree, plan, research, verify, skill, run-all, loop controls (pause/resume/cancel/inject), branch, skills, auth, memory, secrets, genui, diff/snapshot, snapshots |
| Key files | `backend/server.py` (474 lines), `backend/runtime.py` (606 lines), plus 8 modules |

### 2.3 Audit implications for the rebuild

1. The rebuild targets the **marketing/positioning surface** (`Landing.jsx` and its copy), not the authenticated runtime pages. Runtime, Diff, Snapshot, and Auth routes and their backend contracts are preserved.
2. three.js, framer-motion, and Radix are already installed — the animation-rich direction needs no new heavy dependencies; additions must justify bundle cost.
3. The existing design system in `design_guidelines.json` remains the visual source of truth.

---

## 3. Page and section structure

One continuous single-page experience at `/`, composed of six sections in this order, plus persistent header and footer.

| # | Section | Intent | Interaction signature |
| --- | --- | --- | --- |
| 0 | Loading sequence | A branded boot-up moment before the page resolves; distinct from a default spinner | Short (under 1.5s on desktop), skippable by reduced-motion users, never blocks first content for long |
| 1 | Hero — "AI Command Center" | The positioning statement: enterprise AI transformation, run from one command center | Kinetic headline, three.js or canvas centerpiece, primary CTA to consultation |
| 2 | Unified Intelligence Layer | How the platform unifies pipelines, memory, knowledge, and live events into one view | The pipeline centerpiece: an animated, interactive flow diagram driven by the existing backend event model |
| 3 | Differentiation pillars | Three to four pillars that make the platform different (e.g. live observability, governed memory, human-in-the-loop control, measurable outcomes) | Scroll-triggered reveals; each pillar has its own micro-interaction, no repeated card pattern |
| 4 | Use-case library | A browsable set of transformation use cases across functions (operations, support, engineering, finance) | Filterable or expandable cards; touch-friendly on phones |
| 5 | Outcomes | What transformation delivers, stated qualitatively and with first-party framing only | Animated counters or diagrams allowed only where the numbers are our own placeholders, not competitor claims |
| 6 | Consultation CTA | Close with a direct invitation to talk to the team | Clear single action; connects to the existing auth/consultation flow without breaking it |

Responsive behavior is mandatory: every section reflows for 360px width and up, and all interactive elements are touch-friendly.

---

## 4. Content rules (binding for every deliverable)

1. **Original copy only.** Every headline, paragraph, button label, and tooltip on the new experience is written fresh for this product. No copy is lifted from the current landing page verbatim, and none is adapted from competitor material.
2. **No competitor-derived numbers or claims.** No metric, percentage, customer count, benchmark, or comparative claim sourced from the user's reference material or any competitor. Outcome statements must be qualitative or grounded in this project's own data only.
3. **No emoji anywhere in the project.** This applies to UI copy, code, comments, commit messages, documentation, and the visual README. Enforced by a repo-wide scan.
4. **Humanized writing.** Short sentences, active voice, concrete nouns. No filler superlatives, no stacked jargon, no all-caps hype. Reads like a person explaining the platform, not a template.
5. **Documentation as a visual artifact.** The project README is replaced by a hand-drawn-style visual markdown file with animated diagrams (embedded animated SVG/GIF or CSS-animated inline diagrams) instead of a default text readme. The same no-emoji rule applies.

---

## 5. Frontend / backend boundary

### Frontend owns

- All presentation: layout, copy, animation, 3D scene, responsive and touch behavior.
- Section composition of the landing experience and its loading sequence.
- Accessibility: reduced-motion support, keyboard focus order, contrast.
- Calling only the existing, documented API surface; no new backend dependency is introduced by the redesign.

### Backend owns

- The existing `/api` REST contract and `/api/ws/{sid}` websocket, unchanged for this rebuild.
- Session, event, memory, and auth behavior exactly as today.
- Any future content endpoints (e.g. a use-case catalog endpoint) are out of scope unless the frontend cannot meet performance targets with static content.

### Contract between them

- The landing experience may read public endpoints (e.g. `/api/models`) but must render fully even when the API is unreachable — static fallback content is part of the design.
- No websocket connection is required for the marketing surface; live-feel effects on the landing page are simulated client-side.
- Authentication flows (`/signin`, `/signup`) keep their current routes and contracts.

---

## 6. Testable acceptance criteria

| ID | Criterion | How it is verified |
| --- | --- | --- |
| AC-1 | Landing at `/` renders all six sections in the defined order on desktop and at 360px viewport width | Manual walkthrough plus automated viewport checks |
| AC-2 | A distinct loading/boot sequence precedes the hero and completes in under 1.5s on desktop, under 3s on throttled mobile | Performance trace |
| AC-3 | Pipeline visualization in the Unified Intelligence Layer animates on scroll and responds to pointer/touch input | Manual interaction test on desktop and touch device |
| AC-4 | All interactive targets are at least 44x44 CSS pixels and operable by touch; no hover-only interactions exist | Accessibility audit |
| AC-5 | Zero emoji characters in the repository (source, copy, docs, commit messages) | Repo-wide scan script |
| AC-6 | Zero competitor brand names, metrics, or claims in any user-facing copy or documentation | Content review checklist against the reference list |
| AC-7 | Copy is original: no sentence from the previous `Landing.jsx` survives verbatim | Diff review of old vs new copy |
| AC-8 | Animations respect `prefers-reduced-motion`; page remains fully usable with animations disabled | OS-level reduced-motion test |
| AC-9 | Performance budget: first contentful paint under 2.5s and total JS under 350KB gzipped on a mid-range phone profile (4G throttling) | Lighthouse or equivalent trace |
| AC-10 | Existing backend endpoints and websocket are unchanged; auth, runtime, diff, and snapshot routes continue to pass their current tests | API contract diff plus existing test suite |
| AC-11 | README is replaced by a visual markdown document with hand-drawn-style animated diagrams; renders correctly on GitHub | Visual review |
| AC-12 | Any commit in this rebuild is authored under the abhays02 identity with a human-written, humanized message | Git log review |

---

## 7. Ownership, next actions, open decisions

| Workstream | Owner role | Next action |
| --- | --- | --- |
| Visual direction and section wireframes | UI Designer | Propose hero and pipeline visual treatment within the existing design tokens |
| Landing rebuild implementation | Frontend Developer | Scaffold sections against this brief; hold to AC-8 and AC-9 |
| API boundary verification | Backend Engineer | Confirm no contract changes; guard AC-10 |
| Copywriting | Content Operations | Draft all six sections' copy under the rules in section 4 |
| Acceptance testing | QA Engineer | Build the AC-1 through AC-12 checklist into the test plan |
| Release coordination | DevOps Engineer | Confirm build/preview pipeline for the rebuilt frontend |

Open decisions (non-blocking, to resolve during design):

1. Whether the Outcomes section uses animated counters with our own placeholder data or purely qualitative statements — recommendation: qualitative first.
2. Whether the use-case library is static content or later backed by a small backend endpoint — recommendation: static for this rebuild.
3. Exact tooling for the animated README diagrams — decision deferred to the documentation task.

---

## 8. Residual risk

- three.js plus framer-motion on the landing page risks breaching the performance budget (AC-9); mitigation is lazy-loading the 3D scene and measuring early.
- "No competitor claims" depends on a maintained reference list; QA owns the checklist.
- CRA's limited code-splitting controls may constrain bundle optimization; craco config is the lever, and the frontend owner should verify early.
