# Command Center Backend API Contract

This document is the contract between the command center frontend and the
FastAPI backend. Everything under `/api/platform` is public, requires no
authentication, and is safe to call from the marketing surface.

Two promises shape the whole surface:

1. The command-center demo works without MongoDB. When the database is unreachable,
   storage falls back to memory and `/api/platform/health` reports it.
   Nothing on the landing experience may assume persisted storage.
2. The existing runtime contract is untouched. Sessions, auth, memory,
   skills, diff, snapshots, and the `/api/ws/{sid}` websocket behave exactly
   as before. Pipeline runs simply reuse that same websocket route, keyed by
   run id instead of session id.

The fallback is not a guarantee for the broader runtime API: `server.py`
still accesses `db` directly for sessions, skills, auth, generated UI and
snapshots. Those endpoints require reachable MongoDB. Demo health describes
demo storage, not full-runtime readiness.

Base URL: the value of `REACT_APP_BACKEND_URL` in the frontend environment.

---

## Health

### GET `/api/platform/health`

Reports engine status and which storage mode the server is in.

Response `200`:

```json
{
  "service": "loopaer-command-center",
  "storage": "in-memory",
  "engine": "online",
  "time": "2026-08-12T10:46:00.169114+00:00"
}
```

`storage` is either `"mongo"` or `"in-memory"`. The frontend can show a
subtle status hint from this but must never block on it.

---

## Content endpoints

All content payloads are original demo material. Every number is invented
for this experience; none of it describes a real deployment or any other
vendor's product.

### GET `/api/platform/use-cases?function=<name>`

The use-case library. Optional `function` filter; valid values are listed
in `functions`.

Response `200`:

```json
{
  "use_cases": [
    {
      "id": "uc-ops-triage",
      "title": "Operations Triage, Without the Queue",
      "function": "operations",
      "summary": "Route exceptions, alerts, and manual handoffs into a single governed flow.",
      "narrative": "Most operations teams lose their mornings to the same ritual ...",
      "signals": ["incident streams", "runbook references", "escalation history"],
      "time_to_value": "weeks"
    }
  ],
  "functions": ["operations", "support", "engineering", "finance"]
}
```

### GET `/api/platform/connectors`

The mocked enterprise connector catalog.

Response `200`:

```json
{
  "connectors": [
    {
      "id": "cn-atlas-erp",
      "name": "Atlas ERP",
      "category": "planning and resources",
      "description": "Reads orders, inventory positions, and approval chains from the Atlas planning suite.",
      "access": "read-only in demo",
      "latency_class": "batch"
    }
  ]
}
```

### GET `/api/platform/pillars`

Differentiation pillars. Each pillar carries a short tagline plus proof
points that map directly to platform capabilities.

Response `200`:

```json
{
  "pillars": [
    {
      "id": "pillar-live-observability",
      "title": "Watch the Work Happen",
      "tagline": "Every step of every pipeline is visible as it runs.",
      "description": "Most automation hides behind a success badge ...",
      "proof_points": [
        "stage-by-stage event stream over websocket and SSE",
        "full event replay for anyone joining late",
        "pausable and cancelable runs, not fire-and-forget jobs"
      ]
    }
  ]
}
```

### GET `/api/platform/outcomes`

Outcomes demo data. The `framing` sentence must stay visible near the
metrics; it discloses that the figures are invented for the demo.

Response `200`:

```json
{
  "outcomes": {
    "framing": "The figures below are demonstration values, invented for this experience. ...",
    "headline": "What a guided transformation tends to feel like",
    "metrics": [
      {
        "id": "om-triage-time",
        "label": "Morning triage time",
        "baseline": 95,
        "current": 28,
        "unit": "minutes",
        "direction": "down",
        "note": "Time a shift lead spends sorting the overnight queue."
      }
    ]
  }
}
```

---

## Pipeline demo engine

The engine walks a scripted run through six stages and narrates every step
as events. The frontend can draw the stage track ahead of time from the
stage map, then animate as events arrive.

### Stage map

#### GET `/api/platform/pipelines/stages`

Response `200`:

```json
{
  "stages": [
    { "id": "stage-intake",  "name": "Intake",  "description": "...", "duration_ms": 700 },
    { "id": "stage-plan",    "name": "Plan",    "description": "...", "duration_ms": 900 },
    { "id": "stage-connect", "name": "Connect", "description": "...", "duration_ms": 1000 },
    { "id": "stage-reason",  "name": "Reason",  "description": "...", "duration_ms": 1200 },
    { "id": "stage-verify",  "name": "Verify",  "description": "...", "duration_ms": 900 },
    { "id": "stage-deliver", "name": "Deliver", "description": "...", "duration_ms": 700 }
  ],
  "scenarios": [
    { "id": "ops-triage", "title": "Clear the overnight operations queue", "goal": "..." }
  ]
}
```

### Start a run

#### POST `/api/platform/pipelines/run`

Body (both fields optional):

```json
{ "scenario": "ops-triage", "speed": 1.0 }
```

`scenario` is one of the scenario ids from the stage map; unknown values
fall back to the default scenario. `speed` scales stage durations from
`0.1` (slow) to `5.0` (fast).

Response `200`: the run object, `state` initially `"running"`.

```json
{
  "run": {
    "id": "run_12a4df9ba3",
    "scenario": { "id": "ops-triage", "title": "...", "goal": "..." },
    "state": "running",
    "current_stage": null,
    "stages": [
      { "id": "stage-intake", "name": "Intake", "description": "...", "state": "pending" }
    ],
    "started_at": "2026-08-12T10:46:00+00:00",
    "finished_at": null
  }
}
```

Per-stage `state` moves `pending` → `active` → `done`. Run `state` moves
`running` → `completed` or `canceled`.

### Live event stream — two transports, one protocol

Every event has the same envelope:

```json
{
  "id": "ev_run_12a4df9ba3_1",
  "session_id": "run_12a4df9ba3",
  "type": "StageStarted",
  "ts": "2026-08-12T10:46:00+00:00",
  "seq": 1,
  "payload": {}
}
```

Event types, in the order a healthy run emits them:

| Type | Payload | Meaning |
| --- | --- | --- |
| `PipelineStarted` | scenario, stage_count | The run has begun |
| `StageStarted` | stage | A stage became active |
| `StageProgress` | stage, percent | Mid-stage heartbeat (currently 50) |
| `StageCompleted` | stage | A stage finished |
| `PipelineCompleted` | stages_completed, finished_at | Terminal success |
| `PipelineCanceled` | — | Terminal cancellation |

#### Websocket: `WS /api/ws/{run_id}`

This is the existing websocket route — connect with the run id in place of
a session id. The first message is `{"type": "Connected", ...}`; buffered
events replay immediately, then live events follow.

#### Server-sent events: `GET /api/platform/pipelines/{run_id}/stream`

`Content-Type: text/event-stream`. Each line is `data: <event json>`.
Late subscribers receive the event history first, then live events. The
stream closes itself after the terminal event. Use this transport where
websockets are awkward (for example, simple mobile demos); prefer the
websocket when you already hold a connection open.

### Run state and replay

#### GET `/api/platform/pipelines/{run_id}`

Returns the current run object as shown above. `404` for unknown runs.

#### GET `/api/platform/pipelines/{run_id}/events`

Ordered replay of every event emitted so far — the same envelopes as the
live stream, sorted by `seq`. Use it when a visitor opens the pipeline
panel after the run already finished.

#### POST `/api/platform/pipelines/{run_id}/cancel`

Cancels a running demo. `404` when the run does not exist or is no longer
running.

---

## Errors

Platform endpoints use plain HTTP status codes with a `detail` message:

| Status | Meaning |
| --- | --- |
| 404 | Unknown run id on any pipeline route |
| 422 | Malformed request body |

The frontend should treat every platform endpoint as optional: keep static
fallback content for all four catalogs and render the pipeline track from
the stage map alone if the API is unreachable.

---

## What did not change

- `POST/GET /api/sessions`, loop controls, branch, knowledge, events
- `/api/models`, `/api/skills`, exports
- `/api/auth/signup`, `/api/auth/login`, `/api/auth/whoami`
- `/api/memory`, `/api/memory/recall`
- `/api/secrets/*`, `/api/genui`, `/api/diff/snapshot`, `/api/snapshots/*`
- The `WS /api/ws/{sid}` protocol (envelope, replay, `Connected` greeting)
