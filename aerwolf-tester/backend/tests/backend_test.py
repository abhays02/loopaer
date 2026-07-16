"""AERwolf backend regression tests (iteration 2).
Covers: auth, search, wisdom, algorithms/suggest, tech/finder, hyperframes,
compare, settings BYO OpenRouter key, and skills CRUD + export.
"""
import os
import sys
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fallback: read directly from frontend .env for pytest runs
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip()
                    break
    except Exception:
        pass
assert BASE_URL, "REACT_APP_BACKEND_URL is required"
BASE_URL = BASE_URL.rstrip("/")

SESSION_TOKEN = "test_session_aerwolf_001"
USER_ID = "test-user-aerwolf-001"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def unauth():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Auth ----------
class TestAuth:
    def test_me_without_token(self, unauth):
        r = unauth.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_bearer(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user_id"] == USER_ID
        assert data["email"] == "researcher@aerwolf.dev"

    def test_me_with_cookie(self):
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            cookies={"session_token": SESSION_TOKEN},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["user_id"] == USER_ID


# ---------- Search ----------
class TestSearch:
    def test_search_ocr(self, api):
        r = api.get(f"{BASE_URL}/api/search", params={"topic": "OCR"}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["topic"] == "OCR"
        assert isinstance(data["papers"], list)
        assert isinstance(data["awesome"], list)
        # Both should be non-empty in normal preview env
        assert len(data["papers"]) > 0, "papers array is empty"
        assert len(data["awesome"]) > 0, "awesome (github) array is empty"

    def test_search_requires_auth(self, unauth):
        r = unauth.get(f"{BASE_URL}/api/search", params={"topic": "OCR"})
        assert r.status_code == 401


# ---------- Wisdom ----------
class TestWisdom:
    def test_wisdom_ocr(self, api):
        r = api.post(
            f"{BASE_URL}/api/wisdom",
            json={"topic": "OCR"},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("summary", "strengths", "flaws", "not_together", "must_reads"):
            assert k in data, f"missing key: {k}"
        assert isinstance(data["summary"], str) and len(data["summary"]) > 0


# ---------- Algorithms suggest ----------
class TestAlgorithms:
    def test_suggest_detection(self, api):
        r = api.post(
            f"{BASE_URL}/api/algorithms/suggest",
            json={"node_label": "Detection", "node_type": "detection", "topic": "OCR"},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        algs = data.get("algorithms", [])
        assert isinstance(algs, list) and 4 <= len(algs) <= 8, f"got {len(algs)} algorithms"
        first = algs[0]
        for k in ("name", "tech_stack", "popularity", "official_rating", "vram_gb", "latency_ms", "notes"):
            assert k in first, f"missing key {k} in algorithm item"


# ---------- Tech finder ----------
class TestTechFinder:
    def test_tech_dbnet(self, api):
        r = api.post(
            f"{BASE_URL}/api/tech/finder",
            json={"algorithm": "DBNet", "topic": "OCR"},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        techs = r.json().get("tech", [])
        assert isinstance(techs, list) and 4 <= len(techs) <= 8, f"got {len(techs)}"
        first = techs[0]
        for k in ("name", "language", "stars", "license", "install", "pros", "cons"):
            assert k in first, f"missing key {k}"


# ---------- Hyperframes ----------
class TestHyperframes:
    def test_seeded_clahe(self, api):
        r = api.post(f"{BASE_URL}/api/hyperframes", json={"algorithm": "CLAHE"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["source"] == "seeded"
        assert len(data["frames"]) == 5
        for f in data["frames"]:
            assert "caption" in f and "svg" in f
            assert "viewBox" in f["svg"]

    def test_seeded_fuzzy_dbnet(self, api):
        r = api.post(
            f"{BASE_URL}/api/hyperframes",
            json={"algorithm": "DBNet (Real-time Scene Text Detection with Differentiable Binarization)"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["source"] == "seeded", f"expected seeded, got {data['source']}"

    def test_generated_and_cache(self, api):
        # Use a unique random algo name to force generation on first call, cache on second
        # Use non-seeded algo name; avoid substrings of any HYPERFRAMES key/alias
        unique_algo = f"Zorblax{uuid.uuid4().hex[:6]}"
        r1 = api.post(f"{BASE_URL}/api/hyperframes", json={"algorithm": unique_algo}, timeout=120)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["source"] in ("generated", "cache"), f"first got {d1['source']}"
        assert len(d1["frames"]) >= 1, "no frames from LLM"

        r2 = api.post(f"{BASE_URL}/api/hyperframes", json={"algorithm": unique_algo}, timeout=30)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["source"] == "cache", f"second should be cache, got {d2['source']}"

    def test_seeded_list(self, api):
        r = api.get(f"{BASE_URL}/api/hyperframes/seeded", timeout=15)
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) == 20, f"expected 20 seeded, got {len(items)}"
        assert all("name" in i and "family" in i for i in items)


# ---------- Compare ----------
class TestCompare:
    def test_compare_dbnet_crnn(self, api):
        r = api.post(
            f"{BASE_URL}/api/compare",
            json={"algorithms": ["DBNet", "CRNN"], "topic": "OCR"},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data.get("axes"), list) and len(data["axes"]) >= 3
        items = data.get("items", [])
        assert isinstance(items, list) and len(items) == 2
        for it in items:
            assert "name" in it and "scores" in it
            assert "best_at" in it or "worst_at" in it
        assert isinstance(data.get("verdict"), str) and len(data["verdict"]) > 0

    def test_compare_requires_two(self, api):
        r = api.post(
            f"{BASE_URL}/api/compare",
            json={"algorithms": ["DBNet"], "topic": "OCR"},
            timeout=30,
        )
        assert r.status_code == 400


# ---------- Settings (BYO OpenRouter) ----------
class TestSettings:
    def test_get_settings_shape(self, api):
        r = api.get(f"{BASE_URL}/api/settings", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("openrouter_key_set", "openrouter_demo_available", "default_provider", "default_model"):
            assert k in d, f"missing key {k}"
        assert isinstance(d["openrouter_key_set"], bool)

    def test_set_and_clear_openrouter_key(self, api):
        # SET
        r = api.put(
            f"{BASE_URL}/api/settings",
            json={"openrouter_key": "sk-or-v1-testkey"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["openrouter_key_set"] is True

        # GET verify
        g = api.get(f"{BASE_URL}/api/settings", timeout=15).json()
        assert g["openrouter_key_set"] is True

        # CLEAR
        r2 = api.put(f"{BASE_URL}/api/settings", json={"openrouter_key": ""}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["openrouter_key_set"] is False

    def test_openrouter_no_key_returns_400(self, api):
        # Ensure key is cleared
        api.put(f"{BASE_URL}/api/settings", json={"openrouter_key": ""}, timeout=15)
        r = api.post(
            f"{BASE_URL}/api/wisdom",
            json={"topic": "OCR", "provider": "openrouter", "model": "meta-llama/llama-3.3-70b-instruct"},
            timeout=30,
        )
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
        assert "openrouter" in r.text.lower()


# ---------- Skills CRUD + Export ----------
class TestSkills:
    def test_full_crud_and_export(self, api):
        payload = {
            "name": "TEST_OCR_Pipeline",
            "topic": "OCR",
            "description": "A test pipeline",
            "nodes": [
                {"id": "n1", "label": "Detection", "type": "detection", "algorithm": "DBNet", "tech": "PaddleOCR", "position": {"x": 0, "y": 0}}
            ],
            "edges": [],
            "tech_stack": [{"name": "PaddleOCR"}],
            "version": "1.0.0",
        }
        # CREATE
        r = api.post(f"{BASE_URL}/api/skills", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        skill_id = created["id"]
        assert created["name"] == "TEST_OCR_Pipeline"

        # LIST
        r = api.get(f"{BASE_URL}/api/skills", timeout=15)
        assert r.status_code == 200
        assert any(s["id"] == skill_id for s in r.json())

        # GET
        r = api.get(f"{BASE_URL}/api/skills/{skill_id}", timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == skill_id

        # UPDATE
        payload["description"] = "Updated"
        r = api.put(f"{BASE_URL}/api/skills/{skill_id}", json=payload, timeout=15)
        assert r.status_code == 200
        assert r.json()["description"] == "Updated"

        # EXPORT
        r = api.post(f"{BASE_URL}/api/skills/export", json={"skill_id": skill_id}, timeout=120)
        assert r.status_code == 200, r.text
        md = r.json()["skill_md"]
        assert md.startswith("---"), "missing YAML front-matter"
        assert "\n# " in md or md.strip().startswith("# "), "missing markdown heading '# '"

        # DELETE
        r = api.delete(f"{BASE_URL}/api/skills/{skill_id}", timeout=15)
        assert r.status_code == 200
        # GET should now 404
        r = api.get(f"{BASE_URL}/api/skills/{skill_id}", timeout=15)
        assert r.status_code == 404


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v", "--tb=short"]))
