"""In-process event bus with optional Mongo persistence.

Every emitted event is:
  1. appended to an in-memory ring buffer for fast WS replay
  2. broadcast to all subscribed WebSocket queues
  3. persisted to the `events` collection (fire-and-forget)

When a session is re-loaded from Mongo (cold), the buffer is rehydrated
from `events` so scrubbers/timelines continue to work.
"""
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Set, List, Optional
from collections import defaultdict


class EventBus:
    def __init__(self):
        self._subs: Dict[str, Set[asyncio.Queue]] = defaultdict(set)
        self._buffer: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self._counter: Dict[str, int] = defaultdict(int)
        self._max_buffer = 1200
        self._db = None  # motor db, injected on startup

    def attach_db(self, db):
        self._db = db

    def subscribe(self, session_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=2048)
        self._subs[session_id].add(q)
        for ev in self._buffer.get(session_id, []):
            try:
                q.put_nowait(ev)
            except asyncio.QueueFull:
                break
        return q

    def unsubscribe(self, session_id: str, q: asyncio.Queue):
        self._subs[session_id].discard(q)

    async def emit(self, session_id: str, type_: str, payload: Optional[Dict[str, Any]] = None):
        self._counter[session_id] += 1
        cnt = self._counter[session_id]
        event = {
            "id": f"ev_{session_id}_{cnt}",
            "session_id": session_id,
            "type": type_,
            "ts": datetime.now(timezone.utc).isoformat(),
            "seq": cnt,
            "payload": payload or {},
        }
        buf = self._buffer[session_id]
        buf.append(event)
        if len(buf) > self._max_buffer:
            del buf[0:len(buf) - self._max_buffer]
        for q in list(self._subs.get(session_id, [])):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass
        # persist
        if self._db is not None:
            try:
                await self._db.events.insert_one(dict(event))
            except Exception:
                pass
        return event

    def history(self, session_id: str) -> List[Dict[str, Any]]:
        return list(self._buffer.get(session_id, []))

    async def rehydrate(self, session_id: str, force: bool = False) -> int:
        """Load events for a session from Mongo into the in-memory buffer.

        By default rehydrates only when the buffer has strictly fewer events than
        Mongo (or is empty). Pass ``force=True`` to unconditionally reload.
        Returns number of events in the buffer after rehydration.
        """
        if self._db is None:
            return len(self._buffer.get(session_id, []))
        buf_len = len(self._buffer.get(session_id, []))
        try:
            mongo_count = await self._db.events.count_documents({"session_id": session_id})
        except Exception:
            mongo_count = 0
        if not force and buf_len >= mongo_count and buf_len > 0:
            return buf_len
        # Rehydrate (or top up)
        cursor = self._db.events.find({"session_id": session_id}, {"_id": 0}).sort("seq", 1).limit(self._max_buffer)
        docs = await cursor.to_list(self._max_buffer)
        if docs:
            self._buffer[session_id] = docs
            self._counter[session_id] = max(d.get("seq", 0) for d in docs)
        return len(self._buffer.get(session_id, []))


bus = EventBus()
