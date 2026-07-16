"""In-process event bus. Sessions publish events; WebSockets subscribe."""
import asyncio
import json
from datetime import datetime, timezone
from typing import Dict, Any, Set, List
from collections import defaultdict


class EventBus:
    def __init__(self):
        # session_id -> set of asyncio.Queues
        self._subs: Dict[str, Set[asyncio.Queue]] = defaultdict(set)
        # persistent buffer per session (last N events, for late subscribers)
        self._buffer: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self._counter: Dict[str, int] = defaultdict(int)
        self._max_buffer = 800

    def subscribe(self, session_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=1024)
        self._subs[session_id].add(q)
        # replay buffered events
        for ev in self._buffer.get(session_id, []):
            try:
                q.put_nowait(ev)
            except asyncio.QueueFull:
                break
        return q

    def unsubscribe(self, session_id: str, q: asyncio.Queue):
        self._subs[session_id].discard(q)

    async def emit(self, session_id: str, type_: str, payload: Dict[str, Any] | None = None):
        self._counter[session_id] += 1
        cnt = self._counter[session_id]
        event = {
            "id": f"ev_{session_id}_{cnt}",
            "session_id": session_id,
            "type": type_,
            "ts": datetime.now(timezone.utc).isoformat(),
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
        return event

    def history(self, session_id: str) -> List[Dict[str, Any]]:
        return list(self._buffer.get(session_id, []))


bus = EventBus()
