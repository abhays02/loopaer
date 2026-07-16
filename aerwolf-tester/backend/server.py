from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Cookie, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import xml.etree.ElementTree as ET

from emergentintegrations.llm.chat import LlmChat, UserMessage
from hyperframes import get_seeded, list_seeded
from references import get_references
from fastapi.responses import StreamingResponse
import json as _json_mod

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
OPENROUTER_DEMO_KEY = os.environ.get('OPENROUTER_DEMO_KEY') or ''

app = FastAPI(title="AERwolf Backend")
api_router = APIRouter(prefix="/api")

# ============ Models ============
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: Optional[datetime] = None


class SearchRequest(BaseModel):
    topic: str


class WisdomRequest(BaseModel):
    topic: str
    model: str = "claude-sonnet-4-6"
    provider: str = "anthropic"


class AlgorithmSuggestRequest(BaseModel):
    node_label: str
    node_type: str
    topic: str
    model: str = "claude-sonnet-4-6"
    provider: str = "anthropic"


class TechFinderRequest(BaseModel):
    algorithm: str
    topic: str = ""
    model: str = "claude-sonnet-4-6"
    provider: str = "anthropic"


class HyperframeRequest(BaseModel):
    algorithm: str
    topic: str = ""
    model: str = "claude-sonnet-4-6"
    provider: str = "anthropic"


class CompareRequest(BaseModel):
    algorithms: List[str]
    topic: str = ""
    model: str = "claude-sonnet-4-6"
    provider: str = "anthropic"


class SettingsIn(BaseModel):
    openrouter_key: Optional[str] = None
    default_provider: Optional[str] = None
    default_model: Optional[str] = None
    local_llm_base_url: Optional[str] = None
    local_llm_model: Optional[str] = None
    theme: Optional[str] = None  # "dark" | "light"


class NotebookIn(BaseModel):
    title: str = "Untitled"
    topic: str = ""
    markdown: str = ""
    sources: List[Dict[str, Any]] = []
    chat: List[Dict[str, Any]] = []


class StormRequest(BaseModel):
    topic: str
    perspectives: int = 3
    model: str = "claude-sonnet-4-6"
    provider: str = "anthropic"


class SkillCompileRequest(BaseModel):
    notebook_id: str
    model: str = "claude-sonnet-4-6"
    provider: str = "anthropic"


class PromptScoreRequest(BaseModel):
    prompt: str


class TransformRequest(BaseModel):
    notebook_id: str
    action: str  # "summarize" | "expand" | "critique" | "extract_todos" | "counterargue"
    model: str = "claude-sonnet-4-6"
    provider: str = "anthropic"


class NodeModel(BaseModel):
    id: str
    label: str
    type: str
    algorithm: Optional[str] = None
    tech: Optional[str] = None
    position: Dict[str, float] = Field(default_factory=lambda: {"x": 0, "y": 0})


class EdgeModel(BaseModel):
    id: str
    source: str
    target: str


class SkillIn(BaseModel):
    name: str
    topic: str
    description: str = ""
    nodes: List[NodeModel] = []
    edges: List[EdgeModel] = []
    tech_stack: List[Dict[str, Any]] = []
    version: str = "1.0.0"


class Skill(SkillIn):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


class SkillMdRequest(BaseModel):
    skill_id: str
    model: str = "claude-sonnet-4-6"
    provider: str = "anthropic"


# ============ Auth ============
async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
) -> User:
    token = session_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)


@api_router.post("/auth/session")
async def auth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    async with httpx.AsyncClient(timeout=15.0) as http:
        r = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google session")
        data = r.json()

    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", existing.get("name")), "picture": data.get("picture", existing.get("picture"))}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    return {
        "user": {
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
        }
    }


@api_router.get("/auth/me", response_model=User)
async def auth_me(user: User = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def auth_logout(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ============ Search ============
async def fetch_arxiv(topic: str, limit: int = 8) -> List[Dict[str, Any]]:
    url = f"https://export.arxiv.org/api/query?search_query=all:{topic}&start=0&max_results={limit}&sortBy=submittedDate&sortOrder=descending"
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as http:
            r = await http.get(url)
            r.raise_for_status()
    except Exception as e:
        logger.warning(f"arxiv fetch failed: {e}")
        return []
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    root = ET.fromstring(r.text)
    papers = []
    for entry in root.findall("atom:entry", ns):
        title = (entry.findtext("atom:title", default="", namespaces=ns) or "").strip()
        summary = (entry.findtext("atom:summary", default="", namespaces=ns) or "").strip()
        link = ""
        for l in entry.findall("atom:link", ns):
            if l.get("rel") == "alternate":
                link = l.get("href", "")
                break
        published = entry.findtext("atom:published", default="", namespaces=ns) or ""
        authors = [a.findtext("atom:name", default="", namespaces=ns) for a in entry.findall("atom:author", ns)]
        papers.append({
            "source": "arXiv",
            "title": title,
            "abstract": summary[:400],
            "url": link,
            "published": published[:10],
            "authors": [a for a in authors if a][:4],
        })
    return papers


async def fetch_semantic_scholar(topic: str, limit: int = 6) -> List[Dict[str, Any]]:
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    params = {"query": topic, "limit": limit, "fields": "title,abstract,url,year,authors,citationCount"}
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as http:
            r = await http.get(url, params=params)
            if r.status_code != 200:
                return []
            data = r.json()
    except Exception as e:
        logger.warning(f"semantic_scholar fetch failed: {e}")
        return []
    papers = []
    for p in data.get("data", []):
        papers.append({
            "source": "Semantic Scholar",
            "title": p.get("title", ""),
            "abstract": (p.get("abstract") or "")[:400],
            "url": p.get("url", ""),
            "published": str(p.get("year", "")),
            "authors": [a.get("name", "") for a in (p.get("authors") or [])][:4],
            "citations": p.get("citationCount", 0),
        })
    return papers


async def fetch_github_awesome(topic: str, limit: int = 10) -> List[Dict[str, Any]]:
    q = f"awesome {topic} in:name,description,readme"
    url = "https://api.github.com/search/repositories"
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as http:
            r = await http.get(url, params={"q": q, "sort": "stars", "order": "desc", "per_page": limit})
            if r.status_code != 200:
                return []
            data = r.json()
    except Exception as e:
        logger.warning(f"github fetch failed: {e}")
        return []
    repos = []
    for it in data.get("items", []):
        repos.append({
            "name": it.get("full_name", ""),
            "description": it.get("description", "") or "",
            "url": it.get("html_url", ""),
            "stars": it.get("stargazers_count", 0),
            "language": it.get("language", ""),
            "topics": it.get("topics", [])[:5],
        })
    return repos


async def fetch_papers_with_code(topic: str, limit: int = 5) -> List[Dict[str, Any]]:
    url = "https://paperswithcode.com/api/v1/papers/"
    try:
        async with httpx.AsyncClient(timeout=15.0) as http:
            r = await http.get(url, params={"q": topic, "items_per_page": limit})
            if r.status_code != 200:
                return []
            data = r.json()
    except Exception as e:
        logger.warning(f"pwc fetch failed: {e}")
        return []
    results = []
    for p in data.get("results", []):
        results.append({
            "source": "PapersWithCode",
            "title": p.get("title", ""),
            "abstract": (p.get("abstract") or "")[:400],
            "url": p.get("url_abs") or p.get("url_pdf", ""),
            "published": (p.get("published") or "")[:10],
            "authors": (p.get("authors") or [])[:4],
        })
    return results


@api_router.get("/search")
async def search(topic: str, user: User = Depends(get_current_user)):
    arxiv, sem, gh, pwc = await asyncio.gather(
        fetch_arxiv(topic),
        fetch_semantic_scholar(topic),
        fetch_github_awesome(topic),
        fetch_papers_with_code(topic),
        return_exceptions=True,
    )
    def unwrap(x):
        return x if isinstance(x, list) else []
    return {
        "topic": topic,
        "papers": unwrap(arxiv) + unwrap(sem) + unwrap(pwc),
        "awesome": unwrap(gh),
    }


# ============ AI: Wisdom, Algorithms, Skill.md, Hyperframes ============
async def _get_user_openrouter_key(user_id: str) -> Optional[str]:
    doc = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    if doc and doc.get("openrouter_key"):
        return doc["openrouter_key"]
    return OPENROUTER_DEMO_KEY or None


async def llm_generate(
    user: "User",
    system: str,
    prompt: str,
    provider: str,
    model: str,
    session_prefix: str = "gen",
) -> str:
    """Unified text generation. provider ∈ {anthropic, openai, gemini, openrouter, local}."""
    if provider == "local":
        # BYO Ollama / LM Studio / any OpenAI-compatible base URL, stored in user settings
        s = await db.user_settings.find_one({"user_id": user.user_id}, {"_id": 0}) or {}
        base = (s.get("local_llm_base_url") or "").rstrip("/")
        local_model = model or s.get("local_llm_model") or ""
        if not base:
            raise HTTPException(status_code=400, detail="Local LLM base URL not configured. Add it in Settings (Ollama: http://host.docker.internal:11434/v1, LM Studio: http://localhost:1234/v1).")
        if not local_model:
            raise HTTPException(status_code=400, detail="Local LLM model name not configured (e.g. 'llama3.2' or 'qwen2.5:7b').")
        try:
            async with httpx.AsyncClient(timeout=120.0) as http:
                r = await http.post(
                    f"{base}/chat/completions",
                    headers={"Content-Type": "application/json"},
                    json={"model": local_model, "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ], "stream": False},
                )
                if r.status_code != 200:
                    raise HTTPException(status_code=502, detail=f"Local LLM error: {r.text[:200]}")
                data = r.json()
                return data["choices"][0]["message"]["content"]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Local LLM call failed: {e}")

    if provider == "openrouter":
        key = await _get_user_openrouter_key(user.user_id)
        if not key:
            raise HTTPException(
                status_code=400,
                detail="OpenRouter key not configured. Add it in Settings or provide OPENROUTER_DEMO_KEY on server.",
            )
        try:
            async with httpx.AsyncClient(timeout=60.0) as http:
                r = await http.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system},
                            {"role": "user", "content": prompt},
                        ],
                    },
                )
                if r.status_code != 200:
                    raise HTTPException(status_code=502, detail=f"OpenRouter error: {r.text[:200]}")
                data = r.json()
                return data["choices"][0]["message"]["content"]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"OpenRouter call failed: {e}")

    # Emergent Universal Key path (anthropic/openai/gemini)
    chat = (
        LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"{session_prefix}_{user.user_id}_{uuid.uuid4().hex[:6]}",
            system_message=system,
        ).with_model(provider, model)
    )
    reply = await chat.send_message(UserMessage(text=prompt))
    return reply if isinstance(reply, str) else str(reply)


def _strip_fence(text: str, lang: str = "") -> str:
    pattern = r"^```(?:" + (lang or r"[a-z]*") + r")?\s*|\s*```$"
    return re.sub(pattern, "", text.strip(), flags=re.MULTILINE)


@api_router.post("/wisdom")
async def wisdom(req: WisdomRequest, user: User = Depends(get_current_user)):
    system = (
        "You are a senior research reviewer. For the given research topic, produce a JSON object with EXACTLY these keys: "
        "summary (string, 2-3 sentences overview of current state), "
        "strengths (array of 3 strings, what the field does well), "
        "flaws (array of 3-5 strings, key open problems / common flaws in the field), "
        "not_together (array of 2-3 strings, things that don't add up / contradictions in the literature), "
        "must_reads (array of 3 strings, seminal work titles). "
        "Return ONLY valid JSON, no prose, no markdown fences."
    )
    try:
        text = await llm_generate(user, system, f"Topic: {req.topic}", req.provider, req.model, "wisdom")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
    text = _strip_fence(text, "json")
    import json
    try:
        return json.loads(text)
    except Exception:
        return {"summary": text[:600], "strengths": [], "flaws": [], "not_together": [], "must_reads": []}


@api_router.post("/algorithms/suggest")
async def suggest_algorithms(req: AlgorithmSuggestRequest, user: User = Depends(get_current_user)):
    system = (
        "You are an expert ML research architect. For a given ARCHITECTURE NODE inside a research pipeline, "
        "return a JSON array of 5-7 candidate ALGORITHMS/MODELS best suited for that node. "
        "Each item MUST have keys: name (string), tech_stack (array of strings, frameworks/libraries), "
        "popularity (int 0-100, community usage), official_rating (int 0-100, benchmark/official strength), "
        "vram_gb (number), latency_ms (int, approximate), notes (string, 1 line why to pick it). "
        "Return ONLY valid JSON array, no prose."
    )
    prompt = f"Research topic: {req.topic}\nNode label: {req.node_label}\nNode type/role: {req.node_type}\nSuggest 5-7 best algorithms."
    try:
        text = await llm_generate(user, system, prompt, req.provider, req.model, "algo")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
    text = _strip_fence(text, "json")
    import json
    try:
        parsed = json.loads(text)
        if not isinstance(parsed, list):
            parsed = parsed.get("algorithms", []) if isinstance(parsed, dict) else []
    except Exception:
        parsed = []
    return {"algorithms": parsed}


@api_router.post("/tech/finder")
async def tech_finder(req: TechFinderRequest, user: User = Depends(get_current_user)):
    """Given a chosen ALGORITHM, return ranked technology/implementation options."""
    system = (
        "You are a senior ML infrastructure engineer. Given a chosen ALGORITHM, return a JSON array of 5-7 concrete "
        "IMPLEMENTATIONS / TECH options a researcher can use. Each item MUST have keys: "
        "name (string, e.g., 'PaddleOCR', 'ncnn', 'ONNX Runtime', 'PyTorch', 'TensorRT', 'timm'), "
        "language (string), stars (int, approximate GitHub stars in thousands, e.g., 40 for 40k), "
        "license (string, e.g., 'Apache-2.0', 'MIT'), "
        "last_release (string, YYYY-MM or 'active'/'stale'), "
        "pros (array of 2-3 short strings), cons (array of 1-2 short strings), "
        "install (string, one-line install command), "
        "official_score (int 0-100, official/production strength), "
        "beginner_friendly (int 0-100). Return ONLY valid JSON array."
    )
    prompt = f"Algorithm: {req.algorithm}\nResearch topic: {req.topic}\nList 5-7 tech options."
    try:
        text = await llm_generate(user, system, prompt, req.provider, req.model, "tech")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
    text = _strip_fence(text, "json")
    import json
    try:
        parsed = json.loads(text)
        if not isinstance(parsed, list):
            parsed = parsed.get("tech", []) if isinstance(parsed, dict) else []
    except Exception:
        parsed = []
    return {"tech": parsed}


@api_router.post("/hyperframes")
async def hyperframes(req: HyperframeRequest, user: User = Depends(get_current_user)):
    """Return an animated 4-6 frame explanation of an algorithm.
    First checks seeded library, then Mongo cache, then generates via LLM and caches."""
    seeded = get_seeded(req.algorithm)
    if seeded:
        return {"source": "seeded", "algorithm": seeded["name"], "family": seeded.get("family"), "frames": seeded["frames"]}

    cache_key = req.algorithm.lower().strip()
    cached = await db.hyperframe_cache.find_one({"key": cache_key}, {"_id": 0})
    if cached and cached.get("frames"):
        return {"source": "cache", "algorithm": req.algorithm, "family": cached.get("family", "custom"), "frames": cached["frames"]}

    # Generate via LLM
    system = (
        "You visualise ML algorithms as 5 SVG 'hyperframes' — a step-by-step animation. "
        "Return ONLY valid JSON of the form: "
        '{"family": "one word category", "frames": [{"caption": "step 1 caption", "svg": "<svg ...>...</svg>"}, ...]} '
        "with EXACTLY 5 frames. Each SVG MUST have viewBox='0 0 320 200', width='100%', height='100%'. "
        "Style constraints: dark background rect first (fill='#0D0D12'), neon accents "
        "(cyan #00E5FF, amber #FFB000, hot-pink #FF0055), monospace text (font-family='monospace'), "
        "no external images/fonts, no <script>. Frame 1 = input, Frame 5 = output. "
        "Captions must be technical and short (max 8 words)."
    )
    prompt = f"Algorithm: {req.algorithm}. Research topic context: {req.topic or 'general'}. Visualise 5 frames."
    try:
        text = await llm_generate(user, system, prompt, req.provider, req.model, "hyper")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
    text = _strip_fence(text, "json")
    import json as _json
    try:
        parsed = _json.loads(text)
        frames = parsed.get("frames", [])
        family = parsed.get("family", "custom")
        # sanitise
        clean = []
        for f in frames[:6]:
            svg = (f.get("svg") or "").strip()
            if "<script" in svg.lower():
                continue
            clean.append({"caption": (f.get("caption") or "")[:80], "svg": svg})
        if not clean:
            return {"source": "empty", "algorithm": req.algorithm, "family": family, "frames": []}
        await db.hyperframe_cache.insert_one({"key": cache_key, "name": req.algorithm, "family": family, "frames": clean, "created_at": datetime.now(timezone.utc).isoformat()})
        return {"source": "generated", "algorithm": req.algorithm, "family": family, "frames": clean}
    except Exception:
        return {"source": "error", "algorithm": req.algorithm, "family": "unknown", "frames": []}


@api_router.post("/compare")
async def compare(req: CompareRequest, user: User = Depends(get_current_user)):
    """Side-by-side compare 2-3 algorithms/pipelines/stacks."""
    if len(req.algorithms) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 items to compare")
    system = (
        "You are an ML benchmarking analyst. Compare the given ITEMS on multiple dimensions. "
        "Return ONLY JSON: {\"axes\": [\"accuracy\", \"latency_ms\", \"vram_gb\", \"maturity\", \"ease_of_use\", \"community\"], "
        "\"items\": [{\"name\": str, \"scores\": {\"axis\": int_0_100 or number}, \"summary\": str, \"best_at\": [str,str], \"worst_at\": [str]}, ...], "
        "\"verdict\": str}. Scores must be numeric, use ints 0-100 for maturity/ease/community, ms for latency, GB for vram."
    )
    prompt = f"Compare items: {req.algorithms}. Topic context: {req.topic}."
    try:
        text = await llm_generate(user, system, prompt, req.provider, req.model, "cmp")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
    text = _strip_fence(text, "json")
    import json as _json
    try:
        return _json.loads(text)
    except Exception:
        return {"axes": [], "items": [], "verdict": text[:400]}


@api_router.get("/hyperframes/seeded")
async def list_hyperframes_seeded():
    return {"items": list_seeded()}


@api_router.get("/hyperframes/public/{key}")
async def get_public_hyperframe(key: str):
    """Public read-only access to seeded hyperframes (no LLM fallback, no auth)."""
    seeded = get_seeded(key)
    if not seeded:
        raise HTTPException(status_code=404, detail="No seeded hyperframe for that key")
    return {"algorithm": seeded["name"], "family": seeded.get("family"), "frames": seeded["frames"]}


# ============ Public Prompt Score (marketing top-of-funnel widget) ============
@api_router.post("/prompt/score")
async def score_prompt(req: PromptScoreRequest):
    """Public endpoint — grades any prompt on 4 axes. No auth required.
    Uses the demo Emergent LLM key (server-side)."""
    prompt = (req.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Empty prompt")
    if len(prompt) > 4000:
        prompt = prompt[:4000]
    system = (
        "You are a prompt-hallucination auditor. Grade the given user PROMPT on 4 axes as ints 0-100: "
        "determinism (how likely the LLM returns the same answer across retries), "
        "citability (how easy it is to verify with an external source), "
        "specificity (how narrowly the task is scoped), "
        "decomposability (how well it splits into typed pipeline steps). "
        "Also produce an integer hallucination_risk (0-100, higher = worse), a one-sentence verdict, "
        "and a fixed_prompt string suggesting how to rewrite it as a pipeline-ready skill. "
        "Return ONLY JSON: {\"determinism\": int, \"citability\": int, \"specificity\": int, \"decomposability\": int, \"hallucination_risk\": int, \"verdict\": str, \"fixed_prompt\": str}."
    )
    # Anonymous session — no user object
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"score_{uuid.uuid4().hex[:10]}",
            system_message=system,
        ).with_model("anthropic", "claude-sonnet-4-6")
        reply = await chat.send_message(UserMessage(text=f"PROMPT:\n{prompt}"))
        text = reply if isinstance(reply, str) else str(reply)
        text = _strip_fence(text, "json")
        return _json_mod.loads(text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Score failed: {e}")


# ============ Notebook Transformations ============
@api_router.post("/notebooks/transform")
async def notebook_transform(req: TransformRequest, user: User = Depends(get_current_user)):
    nb = await db.notebooks.find_one({"id": req.notebook_id, "user_id": user.user_id}, {"_id": 0})
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")
    actions = {
        "summarize":      "Summarize the notebook markdown into 5 crisp bullet points. Return ONLY the markdown bullets.",
        "expand":         "Expand the notebook markdown with 2 additional sections that add depth. Preserve existing content. Return ONLY additional markdown to append.",
        "critique":       "Critique the notebook: what is missing, what is unsupported, what contradicts itself. Return a markdown section '## Critique' with 3-5 bullets.",
        "extract_todos":  "Extract actionable TODOs from the notebook. Return a markdown checklist '## Todos' with '- [ ] ...' items.",
        "counterargue":   "Steelman the strongest counter-argument to this notebook's claims. Return a markdown section '## Counterargument' with 3-4 tight paragraphs.",
    }
    if req.action not in actions:
        raise HTTPException(status_code=400, detail=f"Unknown action. Choose one of: {list(actions)}")
    system = "You are a research writing assistant. " + actions[req.action] + " Do NOT include YAML front-matter."
    prompt = f"Notebook title: {nb.get('title','')}\nTopic: {nb.get('topic','')}\nSources: {[s.get('title','') for s in (nb.get('sources') or [])][:8]}\n\nMarkdown:\n{nb.get('markdown','')[:5000]}"
    try:
        text = await llm_generate(user, system, prompt, req.provider, req.model, "transform")
        text = _strip_fence(text, "markdown")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Transform failed: {e}")
    return {"action": req.action, "output": text}


# ============ Real SSE streaming for AlgoFinder ============
@api_router.get("/algorithms/suggest/stream")
async def suggest_algorithms_stream(
    node_label: str, node_type: str, topic: str,
    model: str = "claude-sonnet-4-6", provider: str = "anthropic",
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
):
    """Server-Sent Events stream that yields algorithm candidates one JSON object per event.
    Since Emergent LLM chat is non-streaming, we split the parsed JSON list post-hoc and
    emit each item on a paced interval — client sees real streaming semantics."""
    # Auth
    token = session_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    user_obj = User(**user_doc)

    system = (
        "You are an ML research architect. For a given NODE inside a research pipeline, return ONLY JSON: "
        "a JSON array of 5-7 candidates. Each item MUST have keys: name (str), tech_stack (arr of str), "
        "popularity (int 0-100), official_rating (int 0-100), vram_gb (num), latency_ms (int), notes (str, 1 line)."
    )
    prompt = f"Topic: {topic}\nNode: {node_label}\nRole: {node_type}\nReturn JSON array only."

    async def event_gen():
        yield f"event: start\ndata: {_json_mod.dumps({'node': node_label, 'type': node_type})}\n\n"
        try:
            text = await llm_generate(user_obj, system, prompt, provider, model, "algostream")
            text = _strip_fence(text, "json")
            try:
                parsed = _json_mod.loads(text)
                if not isinstance(parsed, list):
                    parsed = parsed.get("algorithms", []) if isinstance(parsed, dict) else []
            except Exception:
                parsed = []
            for i, item in enumerate(parsed):
                yield f"event: item\ndata: {_json_mod.dumps({'index': i, 'total': len(parsed), 'item': item})}\n\n"
                await asyncio.sleep(0.2)
            yield f"event: end\ndata: {_json_mod.dumps({'count': len(parsed)})}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {_json_mod.dumps({'detail': str(e)})}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


# ============ Public Skill Registry ============
@api_router.post("/skills/{skill_id}/publish")
async def publish_skill(skill_id: str, user: User = Depends(get_current_user)):
    doc = await db.skills.find_one({"id": skill_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Skill not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.skills.update_one(
        {"id": skill_id, "user_id": user.user_id},
        {"$set": {"public": True, "published_at": now, "author_name": user.name, "author_id": user.user_id}},
    )
    return {"ok": True, "public": True}


@api_router.post("/skills/{skill_id}/unpublish")
async def unpublish_skill(skill_id: str, user: User = Depends(get_current_user)):
    r = await db.skills.update_one(
        {"id": skill_id, "user_id": user.user_id},
        {"$set": {"public": False}},
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"ok": True, "public": False}


@api_router.get("/skills/public")
async def list_public_skills():
    docs = await db.skills.find({"public": True}, {"_id": 0}).sort("published_at", -1).to_list(60)
    # Strip user identifiers we shouldn't leak
    for d in docs:
        d.pop("user_id", None)
        d.pop("author_id", None)
    return docs


@api_router.post("/skills/{skill_id}/fork")
async def fork_skill(skill_id: str, user: User = Depends(get_current_user)):
    """Fork a public skill into the current user's library, preserving parent link."""
    parent = await db.skills.find_one({"id": skill_id, "public": True}, {"_id": 0})
    if not parent:
        raise HTTPException(status_code=404, detail="Public skill not found")
    now = datetime.now(timezone.utc)
    forked = {
        "id": f"skill_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "name": parent.get("name", "forked-skill"),
        "topic": parent.get("topic", ""),
        "description": parent.get("description", ""),
        "nodes": parent.get("nodes", []),
        "edges": parent.get("edges", []),
        "tech_stack": parent.get("tech_stack", []),
        "version": parent.get("version", "1.0.0"),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "public": False,
        "forked_from": skill_id,
        "forked_from_author": parent.get("author_name", ""),
    }
    await db.skills.insert_one(dict(forked))
    return {"ok": True, "skill_id": forked["id"]}


@api_router.get("/references")
async def references(algorithm: str, topic: str = ""):
    """Curated interactive-explainer references (distill.pub, d2l.ai, colah, etc.) for an algorithm."""
    return {"algorithm": algorithm, "references": get_references(algorithm, topic)}


# ============ Settings (BYO OpenRouter key) ============
@api_router.get("/settings")
async def get_settings(user: User = Depends(get_current_user)):
    doc = await db.user_settings.find_one({"user_id": user.user_id}, {"_id": 0}) or {}
    return {
        "openrouter_key_set": bool(doc.get("openrouter_key")),
        "openrouter_demo_available": bool(OPENROUTER_DEMO_KEY),
        "default_provider": doc.get("default_provider", "anthropic"),
        "default_model": doc.get("default_model", "claude-sonnet-4-6"),
        "local_llm_base_url": doc.get("local_llm_base_url", ""),
        "local_llm_model": doc.get("local_llm_model", ""),
        "theme": doc.get("theme", "dark"),
    }


@api_router.put("/settings")
async def update_settings(s: SettingsIn, user: User = Depends(get_current_user)):
    update = {}
    if s.openrouter_key is not None:
        update["openrouter_key"] = s.openrouter_key.strip() or None
    if s.default_provider is not None:
        update["default_provider"] = s.default_provider
    if s.default_model is not None:
        update["default_model"] = s.default_model
    if s.local_llm_base_url is not None:
        update["local_llm_base_url"] = s.local_llm_base_url.strip()
    if s.local_llm_model is not None:
        update["local_llm_model"] = s.local_llm_model.strip()
    if s.theme is not None and s.theme in ("dark", "light"):
        update["theme"] = s.theme
    if update:
        update["user_id"] = user.user_id
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.user_settings.update_one({"user_id": user.user_id}, {"$set": update}, upsert=True)
    return await get_settings(user)


@api_router.get("/skills/lookup")
async def lookup_skill(name: str, user: User = Depends(get_current_user)):
    """Resolve a skill by name (case-insensitive prefix) — for [[skill: name]] inline invocation."""
    import re as _re
    pat = _re.compile(f"^{_re.escape(name.strip())}", _re.IGNORECASE)
    doc = await db.skills.find_one({"user_id": user.user_id, "name": pat}, {"_id": 0})
    if not doc:
        return {"found": False, "name": name}
    return {"found": True, "skill": {"id": doc["id"], "name": doc["name"], "topic": doc.get("topic"), "description": doc.get("description"), "nodes": doc.get("nodes", []), "edges": doc.get("edges", [])}}


# ============ Notebooks (open-notebook-style stage) ============
@api_router.post("/notebooks")
async def create_notebook(nb: NotebookIn, user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    doc = {
        "id": f"nb_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "title": nb.title, "topic": nb.topic, "markdown": nb.markdown,
        "sources": nb.sources, "chat": nb.chat,
        "created_at": now.isoformat(), "updated_at": now.isoformat(),
    }
    await db.notebooks.insert_one(dict(doc))
    return doc


@api_router.get("/notebooks")
async def list_notebooks(user: User = Depends(get_current_user)):
    docs = await db.notebooks.find({"user_id": user.user_id}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return docs


@api_router.get("/notebooks/{nb_id}")
async def get_notebook(nb_id: str, user: User = Depends(get_current_user)):
    doc = await db.notebooks.find_one({"id": nb_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return doc


@api_router.put("/notebooks/{nb_id}")
async def update_notebook(nb_id: str, nb: NotebookIn, user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    r = await db.notebooks.update_one(
        {"id": nb_id, "user_id": user.user_id},
        {"$set": {"title": nb.title, "topic": nb.topic, "markdown": nb.markdown,
                  "sources": nb.sources, "chat": nb.chat, "updated_at": now.isoformat()}},
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return await db.notebooks.find_one({"id": nb_id}, {"_id": 0})


@api_router.delete("/notebooks/{nb_id}")
async def delete_notebook(nb_id: str, user: User = Depends(get_current_user)):
    r = await db.notebooks.delete_one({"id": nb_id, "user_id": user.user_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return {"ok": True}


# ============ STORM-style multi-perspective report ============
@api_router.post("/storm/report")
async def storm_report(req: StormRequest, user: User = Depends(get_current_user)):
    """Stanford STORM-inspired: generate multi-perspective outline + article grounded in retrieved papers.
    1. Fetch top papers for the topic (arXiv + Semantic Scholar).
    2. Generate 3-5 perspectives (e.g., beginner, practitioner, critic, historian).
    3. For each perspective, LLM produces 2-3 questions.
    4. LLM answers each grounded in the paper citations.
    5. Synthesise a single structured markdown article.
    """
    # 1) sources
    arxiv, sem = await asyncio.gather(
        fetch_arxiv(req.topic, limit=6),
        fetch_semantic_scholar(req.topic, limit=6),
        return_exceptions=True,
    )
    def _u(x): return x if isinstance(x, list) else []
    sources = (_u(arxiv) + _u(sem))[:10]
    cite_map = {i + 1: {"title": s.get("title", ""), "url": s.get("url", ""), "source": s.get("source", "")} for i, s in enumerate(sources)}
    citations_ctx = "\n".join([f"[{i+1}] {s.get('title','')} — {s.get('source','')} — {s.get('url','')}" for i, s in enumerate(sources)])

    system = (
        "You are STORM — a multi-perspective research synthesiser. Given a TOPIC and CITED SOURCES, "
        "return ONLY a JSON object with this schema: "
        '{"outline": [{"section": "H2 title", "bullets": ["...","..."]}], '
        '"article": "long markdown with H2 headings matching outline, inline citations like [1][3] pointing to sources", '
        '"perspectives": ["beginner","practitioner","critic"], '
        '"key_open_problems": ["...","...","..."]}. '
        f"Use EXACTLY {max(2, min(5, req.perspectives))} perspectives — pick from beginner/practitioner/critic/historian/theorist based on topic. "
        "Ground every non-trivial claim in a citation [n] from the provided source list. Keep article under 900 words."
    )
    prompt = f"Topic: {req.topic}\n\nSources:\n{citations_ctx}\n\nProduce the JSON report."
    try:
        text = await llm_generate(user, system, prompt, req.provider, req.model, "storm")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"STORM LLM error: {e}")
    text = _strip_fence(text, "json")
    import json as _json
    try:
        parsed = _json.loads(text)
    except Exception:
        parsed = {"outline": [], "article": text[:2000], "perspectives": [], "key_open_problems": []}
    parsed["citations"] = cite_map
    return parsed


# ============ Notebook → Canvas compile ============
@api_router.post("/notebooks/compile")
async def notebook_compile(req: SkillCompileRequest, user: User = Depends(get_current_user)):
    """Read a notebook, ask LLM to propose an architecture graph."""
    nb = await db.notebooks.find_one({"id": req.notebook_id, "user_id": user.user_id}, {"_id": 0})
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")
    system = (
        "You compile a research NOTEBOOK into an EXECUTABLE PIPELINE graph. "
        'Return ONLY JSON: {"topic": str, "name": str, "description": str, '
        '"nodes": [{"id": str, "label": str, "type": one of [input, preprocess, detection, recognition, postprocess, output, custom], "algorithm": str_or_null, "tech": str_or_null, "position": {"x": int, "y": int}}], '
        '"edges": [{"id": str, "source": str, "target": str}]}. '
        "Layout nodes left-to-right at y=100, spacing x by 280. 3-7 nodes typical."
    )
    content = f"Notebook title: {nb.get('title')}\nTopic: {nb.get('topic')}\n\nMarkdown:\n{nb.get('markdown','')[:4000]}\n\nSources: {[s.get('title','') for s in (nb.get('sources') or [])][:8]}"
    try:
        text = await llm_generate(user, system, content, req.provider, req.model, "compile")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Compile LLM error: {e}")
    text = _strip_fence(text, "json")
    import json as _json
    try:
        parsed = _json.loads(text)
    except Exception:
        raise HTTPException(status_code=502, detail="Compile returned invalid JSON")
    return parsed





# ============ Skills CRUD ============
@api_router.post("/skills", response_model=Skill)
async def create_skill(skill: SkillIn, user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    doc = {
        "id": f"skill_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "name": skill.name,
        "topic": skill.topic,
        "description": skill.description,
        "nodes": [n.model_dump() for n in skill.nodes],
        "edges": [e.model_dump() for e in skill.edges],
        "tech_stack": skill.tech_stack,
        "version": skill.version,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.skills.insert_one(dict(doc))
    doc["created_at"] = now
    doc["updated_at"] = now
    return Skill(**doc)


@api_router.get("/skills")
async def list_skills(user: User = Depends(get_current_user)):
    docs = await db.skills.find({"user_id": user.user_id}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return docs


@api_router.get("/skills/{skill_id}")
async def get_skill(skill_id: str, user: User = Depends(get_current_user)):
    doc = await db.skills.find_one({"id": skill_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Skill not found")
    return doc


@api_router.put("/skills/{skill_id}")
async def update_skill(skill_id: str, skill: SkillIn, user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    result = await db.skills.update_one(
        {"id": skill_id, "user_id": user.user_id},
        {"$set": {
            "name": skill.name,
            "topic": skill.topic,
            "description": skill.description,
            "nodes": [n.model_dump() for n in skill.nodes],
            "edges": [e.model_dump() for e in skill.edges],
            "tech_stack": skill.tech_stack,
            "version": skill.version,
            "updated_at": now.isoformat(),
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Skill not found")
    return await db.skills.find_one({"id": skill_id}, {"_id": 0})


@api_router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: str, user: User = Depends(get_current_user)):
    r = await db.skills.delete_one({"id": skill_id, "user_id": user.user_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"ok": True}


@api_router.post("/skills/export")
async def export_skill(req: SkillMdRequest, user: User = Depends(get_current_user)):
    doc = await db.skills.find_one({"id": req.skill_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Skill not found")

    # Build deterministic SKILL.md scaffold
    nodes = doc.get("nodes", [])
    edges = doc.get("edges", [])
    tech_lines = []
    for n in nodes:
        algo = n.get("algorithm") or "TBD"
        tech = n.get("tech") or ""
        tech_lines.append(f"  - node: {n.get('label')}\n    type: {n.get('type')}\n    algorithm: {algo}\n    tech: {tech}")
    yaml_front = (
        "---\n"
        f"name: {doc.get('name','untitled-skill')}\n"
        f"version: {doc.get('version','1.0.0')}\n"
        f"topic: {doc.get('topic','')}\n"
        f"description: {doc.get('description','')}\n"
        f"author: {user.name}\n"
        f"created_at: {doc.get('created_at','')}\n"
        "nodes:\n"
        + ("\n".join(tech_lines) if tech_lines else "  []")
        + "\n---\n"
    )

    # Enhance with LLM narrative
    system = (
        "You are writing a SKILL.md body (markdown) for a research pipeline skill consumable by LLM agents. "
        "Given a pipeline (nodes, edges, tech stack, topic), produce concise, high-signal markdown with sections: "
        "'# {name}', '## Purpose', '## Pipeline Overview', '## How to Invoke', '## Node Details' (per node), "
        "'## Suggested Enhancements', '## References'. Do NOT include YAML front-matter (already provided). "
        "Return ONLY markdown."
    )
    ctx = {
        "name": doc.get("name"),
        "topic": doc.get("topic"),
        "description": doc.get("description"),
        "nodes": nodes,
        "edges": edges,
    }
    import json as _json
    try:
        body = await llm_generate(user, system, _json.dumps(ctx), req.provider, req.model, "skillmd")
        body = _strip_fence(body, "markdown")
    except Exception as e:
        logger.warning(f"llm skill body failed: {e}")
        body = f"# {doc.get('name')}\n\n{doc.get('description','')}\n"

    skill_md = yaml_front + "\n" + body + "\n"
    return {"skill_md": skill_md, "filename": f"{doc.get('name','skill').replace(' ','-').lower()}.md"}


# ============ Health ============
@api_router.get("/")
async def root():
    return {"service": "AERwolf", "status": "online"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
