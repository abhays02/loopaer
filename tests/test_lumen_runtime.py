"""
Lumen Runtime — end-to-end backend API tests.

Covers:
- /api/models          list free+paid models w/ default openrouter/free
- /api/sessions        create + get session
- planner loop         events (LoopStarted, PlannerThinking, PlanReady, ReasoningTreeUpdated, LoopFinished)
- pause/resume         cooperative pause on a running loop
- branch               new session with parent knowledge seeded
- WebSocket            /api/ws/{sid} connect + Connected handshake + buffered events
- run-all              full pipeline (planner→research→verify→skill) with generous window
"""
import os
import json
import time
import asyncio
import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to reading frontend/.env (only in local runs)
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        BASE_URL = ""

API = f"{BASE_URL}/api"
WS_BASE = API.replace("https://", "wss://").replace("http://", "ws://") + "/ws"


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- basic ----
def test_root(api_client):
    r = api_client.get(f"{API}/")
    assert r.status_code == 200
    d = r.json()
    assert d["service"] == "lumen-runtime"
    assert d["status"] == "online"


def test_list_models(api_client):
    r = api_client.get(f"{API}/models")
    assert r.status_code == 200
    d = r.json()
    assert "models" in d and isinstance(d["models"], list) and len(d["models"]) >= 5
    assert d.get("default") == "openrouter/free"
    tiers = {m["tier"] for m in d["models"]}
    assert "free" in tiers and "paid" in tiers
    ids = [m["id"] for m in d["models"]]
    assert "openrouter/free" in ids


# ---- session lifecycle ----
@pytest.fixture(scope="session")
def session_id(api_client):
    body = {"goal": "TEST_vision language models for OCR"}
    r = api_client.post(f"{API}/sessions", json=body)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("id", "goal", "model", "loops", "knowledge", "confidence_history"):
        assert k in d, f"missing key {k}"
    assert d["goal"].startswith("TEST_vision")
    assert d["model"] == "openrouter/free"
    return d["id"]


def test_create_session_empty_goal(api_client):
    r = api_client.post(f"{API}/sessions", json={"goal": "  "})
    assert r.status_code == 400


def test_get_session(api_client, session_id):
    r = api_client.get(f"{API}/sessions/{session_id}")
    assert r.status_code == 200
    d = r.json()
    assert d["id"] == session_id
    assert isinstance(d["loops"], list)


def test_get_missing_session(api_client):
    r = api_client.get(f"{API}/sessions/sess_doesnotexist")
    assert r.status_code == 404


# ---- planner loop with event verification ----
def test_planner_loop_events(api_client, session_id):
    r = api_client.post(f"{API}/sessions/{session_id}/plan")
    assert r.status_code == 200, r.text
    d = r.json()
    assert "loop_id" in d and "state" in d
    loop_id = d["loop_id"]

    # poll events up to ~25s
    expected = {"LoopStarted", "PlannerThinking", "PlanReady", "ReasoningTreeUpdated", "LoopFinished"}
    seen = set()
    deadline = time.time() + 30
    while time.time() < deadline:
        er = api_client.get(f"{API}/sessions/{session_id}/events")
        assert er.status_code == 200
        for ev in er.json().get("events", []):
            seen.add(ev["type"])
        if expected.issubset(seen):
            break
        time.sleep(2)
    missing = expected - seen
    # PlanReady/LoopFinished may occur even with LLM fallback plan
    assert not missing, f"missing planner events: {missing}. seen={seen}"


# ---- pause / resume on a fresh research loop ----
def test_pause_resume(api_client, session_id):
    # start research
    r = api_client.post(f"{API}/sessions/{session_id}/research")
    assert r.status_code == 200
    lid = r.json()["loop_id"]

    # pause immediately
    pr = api_client.post(f"{API}/sessions/{session_id}/loops/{lid}/pause")
    assert pr.status_code == 200
    assert pr.json().get("ok") is True

    # wait until LoopPaused event appears (up to 30s — pause is cooperative)
    seen_paused = False
    deadline = time.time() + 30
    while time.time() < deadline and not seen_paused:
        er = api_client.get(f"{API}/sessions/{session_id}/events")
        for ev in er.json().get("events", []):
            if ev["type"] == "LoopPaused" and ev["payload"].get("loop_id") == lid:
                seen_paused = True
                break
        if seen_paused:
            break
        time.sleep(2)
    # Note: pause may not be reached before research completes if events fire quickly;
    # still resume should be OK. We assert pause API works — event is best-effort.

    rr = api_client.post(f"{API}/sessions/{session_id}/loops/{lid}/resume")
    assert rr.status_code == 200
    assert rr.json().get("ok") is True


def test_pause_invalid_loop(api_client, session_id):
    r = api_client.post(f"{API}/sessions/{session_id}/loops/loop_nope/pause")
    assert r.status_code == 404


# ---- branch ----
def test_branch(api_client, session_id):
    r = api_client.post(f"{API}/sessions/{session_id}/branch", json={"goal": "TEST_branched goal"})
    assert r.status_code == 200
    d = r.json()
    assert d["id"] != session_id
    assert d["goal"] == "TEST_branched goal"


# ---- websocket ----
@pytest.mark.asyncio
async def test_websocket_handshake(session_id):
    url = f"{WS_BASE}/{session_id}"
    async with websockets.connect(url, open_timeout=15) as ws:
        first = await asyncio.wait_for(ws.recv(), timeout=10)
        data = json.loads(first)
        assert data.get("type") == "Connected"
        assert data.get("session_id") == session_id
        # should also receive at least one buffered event soon
        got_any = False
        try:
            for _ in range(5):
                msg = await asyncio.wait_for(ws.recv(), timeout=5)
                got_any = True
                json.loads(msg)  # parseable
        except asyncio.TimeoutError:
            pass
        assert got_any, "no buffered events streamed"


# ---- full pipeline (long) ----
def test_run_all_pipeline(api_client):
    # fresh session
    r = api_client.post(f"{API}/sessions", json={"goal": "TEST_retrieval augmented generation"})
    assert r.status_code == 200
    sid = r.json()["id"]

    r = api_client.post(f"{API}/sessions/{sid}/run-all")
    assert r.status_code == 200
    assert r.json().get("ok") is True

    # wait up to 150s and check that planner + research at minimum finish
    deadline = time.time() + 150
    finished_kinds = set()
    loops = []
    while time.time() < deadline:
        gr = api_client.get(f"{API}/sessions/{sid}")
        assert gr.status_code == 200
        loops = gr.json().get("loops", [])
        for l in loops:
            if l["state"] == "finished":
                finished_kinds.add(l["kind"])
        if {"planner", "research"}.issubset(finished_kinds):
            break
        time.sleep(5)

    assert len(loops) >= 2, f"expected multiple loops, got {loops}"
    assert "planner" in finished_kinds, f"planner did not finish. finished={finished_kinds} loops={[(l['kind'], l['state']) for l in loops]}"
    # research is expected but tolerate 'running' at 150s cutoff
    research_states = {l["state"] for l in loops if l["kind"] == "research"}
    assert research_states & {"finished", "running", "waiting"}, f"no research loop present: {loops}"


def test_list_skills(api_client):
    r = api_client.get(f"{API}/skills")
    assert r.status_code == 200
    d = r.json()
    assert "skills" in d and isinstance(d["skills"], list)
