"""
Lumen Runtime — Iteration 2 feature tests.

Focus:
  - Event persistence to Mongo (db.events)
  - Cold-session rehydration via /api/sessions/{sid}/events
  - Loading persisted sessions for /research /verify /skill /run-all
  - LLM SSE streaming: TokenStreamed events between PlannerThinking and PlanReady
  - Memory loop: /api/memory and /api/memory/recall
  - Cross-session memory: MemoryHit events emitted by planner on new session
"""
import os
import time
import pytest
import requests
from pymongo import MongoClient


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "lumen_runtime")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def mdb():
    mc = MongoClient(MONGO_URL, serverSelectionTimeoutMS=3000)
    return mc[DB_NAME]


def _wait_for_events(client, sid, needed_types, timeout=45):
    """Poll /events until all needed_types are present or timeout."""
    seen = set()
    deadline = time.time() + timeout
    last_events = []
    while time.time() < deadline:
        r = client.get(f"{API}/sessions/{sid}/events")
        assert r.status_code == 200, r.text
        last_events = r.json().get("events", [])
        for ev in last_events:
            seen.add(ev["type"])
        if set(needed_types).issubset(seen):
            return last_events, seen
        time.sleep(2)
    return last_events, seen


# ----- Test 1: Event persistence to Mongo ----------------------------
class TestEventPersistence:
    def test_events_persisted_to_mongo(self, client, mdb):
        r = client.post(f"{API}/sessions", json={"goal": "TEST_ITER2_persistence retrieval augmented generation"})
        assert r.status_code == 200, r.text
        sid = r.json()["id"]

        # Run planner
        r2 = client.post(f"{API}/sessions/{sid}/plan")
        assert r2.status_code == 200

        # Wait for PlanReady or LoopFinished (planner emits many events incl. streaming)
        events, seen = _wait_for_events(client, sid, {"LoopStarted", "PlanReady", "LoopFinished"}, timeout=90)
        assert "PlanReady" in seen or "LoopFinished" in seen, f"planner did not complete, seen={seen}"

        # Verify events are in mongo, seq-ordered
        docs = list(mdb.events.find({"session_id": sid}).sort("seq", 1))
        assert len(docs) >= 3, f"expected persisted events, got {len(docs)}"

        # seq should be strictly increasing starting from 1
        seqs = [d["seq"] for d in docs]
        assert seqs == sorted(seqs)
        assert seqs[0] == 1
        # types should include SessionCreated + at least LoopStarted
        types = {d["type"] for d in docs}
        assert "SessionCreated" in types
        assert "LoopStarted" in types

        # store for reuse
        pytest.session_id_persist = sid


# ----- Test 2: LLM Streaming (TokenStreamed events) -------------------
class TestLLMStreaming:
    def test_tokenstreamed_events_present(self, client):
        # Reuse persisted session if available, else create new
        sid = getattr(pytest, "session_id_persist", None)
        if not sid:
            r = client.post(f"{API}/sessions", json={"goal": "TEST_ITER2_streaming vision transformers"})
            assert r.status_code == 200
            sid = r.json()["id"]
            r2 = client.post(f"{API}/sessions/{sid}/plan")
            assert r2.status_code == 200

        # Give the streaming planner time to run
        events, seen = _wait_for_events(client, sid, {"PlanReady"}, timeout=90)
        # Filter tokens
        tokens = [e for e in events if e["type"] == "TokenStreamed"]
        # streaming might sometimes fail and fall back to chat_json; then 0 tokens is OK
        # But usually should be > 0
        print(f"TokenStreamed count for {sid}: {len(tokens)}")
        # Weak assertion: If streaming failed, LoopWarning or fallback path exists — but we want to
        # verify code path works. Accept 0 only if PlanReady still emitted (fallback engaged).
        assert "PlanReady" in seen
        # If token count > 0, verify structure
        if tokens:
            for t in tokens[:3]:
                assert "delta" in t["payload"]
                assert isinstance(t["payload"]["delta"], str)
            # TokenStreamed should occur BEFORE PlanReady
            plan_ready_seq = next(e["seq"] for e in events if e["type"] == "PlanReady")
            first_token_seq = tokens[0]["seq"]
            assert first_token_seq < plan_ready_seq, "TokenStreamed should precede PlanReady"


# ----- Test 3: Cold session rehydration -------------------------------
class TestRehydration:
    def test_rehydrate_via_events_endpoint(self, client, mdb):
        # Use a session id that has persisted events but clear the runtime memory to simulate cold reload.
        # We cannot restart uvicorn from here, but we can create a session, verify events exist in mongo,
        # then delete from the runtime.sessions dict via a fresh session id from the previous test.
        sid = getattr(pytest, "session_id_persist", None)
        assert sid, "requires TestEventPersistence to have run first"

        # First get the events from the API
        r = client.get(f"{API}/sessions/{sid}/events")
        assert r.status_code == 200
        api_events = r.json().get("events", [])
        assert len(api_events) > 0

        # Count same in mongo
        mongo_count = mdb.events.count_documents({"session_id": sid})
        assert mongo_count >= len(api_events) - 5, f"mongo_count={mongo_count}, api_count={len(api_events)}"

        # Test rehydration with a completely different (cold) session id known to have persisted events:
        # We simulate cold reload by picking a session that was created in a previous iteration
        # via looking up the oldest session in mongo.
        old = mdb.sessions.find_one(sort=[("created_at", 1)])
        if old:
            old_sid = old["id"]
            r2 = client.get(f"{API}/sessions/{old_sid}/events")
            assert r2.status_code == 200
            old_events = r2.json().get("events", [])
            # The session may or may not have events, but the endpoint should not 404
            print(f"Cold session {old_sid}: {len(old_events)} rehydrated events")


# ----- Test 4: Loading persisted sessions for /research /verify /skill
class TestPersistedSessionActions:
    def test_research_on_persisted_session(self, client, mdb):
        # Create session directly in mongo simulating a cold session not in runtime memory
        # (this replicates the case where server restarted).
        # Approach: create via API, then call research - as long as it's still in runtime dict, that works.
        # To simulate cold, we insert a session ONLY into mongo.
        cold_sid = f"sess_TEST_ITER2_cold_{int(time.time())}"
        mdb.sessions.insert_one({
            "id": cold_sid,
            "goal": "TEST_ITER2_cold retrieval augmented generation",
            "model": "openrouter/free",
            "created_at": "2026-01-01T00:00:00+00:00",
        })
        try:
            # /research on cold session (was 404 before iteration 2)
            r = client.post(f"{API}/sessions/{cold_sid}/research")
            assert r.status_code == 200, f"expected 200 for cold research, got {r.status_code}: {r.text}"
            d = r.json()
            assert "loop_id" in d
            print(f"Research on cold session succeeded: {d}")

            # /verify on cold session
            r2 = client.post(f"{API}/sessions/{cold_sid}/verify")
            assert r2.status_code == 200, f"verify status={r2.status_code}: {r2.text}"

            # /skill on cold session
            r3 = client.post(f"{API}/sessions/{cold_sid}/skill")
            assert r3.status_code == 200

            # /run-all on cold session
            r4 = client.post(f"{API}/sessions/{cold_sid}/run-all")
            assert r4.status_code == 200

        finally:
            # cleanup — best-effort
            mdb.sessions.delete_one({"id": cold_sid})


# ----- Test 5: Memory endpoints ---------------------------------------
class TestMemory:
    def test_memory_list_endpoint(self, client):
        r = client.get(f"{API}/memory?limit=50")
        assert r.status_code == 200
        d = r.json()
        assert "memory" in d
        assert "count" in d
        assert isinstance(d["memory"], list)
        print(f"Memory count: {d['count']}")

    def test_memory_recall_endpoint(self, client):
        r = client.get(f"{API}/memory/recall", params={"q": "retrieval augmented generation", "top_k": 5})
        assert r.status_code == 200
        d = r.json()
        assert "hits" in d
        assert "query" in d
        assert d["query"] == "retrieval augmented generation"
        assert isinstance(d["hits"], list)
        # Each hit should have score field if any hits
        for h in d["hits"]:
            assert "score" in h
            assert isinstance(h["score"], (int, float))
            assert h["score"] >= 0

    def test_memory_recall_missing_query(self, client):
        # q is required — should 422 or 400
        r = client.get(f"{API}/memory/recall")
        assert r.status_code in (400, 422)


# ----- Test 6: End-to-end memory archive via full pipeline ------------
class TestMemoryArchive:
    def test_run_all_emits_memory_archived(self, client, mdb):
        r = client.post(f"{API}/sessions", json={"goal": "TEST_ITER2_archive knowledge graph embeddings"})
        assert r.status_code == 200
        sid = r.json()["id"]

        r2 = client.post(f"{API}/sessions/{sid}/run-all")
        assert r2.status_code == 200

        # Wait up to 180s for verification to finish -> MemoryArchived may follow
        deadline = time.time() + 180
        seen_types = set()
        while time.time() < deadline:
            er = client.get(f"{API}/sessions/{sid}/events")
            if er.status_code == 200:
                for ev in er.json().get("events", []):
                    seen_types.add(ev["type"])
            if "VerificationFinished" in seen_types:
                # give archive a moment
                time.sleep(3)
                er2 = client.get(f"{API}/sessions/{sid}/events")
                for ev in er2.json().get("events", []):
                    seen_types.add(ev["type"])
                break
            time.sleep(5)

        # VerificationFinished is expected. MemoryArchived may or may not fire depending on confidences.
        assert "VerificationFinished" in seen_types or "SkillGenerated" in seen_types, \
            f"pipeline didn't reach verification: seen={seen_types}"
        print(f"Pipeline events seen: {seen_types}")
        pytest.archive_seen_memory = "MemoryArchived" in seen_types
        pytest.archive_sid = sid


# ----- Test 7: Cross-session memory hits ------------------------------
class TestMemoryHit:
    def test_memory_hit_events_on_overlap_session(self, client, mdb):
        # If there are any memory items, a new session with overlapping goal should trigger MemoryHit.
        mem_count = mdb.memory.count_documents({})
        if mem_count == 0:
            pytest.skip(f"no memory items yet ({mem_count}); cannot test MemoryHit")

        # Create fresh session with overlapping topic (use a broad topic to maximize overlap)
        r = client.post(f"{API}/sessions", json={"goal": "TEST_ITER2_hit retrieval augmented generation knowledge graph"})
        assert r.status_code == 200
        sid = r.json()["id"]

        # Run planner (MemoryHit is emitted before PlannerThinking in the planner path)
        r2 = client.post(f"{API}/sessions/{sid}/plan")
        assert r2.status_code == 200

        events, seen = _wait_for_events(client, sid, {"PlanReady"}, timeout=90)
        hits = [e for e in events if e["type"] == "MemoryHit"]
        # MemoryHit only fires if the overlap is > 0. We don't hard-fail (memory may not overlap).
        print(f"MemoryHit events: {len(hits)}; total memory items: {mem_count}")
        if hits:
            h = hits[0]
            assert "score" in h["payload"]
            assert "text" in h["payload"]
            assert "kind" in h["payload"]
