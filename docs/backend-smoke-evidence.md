# Command Center Backend — Smoke Evidence

Date: 2026-08-12. Server: uvicorn backend/server.py on port 8321, started with MONGO_URL unset to exercise the in-memory fallback. Tests: pytest tests/test_platform_api.py on the same build.

## Server boot (in-memory fallback)
```
3:INFO:loopaer:MONGO_URL not set; running the command center on in-memory storage
4:INFO:     Application startup complete.
5:INFO:     Uvicorn running on http://127.0.0.1:8321 (Press CTRL+C to quit)
```

## Test suite
```
-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
11 passed, 6 warnings in 3.45s
```

## Content endpoints over HTTP
```
== GET /platform/health
{"service":"loopaer-command-center","storage":"in-memory","engine":"online","time":"2026-08-12T10:46:00.169114+00:00"}
== GET /platform/use-cases (first 220 chars)
{"use_cases":[{"id":"uc-ops-triage","title":"Operations Triage, Without the Queue","function":"operations","summary":"Route exceptions, alerts, and manual handoffs into a single governed flow.","narrative":"Most operatio
== GET /platform/connectors (names)
['Atlas ERP', 'Beacon CRM', 'Ledgerline Finance', 'Relay Service Desk', 'Meridian Documents', 'Forge Delivery']
== GET /platform/pillars (titles)
['Watch the Work Happen', 'Memory With a Paper Trail', 'Humans Hold the Controls', 'Outcomes You Can Stand Behind']
== GET /platform/outcomes (metric labels)
['Morning triage time', 'Draft answers accepted with light edits', 'Review meetings starting on time', 'Unexplained variances at close']
== GET /platform/pipelines/stages
['Intake', 'Plan', 'Connect', 'Reason', 'Verify', 'Deliver'] 3 scenarios
```

## Pipeline run over live websocket
```
== POST /platform/pipelines/run -> run_12a4df9ba3 state: running
== WS /api/ws/{run_id} event types: ['Connected', 'PipelineStarted', 'StageStarted', 'StageProgress', 'StageCompleted', 'StageStarted', 'StageProgress', 'StageCompleted', 'StageStarted', 'StageProgress', 'StageCompleted', 'StageStarted', 'StageProgress', 'StageCompleted', 'StageStarted', 'StageProgress', 'StageCompleted', 'StageStarted', 'StageProgress', 'StageCompleted', 'PipelineCompleted']
Traceback (most recent call last):
```

## SSE stream, replay, state, error paths
```
== SSE /platform/pipelines/{run}/stream -> 200 text/event-stream; charset=utf-8
   events: 20 first: PipelineStarted last: PipelineCompleted
== replay -> 20 events, ordered: True
== run state -> completed all stages done: True
== GET /platform/pipelines/run_missing -> 404
== GET /platform/pipelines/run_missing/events -> 404
== GET / -> {'service': 'loopaer-runtime', 'status': 'online'}
== GET /models keys -> ['models', 'default']
```
