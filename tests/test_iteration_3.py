"""
Lumen Runtime — Iteration 3 feature tests.

Covers the 4 new features requested by the user:
  1. MongoDB TEXT INDEX on db.memory (recall via $text search, normalized score)
  2. Streaming extract & verify loops (TokenStreamed events for kind='research' and 'verification')
  3. Reasoning Tree endpoint (GET /api/sessions/{sid}/tree) + rich node kinds
  4. Rehydrate compares buffer vs Mongo count (tops up when Mongo has more)
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

# a session known to have a full pipeline completed (from previous iterations)
RICH_SID = "sess_2b8612b152"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def mdb():
    mc = MongoClient(MONGO_URL, serverSelectionTimeoutMS=3000)
    return mc[DB_NAME]


# ----- Test 1: Text index on memory -----------------------------------
class TestMemoryTextIndex:
    def test_text_index_exists(self, mdb):
        names = [idx["name"] for idx in mdb.memory.list_indexes()]
        assert "memory_fulltext" in names, f"missing text index; have {names}"

    def test_recall_uses_text_search_with_normalized_score(self, client, mdb):
        # ensure some memory exists
        if mdb.memory.count_documents({}) == 0:
            pytest.skip("no memory items to recall against")

        r = client.get(f"{API}/memory/recall", params={"q": "retrieval augmented generation neural", "top_k": 8})
        assert r.status_code == 200, r.text
        d = r.json()
        assert "hits" in d
        hits = d["hits"]
        # If hits exist, each must have a normalized score in [0, 1]
        for h in hits:
            assert "score" in h, f"hit missing score: {h}"
            assert isinstance(h["score"], (int, float))
            assert 0 <= h["score"] <= 1.0, f"score not normalized: {h['score']}"
        # Top score should be 1.0 (max-normalized) when there's at least one hit
        if hits:
            assert hits[0]["score"] == 1.0 or hits[0]["score"] >= max(h["score"] for h in hits)

    def test_recall_short_query_fallback(self, client):
        # single-char / very short queries should NOT error (falls through to token overlap)
        r = client.get(f"{API}/memory/recall", params={"q": "a"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert "hits" in d
        assert isinstance(d["hits"], list)  # may be empty; must not crash

    def test_recall_empty_query_returns_empty(self, client):
        # empty q (whitespace stripped) — recall() returns []
        r = client.get(f"{API}/memory/recall", params={"q": "   "})
        # server may accept and return empty, or reject
        assert r.status_code in (200, 400, 422)
        if r.status_code == 200:
            assert r.json()["hits"] == []


# ----- Test 2: Streaming extract + verify loops -----------------------
class TestStreamingLoops:
    def test_tokenstreamed_events_for_research_and_verify_loops(self, mdb):
        """Use the rich session (already ran full pipeline) to validate that TokenStreamed
        events were emitted with loop_id belonging to research and verification loops.
        """
        loops = {}
        for e in mdb.events.find({"session_id": RICH_SID, "type": "LoopStarted"}):
            loops[e["payload"].get("loop_id")] = e["payload"].get("kind")
        assert loops, f"no LoopStarted events for {RICH_SID}"

        # Group TokenStreamed by loop kind
        counts_by_kind = {}
        for e in mdb.events.find({"session_id": RICH_SID, "type": "TokenStreamed"}):
            lid = e["payload"].get("loop_id")
            k = loops.get(lid, "unknown")
            counts_by_kind[k] = counts_by_kind.get(k, 0) + 1
        assert counts_by_kind.get("research", 0) > 0, f"no TokenStreamed for research loop; got {counts_by_kind}"
        assert counts_by_kind.get("verification", 0) > 0, f"no TokenStreamed for verification loop; got {counts_by_kind}"
        assert counts_by_kind.get("planner", 0) > 0, f"planner should still stream; got {counts_by_kind}"


# ----- Test 3: Reasoning tree endpoint --------------------------------
class TestReasoningTree:
    def _count(self, node):
        return 1 + sum(self._count(c) for c in (node.get("children") or []))

    def _kinds(self, node, acc=None):
        acc = acc if acc is not None else set()
        acc.add(node.get("kind"))
        for c in (node.get("children") or []):
            self._kinds(c, acc)
        return acc

    def test_tree_endpoint_returns_structure(self, client):
        r = client.get(f"{API}/sessions/{RICH_SID}/tree")
        assert r.status_code == 200, r.text
        d = r.json()
        assert "tree" in d
        t = d["tree"]
        assert isinstance(t, dict)
        # root has label = goal and id='root'
        assert t.get("id") == "root"
        assert "label" in t
        # total node count > 10 after a full pipeline
        total = self._count(t)
        assert total > 10, f"expected >10 nodes, got {total}"

    def test_tree_contains_rich_kinds(self, client):
        r = client.get(f"{API}/sessions/{RICH_SID}/tree")
        assert r.status_code == 200
        t = r.json()["tree"]
        kinds = self._kinds(t)
        # Expect at least a subset of these enriched kinds after a full pipeline
        expected_any = {"search", "verify", "fact", "entity", "iteration", "gap", "synthesize", "extract"}
        overlap = kinds & expected_any
        assert len(overlap) >= 3, f"expected at least 3 rich kinds, got {kinds}"

    def test_tree_endpoint_404_for_unknown(self, client):
        r = client.get(f"{API}/sessions/does_not_exist_xxxxx/tree")
        assert r.status_code == 404


# ----- Test 4: Rehydrate compares buffer vs Mongo count ---------------
class TestRehydrateTopUp:
    def test_rehydrate_tops_up_when_mongo_has_more(self, client, mdb):
        # Create fresh session, run planner briefly, then insert synthetic events
        # with higher seq directly into Mongo — /events should include them.
        r = client.post(f"{API}/sessions", json={"goal": "TEST_ITER3_rehydrate topup vector databases"})
        assert r.status_code == 200
        sid = r.json()["id"]

        # Run planner so buffer + mongo have some events
        r2 = client.post(f"{API}/sessions/{sid}/plan")
        assert r2.status_code == 200

        # Poll until we have >=5 events
        deadline = time.time() + 90
        events = []
        while time.time() < deadline:
            er = client.get(f"{API}/sessions/{sid}/events")
            if er.status_code == 200:
                events = er.json().get("events", [])
                if len(events) >= 5:
                    break
            time.sleep(2)
        assert len(events) >= 5, f"only got {len(events)} events before timeout"

        api_count_before = len(events)
        mongo_count_before = mdb.events.count_documents({"session_id": sid})
        assert mongo_count_before >= api_count_before - 2  # near-equal (fire-and-forget writes)

        # Determine current max seq and inject two extra events beyond
        top_doc = mdb.events.find({"session_id": sid}).sort("seq", -1).limit(1)
        top_docs = list(top_doc)
        max_seq = top_docs[0]["seq"] if top_docs else 0

        injected_ids = []
        for i in range(1, 3):
            new_seq = max_seq + 1000 + i  # bump well beyond
            doc = {
                "id": f"ev_{sid}_TEST_ITER3_inject_{i}",
                "session_id": sid,
                "type": "TEST_ITER3_INJECTED",
                "ts": "2026-01-15T00:00:00+00:00",
                "seq": new_seq,
                "payload": {"note": f"synthetic-{i}"},
            }
            mdb.events.insert_one(doc)
            injected_ids.append(doc["id"])

        mongo_count_after = mdb.events.count_documents({"session_id": sid})
        assert mongo_count_after == mongo_count_before + 2

        # Fetch /events again — buffer should top up
        try:
            er2 = client.get(f"{API}/sessions/{sid}/events")
            assert er2.status_code == 200
            events2 = er2.json().get("events", [])
            api_count_after = len(events2)

            # Should include the injected ones (or at least reflect higher count)
            types = [e["type"] for e in events2]
            injected_present = sum(1 for t in types if t == "TEST_ITER3_INJECTED")
            assert api_count_after >= mongo_count_after - 2, (
                f"buffer did not top up: api_after={api_count_after}, mongo_after={mongo_count_after}"
            )
            assert injected_present == 2, (
                f"injected events not present via /events: injected={injected_present}, "
                f"total api events={api_count_after}, types_sample={types[-6:]}"
            )
        finally:
            # cleanup injected docs
            mdb.events.delete_many({"id": {"$in": injected_ids}})
