# AERwolf — Product Requirements & Progress

## Positioning
**Built for AGENTS · not chatbots.** A single LLM prompt is a lottery. A decomposed architecture (separate files, typed nodes, ranked algorithms per step) makes agents verifiable and reproducible. Landing thesis: **"LLMs hallucinate. Pipelines don't."**

## Tech stack
Frontend: React 19 · React Router 7 · Tailwind 3 · React Flow 11 · Framer Motion · lucide-react · Inter + JetBrains Mono
Backend: FastAPI · motor · httpx · emergentintegrations · OpenRouter · local OpenAI-compatible endpoints (Ollama / LM Studio)
Auth: Emergent-managed Google OAuth
Design: Raycast-inspired dark (`#07080a` + coral `#ff6363`) + light mode + liquid-glass gradient + diffused-frame video backdrop on Landing

## Iterations shipped

### 1 — MVP
Auth · Search parallel × 4 · Wisdom card · Canvas · Skills CRUD · SKILL.md export

### 2 — LLM freedom + Two-stage GenUI
OpenRouter · TechFinder · HyperframePlayer (20 seeded + LLM fallback + fuzzy) · ComparePanel · References tab (distill.pub/d2l/colah embeds)

### 3 — Raycast refresh · Notebook · STORM · ⌘K
Design overhaul · Notebook (markdown + sources + chat) · STORM multi-perspective grounded report · Compile-to-Canvas · Command palette

### 4 — Skills · Local LLM · Light mode · Alive Landing
`[[skill:]]` in Notebook · Local Ollama/LM Studio BYO · Light theme · Active-node shimmer · Landing rebuilt with agent-thesis + rotating badge + counters + hallucination-risk demo + 5-node OCR sample

### 5 — Video Landing · Scroll pipeline · Algo/Stack races · Backlog complete
- **DiffusedBackdrop**: silent video-like ambient looping through blurred DBNet/Diffusion/Attention/U-Net SVG frames (via public `/api/hyperframes/public/{key}` endpoint)
- **ScrollPipeline**: sticky vertical rail with scroll-locked coral progress dot + stage cards revealing in viewport (search → synthesise → sketch → rank → ship)
- **AlgoComparisonRace**: animated head-to-head bars for DBNet/CRAFT/YOLO-v9 and TrOCR/CRNN/SVTR — bars fill on view
- **StackShowcase**: seamless marquee of 11 tech chips (PaddleOCR · ncnn · ONNX Runtime · TensorRT · PyTorch · timm · HuggingFace · Ollama · LM Studio · vLLM · sglang)
- **Mouse-scroll cue** on hero
- **`[[skill:]]` in ArchNode descriptions**: nodes render coral inline chips for referenced skills
- **Streaming AlgorithmDrawer**: progressive reveal (220ms stagger) with "streaming N/M" indicator (perceived SSE without cookie plumbing)
- **Markdown→HTML preview in Notebook**: full inline renderer (headings/bold/italic/code/links/lists/skill-chips) with Edit/Preview toggle

## Prioritised backlog

### P2 — Real SSE from `/api/algorithms/suggest/stream`
Server yields JSON deltas; drawer subscribes via fetch reader stream (avoids EventSource+cookie issues)

### P3 — Vector search over Notebook sources
Add embedding model (Emergent LLM embedding or local sentence-transformers)  
Chunk uploaded/pasted content · store in Mongo · similarity search from chat

### P3 — Public skill registry
One-click publish · fork tree with attribution · verified reviewer badges

## Files
Backend: `server.py` (32 routes), `hyperframes.py`, `references.py`
Frontend pages: `Landing.jsx`, `Dashboard.jsx`, `Workspace.jsx`, `Notebook.jsx`, `Library.jsx`, `Settings.jsx`, `AuthCallback.jsx`
Frontend components: `Header.jsx`, `AlgorithmDrawer.jsx`, `TechFinder.jsx`, `HyperframePlayer.jsx`, `ComparePanel.jsx`, `ResultsPanel.jsx`, `ArchNode.jsx`, `CommandPalette.jsx`, `SkillMention.jsx`, `MarkdownPreview.jsx`, `LandingVisuals.jsx`
Libraries: `api.js`, `auth.js`, `theme.js`, `models.js`

## Test creds
See `/app/memory/test_credentials.md`. session_token=`test_session_aerwolf_001`.
