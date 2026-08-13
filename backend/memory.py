"""Memory loop — cumulative knowledge across sessions.

Facts and entities from every completed research loop are archived to a global
`memory` collection. Recall uses a MongoDB TEXT INDEX (created on startup) for
O(log n) scoring at scale, with a Python re-rank pass by textScore. Emits
`MemoryHit` events when relevant prior knowledge is found for a new goal.
"""
import re
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase


TOKEN_RE = re.compile(r"[a-zA-Z0-9]+")
STOP = set("the a an is are was were be to of for and or with on in from by at as this that it its".split())


async def ensure_indexes(db: AsyncIOMotorDatabase):
    """Create text index for scalable recall. Idempotent."""
    try:
        await db.memory.create_index(
            [("text", "text"), ("goal", "text")],
            name="memory_fulltext",
            default_language="english",
        )
    except Exception:
        pass
    try:
        await db.memory.create_index("session_id")
        await db.memory.create_index("kind")
        await db.events.create_index([("session_id", 1), ("seq", 1)])
    except Exception:
        pass


def tokens(s: str) -> set:
    return {t.lower() for t in TOKEN_RE.findall(s or "") if t.lower() not in STOP and len(t) > 2}


async def archive_session(db: AsyncIOMotorDatabase, session_id: str, goal: str, facts: List[Dict[str, Any]], entities: List[Dict[str, Any]]):
    """Persist verified facts and entities to global memory."""
    docs = []
    for f in facts:
        conf = f.get("verified_confidence", f.get("confidence", 0))
        if conf < 30:
            continue
        docs.append({
            "kind": "fact",
            "session_id": session_id,
            "goal": goal,
            "text": f.get("text", ""),
            "confidence": conf,
            "verdict": f.get("verdict"),
            "type": f.get("kind"),
        })
    for e in entities:
        docs.append({
            "kind": "entity",
            "session_id": session_id,
            "goal": goal,
            "text": e.get("label", ""),
            "type": e.get("type"),
        })
    if docs:
        await db.memory.insert_many(docs)
    return len(docs)


async def recall(db: AsyncIOMotorDatabase, goal: str, exclude_session: str = "", top_k: int = 8) -> List[Dict[str, Any]]:
    """Return top-k memory hits ranked by Mongo's text score (O(log n) w/ index).

    Falls back to Python token-overlap scoring for edge queries.
    """
    q = (goal or "").strip()
    if not q:
        return []
    filter_: Dict[str, Any] = {"$text": {"$search": q}}
    if exclude_session:
        filter_["session_id"] = {"$ne": exclude_session}
    try:
        cursor = (
            db.memory
            .find(filter_, {"_id": 0, "score": {"$meta": "textScore"}})
            .sort([("score", {"$meta": "textScore"})])
            .limit(top_k)
        )
        docs = await cursor.to_list(top_k)
        if docs:
            mx = max(d.get("score", 0) for d in docs) or 1.0
            for d in docs:
                d["score"] = round(min(1.0, (d.get("score", 0) or 0) / mx), 3)
            return docs
    except Exception:
        pass

    # Fallback
    q_tokens = tokens(q)
    if not q_tokens:
        return []
    filter2: Dict[str, Any] = {}
    if exclude_session:
        filter2["session_id"] = {"$ne": exclude_session}
    docs = await db.memory.find(filter2, {"_id": 0}).limit(500).to_list(500)
    scored: List[Dict[str, Any]] = []
    for d in docs:
        ts = tokens(d.get("text", "") + " " + d.get("goal", ""))
        if not ts:
            continue
        inter = len(q_tokens & ts)
        if inter == 0:
            continue
        d["score"] = round(inter / (len(q_tokens | ts) or 1), 3)
        scored.append(d)
    scored.sort(key=lambda x: -x["score"])
    return scored[:top_k]


async def list_all(db: AsyncIOMotorDatabase, limit: int = 200) -> List[Dict[str, Any]]:
    cursor = db.memory.find({}, {"_id": 0}).sort([("kind", 1)]).limit(limit)
    return await cursor.to_list(limit)
