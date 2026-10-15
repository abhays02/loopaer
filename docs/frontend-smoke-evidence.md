# Frontend command center — smoke evidence

Captured 2026-08-12 on branch `task/frontend-command-center-20260812-172446`, commits `4e5bf7d` and `1df9b9b`, authored as abhays02.

## Environment

- Node v24.3.0, CRA + craco + Tailwind build (`npm run build`)
- Dev server: `npm start` on port 3000
- Backend: uvicorn `server:app` on port 8000 with `MONGO_URL` unset (in-memory storage)
- Browser: Playwright Chromium, scripted session

## Reproduce

```bash
# terminal 1 — backend (MongoDB optional for command-center demo only)
cd backend
python -m uvicorn server:app --host 127.0.0.1 --port 8000

# terminal 2 — frontend
cd frontend
npm start        # http://localhost:3000

# terminal 3 — production build
cd frontend
CI=false npm run build
```

Scope clarification: this historical smoke run exercised the landing and
scripted pipeline, not the full runtime. Runtime endpoints still access
MongoDB directly; in-memory demo startup does not make auth, sessions,
skills or snapshots fully usable without a database.

## Production build

Compiled successfully (one pre-existing eslint warning in `src/pages/Runtime.jsx`, untouched by this change). Gzipped output with code splitting:

```
131.24 kB  build/static/js/408.*.chunk.js    (three.js scene, lazy)
100.72 kB  build/static/js/main.*.js
 28.26 kB  build/static/js/925.*.chunk.js    (framer-motion domAnimation)
 13.19 kB  build/static/css/main.*.css
 ... smaller route chunks
```

Routes are `React.lazy` loaded; the landing uses `LazyMotion strict` with `domAnimation`; the three.js hero scene is in its own lazy chunk.

## Dev server smoke — desktop 1440x900

- HTTP 200, title `Loopaer — The Enterprise AI Command Center`
- h1: "Every system. One command center. Zero blind spots."
- All six sections render: hero, `#intelligence` (unified intelligence layer + live pipeline), `#pillars`, `#use-cases`, `#outcomes`, `#consultation` (closing CTA)
- Pipeline run button present; run started against the backend and stage states advanced (Cancel run control appeared mid-run)
- Console errors: none

## Dev server smoke — mobile 390x844 (touch emulation)

- Page renders and scrolls without console errors
- Touch target audit: after commit `1df9b9b` (chip height raised to 44px under `pointer: coarse`), zero interactive elements under 44x44px
- Use-case filter chips scroll horizontally with snap on narrow screens

## Reduced motion

- Loaded with `prefers-reduced-motion: reduce`: page renders immediately with content visible; CSS and framer-motion reduce paths engaged (`useReducedMotion` across Loader, Cursor, Header, Hero; CSS `@media (prefers-reduced-motion: reduce)` in landing.css)

## Backend contract checks (curl)

```
GET /api/platform/health            -> 200 {"storage":"in-memory","engine":"online"}
GET /api/platform/pipelines/stages  -> 200, six stages Intake..Deliver
GET /api/platform/use-cases         -> 200, emoji-free original copy
```

## Copy policy

Automated scan of `frontend/src/**/*.{js,jsx,css,html}` for emoji codepoints: zero hits.

## Screenshots (local, not committed)

`%TEMP%/loopaer-smoke/`: desktop-hero.png, desktop-pipeline.png, desktop-pipeline-running.png, desktop-cta.png, mobile-hero.png, mobile-pipeline.png, mobile-usecases.png, mobile-cta.png, reduced-motion.png

## Residual risk

- Visual motion choreography (loader timing, cursor magnetism) was verified structurally (code paths, reduced-motion fallback, screenshots) rather than frame-by-frame.
- WebSocket/SSE streaming was exercised through the running pipeline and the backend's own smoke evidence; no long-soak test was run.
