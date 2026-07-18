"""Loop runtime: pausable, resumable, cancelable, inspectable reasoning loops.

Sessions contain multiple loops. Each loop runs as an asyncio task and reports
state through the event bus. Users can pause/resume/cancel/branch/inject.
"""
from __future__ import annotations
import asyncio
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from motor.motor_asyncio import AsyncIOMotorDatabase

from openrouter import OpenRouterClient, DEFAULT_MODEL
from sources import fetch_arxiv, fetch_github
from eventbus import bus
import memory as mem


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---- Prompts ---------------------------------------------------------

PLANNER_SYS = (
    "You are a planning module in a research runtime. Given the USER GOAL, return ONLY strict JSON:\n"
    '{ "understanding": "one-sentence restatement of the goal",\n'
    '  "questions": [3-5 sharp sub-questions],\n'
    '  "tasks": [ {"id":"t1","title":"...","kind":"search|verify|synthesize|extract","depends_on":[]}, ... 4 to 6 tasks ],\n'
    '  "cost_estimate": "low | medium | high",\n'
    '  "time_estimate": "seconds",\n'
    '  "confidence": 0-100 }\n'
    "Do not include any prose outside the JSON."
)

EXTRACT_SYS = (
    "You are a research extractor. Given several source snippets about a topic, return ONLY JSON:\n"
    '{ "facts": [ {"text":"...","source_idx": int, "confidence": 0-100, "kind":"claim|method|benchmark|dataset|tool"} ],\n'
    '  "entities": [ {"label":"...","type":"paper|author|algorithm|repo|dataset|framework|company"} ],\n'
    '  "gaps": [ "what important information is missing?" ] }\n'
    "Return only the JSON. 6-12 facts, 4-10 entities."
)

VERIFIER_SYS = (
    "You are a fact verifier. Given a claim and N candidate sources, return ONLY JSON:\n"
    '{ "confidence": 0-100, "verdict": "supported|contested|unsupported", "supporting_indices":[int], "notes":"..." }.'
)

SKILL_SYS = (
    "You compile verified research into a portable AI SKILL. Return ONLY JSON:\n"
    '{ "name":"kebab-case", "purpose":"one line", "system_prompt":"...", "workflow":["step1","step2",...],\n'
    '  "tool_requirements":["..."], "recommended_models":["openrouter model ids"],\n'
    '  "example_input":"...", "example_output":"...", "tests":[{"input":"...","expected":"..."}],\n'
    '  "failure_modes":["..."], "version":"1.0.0" }'
)


# ---- Loop model ------------------------------------------------------

class LoopState:
    RUNNING = "running"
    WAITING = "waiting"
    PAUSED = "paused"
    NEEDS_USER = "needs_user"
    CANCELLED = "cancelled"
    FINISHED = "finished"
    FAILED = "failed"


class Loop:
    def __init__(self, session_id: str, kind: str, title: str, parent: Optional[str] = None):
        self.id = f"loop_{uuid.uuid4().hex[:10]}"
        self.session_id = session_id
        self.kind = kind
        self.title = title
        self.parent = parent
        self.state = LoopState.RUNNING
        self.iterations = 0
        self.budget = 6  # max iterations
        self.history: List[Dict[str, Any]] = []
        self.injections: List[str] = []  # user injections queued
        self.result: Any = None
        self.error: Optional[str] = None
        self._pause_event = asyncio.Event()
        self._pause_event.set()  # not paused = set
        self._cancel = False
        self.task: Optional[asyncio.Task] = None
        self.created_at = now_iso()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "kind": self.kind,
            "title": self.title,
            "parent": self.parent,
            "state": self.state,
            "iterations": self.iterations,
            "budget": self.budget,
            "history": self.history[-30:],
            "injections": self.injections,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at,
        }

    def pause(self):
        if self.state in (LoopState.RUNNING, LoopState.WAITING):
            self._pause_event.clear()
            self.state = LoopState.PAUSED

    def resume(self):
        if self.state == LoopState.PAUSED:
            self._pause_event.set()
            self.state = LoopState.RUNNING

    def cancel(self):
        self._cancel = True
        self._pause_event.set()
        self.state = LoopState.CANCELLED

    def inject(self, instruction: str):
        self.injections.append(instruction)

    async def _checkpoint(self):
        # honor pause
        if not self._pause_event.is_set():
            await bus.emit(self.session_id, "LoopPaused", {"loop_id": self.id})
            await self._pause_event.wait()
            if self._cancel:
                return
            await bus.emit(self.session_id, "LoopResumed", {"loop_id": self.id})
        if self._cancel:
            raise asyncio.CancelledError()


# ---- Session ---------------------------------------------------------

class Session:
    def __init__(self, sid: str, goal: str, model: str, db: AsyncIOMotorDatabase):
        self.id = sid
        self.goal = goal
        self.model = model
        self.db = db
        self.loops: Dict[str, Loop] = {}
        self.plan: Optional[Dict[str, Any]] = None
        self.knowledge: Dict[str, Any] = {"facts": [], "entities": [], "sources": []}
        self.reasoning_tree: Dict[str, Any] = {"id": "root", "label": goal, "kind": "root", "children": []}
        self.confidence_history: List[Dict[str, Any]] = []
        self.created_at = now_iso()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "goal": self.goal,
            "model": self.model,
            "created_at": self.created_at,
            "plan": self.plan,
            "loops": [l.to_dict() for l in self.loops.values()],
            "knowledge": {
                "facts_count": len(self.knowledge["facts"]),
                "entities_count": len(self.knowledge["entities"]),
                "sources_count": len(self.knowledge["sources"]),
            },
            "confidence_history": self.confidence_history[-60:],
        }


# ---- Runtime ---------------------------------------------------------

class Runtime:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.sessions: Dict[str, Session] = {}
        self.client = OpenRouterClient()

    async def _stream_json(self, session: Session, loop: Loop, messages: List[Dict[str, str]]) -> Any:
        """Stream tokens for a JSON-producing prompt, emitting TokenStreamed events.

        Returns the parsed JSON (dict/list) or raises."""
        buf: List[str] = []
        try:
            async for tok in self.client.stream(messages, model=session.model, temperature=0.35, max_tokens=1300):
                buf.append(tok)
                if sum(len(x) for x in buf[-6:]) > 24:
                    await bus.emit(session.id, "TokenStreamed", {"loop_id": loop.id, "delta": "".join(buf[-6:])})
        except Exception as e:
            # Streaming failed — fall back to non-streaming chat_json
            return await self.client.chat_json(messages, model=session.model)

        text = "".join(buf).strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        try:
            return json.loads(text)
        except Exception:
            for opener, closer in [("{", "}"), ("[", "]")]:
                i, j = text.find(opener), text.rfind(closer)
                if i != -1 and j != -1 and j > i:
                    try:
                        return json.loads(text[i:j + 1])
                    except Exception:
                        continue
            # last-ditch: non-streaming retry
            return await self.client.chat_json(messages, model=session.model)

    # -- lifecycle --

    async def create_session(self, goal: str, model: str = DEFAULT_MODEL) -> Session:
        sid = f"sess_{uuid.uuid4().hex[:10]}"
        s = Session(sid, goal, model, self.db)
        self.sessions[sid] = s
        await self.db.sessions.insert_one({
            "id": sid, "goal": goal, "model": model,
            "created_at": s.created_at,
        })
        await bus.emit(sid, "SessionCreated", {"goal": goal, "model": model})
        return s

    def get(self, sid: str) -> Optional[Session]:
        return self.sessions.get(sid)

    async def load_session(self, sid: str) -> Optional[Session]:
        if sid in self.sessions:
            return self.sessions[sid]
        doc = await self.db.sessions.find_one({"id": sid}, {"_id": 0})
        if not doc:
            return None
        s = Session(sid, doc.get("goal", ""), doc.get("model", DEFAULT_MODEL), self.db)
        # restore knowledge + reasoning tree from persisted collections/events
        k = await self.db.knowledge.find_one({"session_id": sid}, {"_id": 0})
        if k:
            s.knowledge = k.get("knowledge", s.knowledge)
        # Rebuild reasoning tree from the last ReasoningTreeUpdated event.
        try:
            last_tree = await self.db.events.find_one(
                {"session_id": sid, "type": "ReasoningTreeUpdated"},
                {"_id": 0}, sort=[("seq", -1)]
            )
            if last_tree and last_tree.get("payload", {}).get("tree"):
                s.reasoning_tree = last_tree["payload"]["tree"]
        except Exception:
            pass
        s.plan = doc.get("plan")
        self.sessions[sid] = s
        return s

    # -- launch loops --

    def _launch(self, loop: Loop, coro):
        loop.task = asyncio.create_task(self._wrap(loop, coro))
        return loop

    async def _wrap(self, loop: Loop, coro):
        try:
            await coro
            if loop.state not in (LoopState.CANCELLED, LoopState.FAILED):
                loop.state = LoopState.FINISHED
                await bus.emit(loop.session_id, "LoopFinished", {"loop_id": loop.id, "kind": loop.kind})
        except asyncio.CancelledError:
            loop.state = LoopState.CANCELLED
            await bus.emit(loop.session_id, "LoopCancelled", {"loop_id": loop.id})
        except Exception as e:
            loop.state = LoopState.FAILED
            loop.error = str(e)
            await bus.emit(loop.session_id, "LoopFailed", {"loop_id": loop.id, "error": str(e)})

    # -- planner --

    async def run_planner(self, session: Session) -> Loop:
        loop = Loop(session.id, "planner", "Understanding goal & planning")
        session.loops[loop.id] = loop
        await bus.emit(session.id, "LoopStarted", {"loop_id": loop.id, "kind": "planner", "title": loop.title})

        async def go():
            await loop._checkpoint()

            # Memory recall — check if prior sessions covered this topic.
            try:
                hits = await mem.recall(self.db, session.goal, exclude_session=session.id, top_k=5)
                for h in hits:
                    await bus.emit(session.id, "MemoryHit", {"score": h.get("score"), "text": h.get("text","")[:180], "kind": h.get("kind"), "goal": h.get("goal","")[:80]})
            except Exception:
                hits = []

            await bus.emit(session.id, "PlannerThinking", {"loop_id": loop.id, "step": "understanding"})

            # STREAMING PLANNER — stream tokens to the event bus so UI shows live thinking.
            mem_context = ""
            if hits:
                mem_context = "\n\nRELEVANT PRIOR KNOWLEDGE (from memory):\n" + "\n".join(f"- {h['text'][:160]}" for h in hits[:5])

            msgs = [
                {"role": "system", "content": PLANNER_SYS},
                {"role": "user", "content": f"USER GOAL:\n{session.goal}{mem_context}"},
            ]

            try:
                plan = await self._stream_json(session, loop, msgs)
                if not isinstance(plan, dict) or "tasks" not in plan:
                    raise RuntimeError("planner returned malformed JSON")
            except Exception as e:
                plan = {
                    "understanding": session.goal,
                    "questions": [f"What is {session.goal}?", "What are the leading approaches?", "What is missing in current work?"],
                    "tasks": [
                        {"id": "t1", "title": "Search recent arXiv papers", "kind": "search", "depends_on": []},
                        {"id": "t2", "title": "Search GitHub for reference implementations", "kind": "search", "depends_on": []},
                        {"id": "t3", "title": "Extract facts & entities", "kind": "extract", "depends_on": ["t1", "t2"]},
                        {"id": "t4", "title": "Verify & compute confidence", "kind": "verify", "depends_on": ["t3"]},
                        {"id": "t5", "title": "Compile skill package", "kind": "synthesize", "depends_on": ["t4"]},
                    ],
                    "cost_estimate": "medium",
                    "time_estimate": "45",
                    "confidence": 70,
                    "_fallback_error": str(e)[:180],
                }

            session.plan = plan
            loop.result = plan
            loop.iterations = 1
            await self.db.sessions.update_one({"id": session.id}, {"$set": {"plan": plan}})
            await bus.emit(session.id, "PlanReady", {"loop_id": loop.id, "plan": plan})
            session.reasoning_tree["children"] = [
                {"id": t.get("id", f"t{i}"), "label": t.get("title",""), "kind": t.get("kind"), "confidence": None, "children": []}
                for i, t in enumerate(plan.get("tasks", []))
            ]
            await bus.emit(session.id, "ReasoningTreeUpdated", {"tree": session.reasoning_tree})
        return self._launch(loop, go())

    # -- research --

    async def run_research(self, session: Session) -> Loop:
        loop = Loop(session.id, "research", "Discovering knowledge from arXiv + GitHub")
        session.loops[loop.id] = loop
        await bus.emit(session.id, "LoopStarted", {"loop_id": loop.id, "kind": "research", "title": loop.title})

        async def go():
            iteration = 0
            queries = [session.goal]
            while iteration < loop.budget and not loop._cancel:
                await loop._checkpoint()
                iteration += 1
                loop.iterations = iteration
                q = queries.pop(0) if queries else session.goal
                # process injections
                if loop.injections:
                    inj = loop.injections.pop(0)
                    await bus.emit(session.id, "InjectionApplied", {"loop_id": loop.id, "instruction": inj})
                    q = f"{q} — user note: {inj}"

                await bus.emit(session.id, "ResearchStarted", {"loop_id": loop.id, "iteration": iteration, "query": q})

                await bus.emit(session.id, "SourceFetching", {"source": "arXiv", "query": q})
                papers = await fetch_arxiv(q, limit=5)
                for p in papers[:5]:
                    session.knowledge["sources"].append(p)
                    await bus.emit(session.id, "PaperFound", {"title": p["title"], "url": p["url"], "authors": p.get("authors", [])})
                await bus.emit(session.id, "SourceFetching", {"source": "GitHub", "query": q})
                repos = await fetch_github(q, limit=5)
                for r in repos[:5]:
                    session.knowledge["sources"].append(r)
                    await bus.emit(session.id, "RepositoryFound", {"name": r["title"], "url": r["url"], "stars": r.get("stars", 0)})

                # summarize & extract (STREAMED)
                if papers or repos:
                    snippets = []
                    for i, s in enumerate(session.knowledge["sources"][-10:]):
                        text = s.get("abstract") or s.get("description", "")
                        snippets.append(f"[{i}] {s.get('title')} — {text[:220]}")
                    joined = "\n".join(snippets)
                    try:
                        extracted = await self._stream_json(
                            session, loop,
                            [
                                {"role": "system", "content": EXTRACT_SYS},
                                {"role": "user", "content": f"TOPIC: {session.goal}\nSOURCES:\n{joined}"},
                            ],
                        )
                        new_facts = extracted.get("facts", []) if isinstance(extracted, dict) else []
                        new_entities = extracted.get("entities", []) if isinstance(extracted, dict) else []
                        gaps = extracted.get("gaps", []) if isinstance(extracted, dict) else []
                        # attach extracted items into the reasoning tree under a fresh iter node
                        iter_node = {
                            "id": f"research-iter-{iteration}",
                            "label": f"iter {iteration} · {q[:40]}",
                            "kind": "iteration",
                            "children": [],
                        }
                        for f in new_facts:
                            session.knowledge["facts"].append(f)
                            iter_node["children"].append({
                                "id": f"fact-{len(session.knowledge['facts'])}",
                                "label": (f.get("text") or "")[:70],
                                "kind": "fact",
                                "confidence": f.get("confidence"),
                            })
                            await bus.emit(session.id, "FactExtracted", {"fact": f})
                        for ent in new_entities:
                            session.knowledge["entities"].append(ent)
                            iter_node["children"].append({
                                "id": f"ent-{len(session.knowledge['entities'])}",
                                "label": ent.get("label", ""),
                                "kind": "entity",
                                "entity_type": ent.get("type"),
                            })
                            await bus.emit(session.id, "EntityDetected", {"entity": ent})
                        for g in gaps:
                            iter_node["children"].append({
                                "id": f"gap-{len(iter_node['children'])}",
                                "label": g[:80],
                                "kind": "gap",
                            })
                            await bus.emit(session.id, "GapDetected", {"gap": g})
                            if g and len(queries) < 2:
                                queries.append(g[:80])
                        # attach iteration node to research subtree — reuse existing task node
                        # from the planner if it exists, otherwise lazily create one.
                        research_root = None
                        for c in session.reasoning_tree.get("children", []):
                            # prefer an existing planner-emitted task whose kind is search/extract
                            if c.get("kind") in ("search", "extract") and c.get("id") != "verify":
                                research_root = c
                                break
                        if research_root is None:
                            research_root = {"id": "research", "label": "research", "kind": "search", "children": []}
                            session.reasoning_tree.setdefault("children", []).append(research_root)
                        research_root.setdefault("children", []).append(iter_node)
                        await bus.emit(session.id, "ReasoningTreeUpdated", {"tree": session.reasoning_tree})
                    except Exception as e:
                        await bus.emit(session.id, "LoopWarning", {"loop_id": loop.id, "warn": f"extract failed: {str(e)[:120]}"})

                # done condition
                if len(session.knowledge["facts"]) >= 12 or not queries:
                    break

            loop.result = {
                "sources": len(session.knowledge["sources"]),
                "facts": len(session.knowledge["facts"]),
                "entities": len(session.knowledge["entities"]),
            }
            await self.db.knowledge.update_one(
                {"session_id": session.id},
                {"$set": {"knowledge": session.knowledge, "session_id": session.id}},
                upsert=True,
            )
            await bus.emit(session.id, "ResearchFinished", {"loop_id": loop.id, **loop.result})
        return self._launch(loop, go())

    # -- verification --

    async def run_verification(self, session: Session) -> Loop:
        loop = Loop(session.id, "verification", "Cross-checking facts against sources")
        session.loops[loop.id] = loop
        await bus.emit(session.id, "LoopStarted", {"loop_id": loop.id, "kind": "verification", "title": loop.title})

        async def go():
            facts = session.knowledge.get("facts", [])[:10]
            avg = 0.0
            n = 0
            verify_node = {"id": "verify", "label": "verification", "kind": "verify", "children": []}
            session.reasoning_tree.setdefault("children", []).append(verify_node)
            for i, f in enumerate(facts):
                await loop._checkpoint()
                loop.iterations = i + 1
                await bus.emit(session.id, "VerificationStarted", {"loop_id": loop.id, "fact": f.get("text", "")[:120]})
                supporting = [s for s in session.knowledge["sources"] if isinstance(s, dict)]
                snippets = [f"[{j}] {s.get('title','')}: {(s.get('abstract') or s.get('description') or '')[:200]}" for j, s in enumerate(supporting[:6])]
                try:
                    result = await self._stream_json(
                        session, loop,
                        [
                            {"role": "system", "content": VERIFIER_SYS},
                            {"role": "user", "content": f"CLAIM: {f.get('text','')}\nSOURCES:\n{chr(10).join(snippets)}"},
                        ],
                    )
                    conf = int(result.get("confidence", 40))
                    verdict = result.get("verdict", "unclear")
                    f["verified_confidence"] = conf
                    f["verdict"] = verdict
                    avg = (avg * n + conf) / (n + 1)
                    n += 1
                    session.confidence_history.append({"fact": f.get("text", "")[:100], "confidence": conf, "ts": now_iso()})
                    verify_node["children"].append({
                        "id": f"vf-{i}",
                        "label": f.get("text", "")[:80],
                        "kind": "fact",
                        "confidence": conf,
                        "verdict": verdict,
                    })
                    await bus.emit(session.id, "ConfidenceChanged", {"fact": f.get("text","")[:120], "confidence": conf, "verdict": verdict})
                    await bus.emit(session.id, "ReasoningTreeUpdated", {"tree": session.reasoning_tree})
                except Exception as e:
                    await bus.emit(session.id, "LoopWarning", {"loop_id": loop.id, "warn": f"verify failed: {str(e)[:120]}"})
            loop.result = {"average_confidence": round(avg, 1), "verified": n}
            await bus.emit(session.id, "VerificationFinished", {"loop_id": loop.id, **loop.result})
            await self.db.knowledge.update_one(
                {"session_id": session.id},
                {"$set": {"knowledge": session.knowledge}},
                upsert=True,
            )
            # Archive verified knowledge to global memory
            try:
                n_arch = await mem.archive_session(self.db, session.id, session.goal, facts, session.knowledge.get("entities", []))
                if n_arch:
                    await bus.emit(session.id, "MemoryArchived", {"count": n_arch})
            except Exception as e:
                await bus.emit(session.id, "LoopWarning", {"loop_id": loop.id, "warn": f"archive failed: {str(e)[:120]}"})
        return self._launch(loop, go())

    # -- skill builder --

    async def run_skill_builder(self, session: Session) -> Loop:
        loop = Loop(session.id, "skill_builder", "Compiling verified research into portable skill")
        session.loops[loop.id] = loop
        await bus.emit(session.id, "LoopStarted", {"loop_id": loop.id, "kind": "skill_builder", "title": loop.title})

        async def go():
            await loop._checkpoint()
            facts = [f for f in session.knowledge.get("facts", []) if f.get("verified_confidence", 0) >= 40][:8]
            entities = session.knowledge.get("entities", [])[:8]
            ctx = json.dumps({"goal": session.goal, "facts": facts, "entities": entities}, ensure_ascii=False)
            try:
                skill = await self.client.chat_json(
                    [
                        {"role": "system", "content": SKILL_SYS},
                        {"role": "user", "content": ctx},
                    ],
                    model=session.model,
                )
            except Exception as e:
                skill = {
                    "name": "research-skill",
                    "purpose": session.goal,
                    "system_prompt": f"Research assistant specialized in: {session.goal}",
                    "workflow": ["gather sources", "extract facts", "verify", "synthesize"],
                    "tool_requirements": ["web-search"],
                    "recommended_models": [session.model],
                    "version": "1.0.0",
                    "_fallback_error": str(e)[:180],
                }
            skill["id"] = f"skill_{uuid.uuid4().hex[:10]}"
            skill["session_id"] = session.id
            skill["created_at"] = now_iso()
            await self.db.skills.insert_one(dict(skill))
            loop.result = skill
            await bus.emit(session.id, "SkillGenerated", {"skill": skill})
        return self._launch(loop, go())

    # -- controls --

    def _find_loop(self, session_id: str, loop_id: str) -> Optional[Loop]:
        s = self.sessions.get(session_id)
        if not s:
            return None
        return s.loops.get(loop_id)

    async def pause_loop(self, session_id: str, loop_id: str) -> bool:
        l = self._find_loop(session_id, loop_id)
        if l:
            l.pause()
            return True
        return False

    async def resume_loop(self, session_id: str, loop_id: str) -> bool:
        l = self._find_loop(session_id, loop_id)
        if l:
            l.resume()
            return True
        return False

    async def cancel_loop(self, session_id: str, loop_id: str) -> bool:
        l = self._find_loop(session_id, loop_id)
        if l:
            l.cancel()
            return True
        return False

    async def inject(self, session_id: str, loop_id: str, instruction: str) -> bool:
        l = self._find_loop(session_id, loop_id)
        if l:
            l.inject(instruction)
            await bus.emit(session_id, "UserInjection", {"loop_id": loop_id, "instruction": instruction})
            return True
        return False

    async def branch_session(self, source_sid: str, new_goal: Optional[str] = None) -> Optional[Session]:
        src = self.sessions.get(source_sid) or await self.load_session(source_sid)
        if not src:
            return None
        goal = new_goal or src.goal
        new = await self.create_session(goal, model=src.model)
        # copy knowledge as seed
        new.knowledge = json.loads(json.dumps(src.knowledge))
        await bus.emit(new.id, "SessionBranched", {"parent": source_sid, "goal": goal})
        return new
