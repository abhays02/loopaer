"""Command center platform API — unit and integration tests.

These tests run the FastAPI app in-process with MongoDB deliberately
unconfigured, proving the graceful in-memory fallback and covering the
content endpoints, the pipeline engine, and both event transports.
"""
import os
import sys
import unicodedata

import pytest

# Force the no-database mode before the server module is imported.
os.environ.pop("MONGO_URL", None)
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastapi.testclient import TestClient  # noqa: E402
import server  # noqa: E402


def _contains_emoji(value) -> bool:
    """Detect emoji-like symbols so the copy policy can be checked mechanically."""
    if isinstance(value, dict):
        return any(_contains_emoji(v) for v in value.values())
    if isinstance(value, list):
        return any(_contains_emoji(v) for v in value)
    if isinstance(value, str):
        for ch in value:
            if unicodedata.category(ch) == "So":
                return True
    return False


@pytest.fixture(scope="module")
def client():
    with TestClient(server.app) as c:
        yield c


# ---- AC-4: graceful fallback without MongoDB -------------------------------

def test_health_reports_in_memory_storage(client):
    res = client.get("/api/platform/health")
    assert res.status_code == 200
    body = res.json()
    assert body["storage"] == "in-memory"
    assert body["engine"] == "online"


# ---- AC-1: content endpoints ------------------------------------------------

def test_use_cases_endpoint(client):
    res = client.get("/api/platform/use-cases")
    assert res.status_code == 200
    body = res.json()
    assert len(body["use_cases"]) >= 4
    assert set(body["functions"]) == {"operations", "support", "engineering", "finance"}
    for case in body["use_cases"]:
        assert case["title"].strip() and case["summary"].strip() and case["narrative"].strip()
    assert not _contains_emoji(body)


def test_use_cases_filter(client):
    res = client.get("/api/platform/use-cases", params={"function": "finance"})
    body = res.json()
    assert body["use_cases"] and all(c["function"] == "finance" for c in body["use_cases"])


def test_connectors_endpoint(client):
    res = client.get("/api/platform/connectors")
    assert res.status_code == 200
    connectors = res.json()["connectors"]
    assert len(connectors) >= 4
    assert all(c["name"].strip() and c["description"].strip() for c in connectors)
    assert not _contains_emoji(res.json())


def test_pillars_endpoint(client):
    res = client.get("/api/platform/pillars")
    assert res.status_code == 200
    pillars = res.json()["pillars"]
    assert len(pillars) >= 3
    for p in pillars:
        assert p["title"].strip() and p["tagline"].strip() and p["proof_points"]
    assert not _contains_emoji(res.json())


def test_outcomes_endpoint(client):
    res = client.get("/api/platform/outcomes")
    assert res.status_code == 200
    outcomes = res.json()["outcomes"]
    # The framing sentence must flag the numbers as invented demo values.
    assert "demonstration values" in outcomes["framing"]
    assert len(outcomes["metrics"]) >= 3
    for m in outcomes["metrics"]:
        assert m["label"].strip() and m["unit"].strip()
        assert m["direction"] in ("up", "down")
    assert not _contains_emoji(res.json())


# ---- AC-2 / AC-3: pipeline engine and event transports ----------------------

def test_stage_map_endpoint(client):
    res = client.get("/api/platform/pipelines/stages")
    assert res.status_code == 200
    body = res.json()
    assert [s["name"] for s in body["stages"]] == ["Intake", "Plan", "Connect", "Reason", "Verify", "Deliver"]
    assert body["scenarios"]


def _start_run(client, speed=8.0) -> str:
    res = client.post("/api/platform/pipelines/run", json={"scenario": "ops-triage", "speed": speed})
    assert res.status_code == 200
    run = res.json()["run"]
    assert run["state"] == "running"
    assert len(run["stages"]) == 6
    return run["id"]


def test_websocket_streams_stage_events(client):
    run_id = _start_run(client)
    seen = []
    with client.websocket_connect(f"/api/ws/{run_id}") as ws:
        first = ws.receive_json()
        assert first["type"] == "Connected"
        while True:
            ev = ws.receive_json()
            seen.append(ev["type"])
            if ev["type"] == "PipelineCompleted":
                break
    # Every stage opened and closed, in order, between start and completion.
    assert seen[0] == "PipelineStarted"
    starts = [t for t in seen if t == "StageStarted"]
    dones = [t for t in seen if t == "StageCompleted"]
    assert len(starts) == 6 and len(dones) == 6
    assert seen.index("PipelineCompleted") == len(seen) - 1


def test_sse_stream_and_replay(client):
    run_id = _start_run(client)
    with client.stream("GET", f"/api/platform/pipelines/{run_id}/stream") as res:
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("text/event-stream")
        text = "".join(res.iter_text())
    events = [line[len("data: "):] for line in text.splitlines() if line.startswith("data: ")]
    assert events and events[-1].endswith('"PipelineCompleted"') or "PipelineCompleted" in events[-1]

    # Late replay returns the same ordered history.
    replay = client.get(f"/api/platform/pipelines/{run_id}/events").json()["events"]
    assert [e["type"] for e in replay][0] == "PipelineStarted"
    assert replay[-1]["type"] == "PipelineCompleted"
    assert [e["seq"] for e in replay] == sorted(e["seq"] for e in replay)

    # Run state is terminal and consistent.
    run = client.get(f"/api/platform/pipelines/{run_id}").json()["run"]
    assert run["state"] == "completed"
    assert all(s["state"] == "done" for s in run["stages"])


def test_unknown_run_returns_404(client):
    assert client.get("/api/platform/pipelines/run_nope").status_code == 404
    assert client.get("/api/platform/pipelines/run_nope/events").status_code == 404


# ---- AC-5: existing contract preserved --------------------------------------

def test_existing_surface_unchanged(client):
    assert client.get("/api/").json() == {"service": "loopaer-runtime", "status": "online"}
    assert client.get("/api/models").status_code == 200
    routes = {(r.path, tuple(sorted(r.methods or []))) for r in server.api.routes if hasattr(r, "methods")}
    for path in ("/api/sessions", "/api/models", "/api/skills", "/api/auth/signup", "/api/memory"):
        assert any(p == path for p, _ in routes), f"missing legacy route {path}"
    ws_paths = {r.path for r in server.app.routes if "WebSocket" in r.__class__.__name__}
    assert "/api/ws/{sid}" in ws_paths
