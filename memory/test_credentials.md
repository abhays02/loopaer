# Lumen Runtime — Test Credentials

No auth in v1 — sessions are public per-preview URL.

## OpenRouter
- Key: configured in `/app/backend/.env` as `OPENROUTER_API_KEY`
- Default model: `openrouter/free` (auto-selects available free model)
- Fallback cascade: `openrouter/free → gpt-oss-20b → qwen3-next → gemma-4-31b`

## Test session
Any goal string creates a fresh session. Example flow:
- POST /api/sessions {"goal": "vector search for legal docs"}
- POST /api/sessions/{sid}/run-all
- WS  /api/ws/{sid} for live events
