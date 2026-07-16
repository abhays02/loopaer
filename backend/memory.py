"""Memory loop — cumulative knowledge across sessions.

Facts and entities from every completed research loop are archived to a global
`memory` collection. A lightweight text-token overlap score (Jaccard on
lowercased word tokens) is used for retrieval — good enough without a vector DB
and keeps the runtime dependency-light. Emits `MemoryHit` events when relevant
prior knowledge is found for a new goal.
"""
import re
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase


TOKEN_RE = re.compile(r"[a-zA-Z0-9]+")
STOP = set("the a an is are was were be to of for and or with on in from by at as this that it its".split())


def tokens(s: str) -> set:
    return {t.lower() for t in TOKEN_RE.findall(s or "") if t.lower() not in STOP and len(t) > 2}


def score(q_tokens: set, text: str) -> float:
    ts = tokens(text)
    if not ts:
        return 0.0
    inter = len(q_tokens & ts)
    if inter == 0:
        return 0.0
    return inter / (len(q_tokens | ts) or 1)


async def archive_session(db: AsyncIOMotorDatabase, session_id: str, goal: str, facts: List[Dict[str, Any]], entities: List[Dict[str, Any]]):
    """Persist verified facts and entities to global memory."""
    docs = []
    for f in facts:
        conf = f.get("verified_confidence", f.get("confidence", 0))
        if conf < 30:  # skip low-confidence stuff
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
    """Return top-k memory hits ranked by simple token overlap score."""
    q = tokens(goal)
    if not q:
        return []
    cursor = db.memory.find({"session_id": {"$ne": exclude_session}}, {"_id": 0}).limit(500)
    docs = await cursor.to_list(500)
    scored = []
    for d in docs:
        s = score(q, d.get("text", "") + " " + d.get("goal", ""))
        if s > 0:
            d["score"] = round(s, 3)
            scored.append(d)
    scored.sort(key=lambda x: -x["score"])
    return scored[:top_k]


async def list_all(db: AsyncIOMotorDatabase, limit: int = 200) -> List[Dict[str, Any]]:
    cursor = db.memory.find({}, {"_id": 0}).sort([("kind", 1)]).limit(limit)
    return await cursor.to_list(limit)
