"""LOOPAER — event-driven autonomous research runtime.

Endpoints:
  POST   /api/sessions                 create session (goal, model)
  GET    /api/sessions                 list sessions
  GET    /api/sessions/{sid}           get session
  POST   /api/sessions/{sid}/plan      run planner loop
  POST   /api/sessions/{sid}/research  run research loop
  POST   /api/sessions/{sid}/verify    run verification loop
  POST   /api/sessions/{sid}/skill     run skill builder loop
  POST   /api/sessions/{sid}/loops/{lid}/pause
  POST   /api/sessions/{sid}/loops/{lid}/resume
  POST   /api/sessions/{sid}/loops/{lid}/cancel
  POST   /api/sessions/{sid}/loops/{lid}/inject
  POST   /api/sessions/{sid}/branch
  GET    /api/sessions/{sid}/events    replay all buffered events
  GET    /api/sessions/{sid}/knowledge full knowledge graph
  WS     /api/ws/{sid}                 live event stream

  GET    /api/models                   list of available models
  GET    /api/skills                   list all persisted skills
"""
from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient  # noqa
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
import os
import asyncio
import logging
import json

from openrouter import list_models, DEFAULT_MODEL, OpenRouterClient
from runtime import Runtime
from eventbus import bus
import memory as mem
import genui
import secretstore
import uuid

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

mongo = AsyncIOMotorClient(MONGO_URL)
db = mongo[DB_NAME]

runtime = Runtime(db)
bus.attach_db(db)

app = FastAPI(title="Loopaer Runtime")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("loopaer")


# ------- schemas -------
class CreateSession(BaseModel):
    goal: str
    model: str = DEFAULT_MODEL


class InjectBody(BaseModel):
    instruction: str


class BranchBody(BaseModel):
    goal: str | None = None


class PatchSession(BaseModel):
    model: str | None = None
    goal: str | None = None


class GenUIBody(BaseModel):
    intent: str
    context: dict | None = None


class SnapshotBody(BaseModel):
    sid1: str
    sid2: str
    note: str | None = None


class SetKeyBody(BaseModel):
    api_key: str


# ------- endpoints -------

@api.get("/")
async def root():
    return {"service": "loopaer-runtime", "status": "online"}


@api.get("/models")
async def get_models():
    return {"models": list_models(), "default": DEFAULT_MODEL}


@api.post("/sessions")
async def create_session(body: CreateSession):
    if not body.goal.strip():
        raise HTTPException(400, "goal required")
    s = await runtime.create_session(body.goal.strip(), model=body.model)
    return s.to_dict()


@api.get("/sessions")
async def list_sessions():
    docs = await db.sessions.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"sessions": docs}


@api.get("/sessions/{sid}")
async def get_session(sid: str):
    s = await runtime.load_session(sid)
    if not s:
        raise HTTPException(404, "session not found")
    return s.to_dict()


@api.patch("/sessions/{sid}")
async def patch_session(sid: str, body: PatchSession):
    """Persist model + goal changes server-side. Returns the updated session."""
    s = runtime.get(sid) or await runtime.load_session(sid)
    if not s:
        raise HTTPException(404, "session not found")
    updates = {}
    if body.model:
        # If free-only mode is on and user picked a paid model, silently remap
        model = body.model
        if os.environ.get("FREE_MODELS_ONLY", "0") == "1" and not (model.endswith(":free") or model == "openrouter/free"):
            model = "openrouter/free"
        s.model = model
        updates["model"] = model
    if body.goal is not None and body.goal.strip():
        s.goal = body.goal.strip()
        updates["goal"] = s.goal
    if updates:
        await db.sessions.update_one({"id": sid}, {"$set": updates})
        await bus.emit(sid, "SessionUpdated", updates)
    return s.to_dict()


@api.get("/sessions/{sid}/events")
async def session_events(sid: str):
    # rehydrate from mongo if buffer is stale/empty (compares counts internally)
    await bus.rehydrate(sid)
    return {"events": bus.history(sid)}


@api.get("/sessions/{sid}/knowledge")
async def session_knowledge(sid: str):
    s = await runtime.load_session(sid)
    if not s:
        raise HTTPException(404, "session not found")
    return {"knowledge": s.knowledge, "reasoning_tree": s.reasoning_tree, "confidence_history": s.confidence_history}


@api.get("/sessions/{sid}/tree")
async def session_tree(sid: str):
    s = runtime.get(sid) or await runtime.load_session(sid)
    if not s:
        raise HTTPException(404, "session not found")
    return {"tree": s.reasoning_tree}


@api.post("/sessions/{sid}/plan")
async def run_plan(sid: str):
    s = runtime.get(sid) or await runtime.load_session(sid)
    if not s:
        raise HTTPException(404, "session not found")
    loop = await runtime.run_planner(s)
    return {"loop_id": loop.id, "state": loop.state}


@api.post("/sessions/{sid}/research")
async def run_research(sid: str):
    s = runtime.get(sid) or await runtime.load_session(sid)
    if not s:
        raise HTTPException(404, "session not found")
    loop = await runtime.run_research(s)
    return {"loop_id": loop.id, "state": loop.state}


@api.post("/sessions/{sid}/verify")
async def run_verify(sid: str):
    s = runtime.get(sid) or await runtime.load_session(sid)
    if not s:
        raise HTTPException(404, "session not found")
    loop = await runtime.run_verification(s)
    return {"loop_id": loop.id, "state": loop.state}


@api.post("/sessions/{sid}/skill")
async def run_skill(sid: str):
    s = runtime.get(sid) or await runtime.load_session(sid)
    if not s:
        raise HTTPException(404, "session not found")
    loop = await runtime.run_skill_builder(s)
    return {"loop_id": loop.id, "state": loop.state}


@api.post("/sessions/{sid}/run-all")
async def run_all(sid: str):
    """Run the full pipeline sequentially (planner → research → verify → skill)."""
    s = runtime.get(sid) or await runtime.load_session(sid)
    if not s:
        raise HTTPException(404, "session not found")

    async def pipeline():
        p = await runtime.run_planner(s)
        await p.task
        r = await runtime.run_research(s)
        await r.task
        v = await runtime.run_verification(s)
        await v.task
        sk = await runtime.run_skill_builder(s)
        await sk.task
    asyncio.create_task(pipeline())
    return {"ok": True, "session_id": sid}


@api.post("/sessions/{sid}/loops/{lid}/pause")
async def pause_loop(sid: str, lid: str):
    ok = await runtime.pause_loop(sid, lid)
    if not ok:
        raise HTTPException(404, "loop not found")
    return {"ok": True}


@api.post("/sessions/{sid}/loops/{lid}/resume")
async def resume_loop(sid: str, lid: str):
    ok = await runtime.resume_loop(sid, lid)
    if not ok:
        raise HTTPException(404, "loop not found")
    return {"ok": True}


@api.post("/sessions/{sid}/loops/{lid}/cancel")
async def cancel_loop(sid: str, lid: str):
    ok = await runtime.cancel_loop(sid, lid)
    if not ok:
        raise HTTPException(404, "loop not found")
    return {"ok": True}


@api.post("/sessions/{sid}/loops/{lid}/inject")
async def inject(sid: str, lid: str, body: InjectBody):
    ok = await runtime.inject(sid, lid, body.instruction)
    if not ok:
        raise HTTPException(404, "loop not found")
    return {"ok": True}


@api.post("/sessions/{sid}/branch")
async def branch(sid: str, body: BranchBody):
    new = await runtime.branch_session(sid, body.goal)
    if not new:
        raise HTTPException(404, "source session not found")
    return new.to_dict()


@api.get("/skills")
async def list_skills():
    docs = await db.skills.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"skills": docs}


@api.get("/skills/{skill_id}")
async def get_skill(skill_id: str):
    doc = await db.skills.find_one({"id": skill_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "skill not found")
    return doc


@api.get("/memory")
async def get_memory(limit: int = 200):
    docs = await mem.list_all(db, limit=limit)
    return {"memory": docs, "count": len(docs)}


@api.get("/memory/recall")
async def memory_recall(q: str, top_k: int = 8):
    hits = await mem.recall(db, q, top_k=top_k)
    return {"query": q, "hits": hits}


# ---- Secrets ----

@api.get("/secrets/status")
async def secrets_status():
    """Report whether an OpenRouter key is configured. Never returns the key."""
    key = await secretstore.get_openrouter_key(db)
    masked = ""
    if key:
        masked = key[:8] + "…" + key[-4:]
    return {"openrouter": {"configured": bool(key), "masked": masked, "free_only": os.environ.get("FREE_MODELS_ONLY","0")=="1"}}


@api.put("/secrets/openrouter")
async def set_openrouter(body: SetKeyBody):
    ok = await secretstore.set_openrouter_key(db, body.api_key)
    if not ok:
        raise HTTPException(400, "invalid key format")
    return {"ok": True}


# ---- GenUI ----

@api.post("/genui")
async def generate_ui(body: GenUIBody):
    """Generate a dynamic UI schema for the given intent. FREE MODELS ONLY."""
    if not body.intent.strip():
        raise HTTPException(400, "intent required")
    msgs = genui.build_messages(body.intent, body.context)
    try:
        schema = await runtime.client.chat_json(msgs, model="openrouter/free", temperature=0.35)
    except Exception as e:
        raise HTTPException(500, f"genui failed: {str(e)[:180]}")
    schema = genui.sanitize(schema)
    doc = {
        "id": f"ui_{uuid.uuid4().hex[:10]}",
        "intent": body.intent,
        "schema": schema,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.genui.insert_one(dict(doc))
    return doc


@api.get("/genui/{ui_id}")
async def get_genui(ui_id: str):
    doc = await db.genui.find_one({"id": ui_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "genui not found")
    return doc


# ---- Diff snapshots ----

@api.post("/diff/snapshot")
async def create_snapshot(body: SnapshotBody):
    """Freeze a diff of two sessions into a shareable read-only URL."""
    async def freeze(sid: str):
        s = await runtime.load_session(sid)
        if not s:
            raise HTTPException(404, f"session {sid} not found")
        return {
            "id": sid,
            "goal": s.goal,
            "model": s.model,
            "plan": s.plan,
            "reasoning_tree": s.reasoning_tree,
            "knowledge": s.knowledge,
            "loops": [l.to_dict() for l in s.loops.values()],
        }
    a = await freeze(body.sid1)
    b = await freeze(body.sid2)
    snap = {
        "id": f"snap_{uuid.uuid4().hex[:12]}",
        "sid1": body.sid1,
        "sid2": body.sid2,
        "note": body.note or "",
        "session_a": a,
        "session_b": b,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.snapshots.insert_one(dict(snap))
    return snap


@api.get("/snapshots/{snap_id}")
async def get_snapshot(snap_id: str):
    doc = await db.snapshots.find_one({"id": snap_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "snapshot not found")
    return doc


# ------- WebSocket event stream -------

@app.websocket("/api/ws/{sid}")
async def ws_events(ws: WebSocket, sid: str):
    await ws.accept()
    # rehydrate persisted events for late/reconnecting clients (compares counts)
    await bus.rehydrate(sid)
    q = bus.subscribe(sid)
    try:
        await ws.send_text(json.dumps({"type": "Connected", "session_id": sid}))
        while True:
            ev = await q.get()
            await ws.send_text(json.dumps(ev))
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning(f"ws error: {e}")
    finally:
        bus.unsubscribe(sid, q)


app.include_router(api)


@app.on_event("startup")
async def startup():
    await mem.ensure_indexes(db)
    await secretstore.bootstrap(db)


@app.on_event("shutdown")
async def shutdown():
    mongo.close()
