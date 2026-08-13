"""Command center content and the orchestration pipeline demo engine.

This module powers the public face of the Enterprise AI Transformation
Platform. It serves two purposes:

1. Content catalogs — the use-case library, the mocked enterprise connector
   catalog, the differentiation pillars, and the outcomes demo data. Every
   word and every number here is original, invented-for-demo material.
   Nothing is borrowed from any other product or vendor.

2. Pipeline demo engine — a scripted orchestration run that walks through a
   fixed set of stages and emits lifecycle events on the shared event bus.
   The frontend listens on the existing websocket route or the SSE route and
   animates the flow as events arrive.

The engine keeps its state in memory, so the whole experience works even
when MongoDB is unreachable. When a database is attached, events are
persisted by the bus exactly like any other session event.
"""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from eventbus import bus


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Use-case library
# ---------------------------------------------------------------------------

USE_CASES: List[Dict[str, Any]] = [
    {
        "id": "uc-ops-triage",
        "title": "Operations Triage, Without the Queue",
        "function": "operations",
        "summary": "Route exceptions, alerts, and manual handoffs into a single governed flow.",
        "narrative": (
            "Most operations teams lose their mornings to the same ritual: sorting "
            "what is urgent from what merely looks urgent. The command center watches "
            "the same signals, groups related incidents, and hands your team a short, "
            "ordered list with the context already attached."
        ),
        "signals": ["incident streams", "runbook references", "escalation history"],
        "time_to_value": "weeks",
    },
    {
        "id": "uc-support-copilot",
        "title": "A Support Copilot That Cites Its Work",
        "function": "support",
        "summary": "Draft answers grounded in your knowledge base, with sources shown side by side.",
        "narrative": (
            "Support agents do not need a black box that guesses. They need a colleague "
            "that reads the knowledge base, drafts a reply, and points at the exact "
            "passages it relied on. The human stays in charge of tone, judgment, and the "
            "final send."
        ),
        "signals": ["knowledge articles", "past resolutions", "customer context"],
        "time_to_value": "weeks",
    },
    {
        "id": "uc-eng-review",
        "title": "Engineering Review, Prepared Before the Meeting",
        "function": "engineering",
        "summary": "Summarize change history and open risks so reviews start from shared context.",
        "narrative": (
            "The best engineering reviews start with everyone looking at the same picture. "
            "The platform gathers recent changes, open findings, and known risks into one "
            "brief, so the meeting spends its time deciding instead of catching up."
        ),
        "signals": ["change logs", "review comments", "risk registers"],
        "time_to_value": "weeks",
    },
    {
        "id": "uc-finance-close",
        "title": "A Calmer Month-End Close",
        "function": "finance",
        "summary": "Reconcile recurring anomalies and surface explanations before the close checklist runs.",
        "narrative": (
            "Month-end close is where small anomalies become expensive surprises. A "
            "guided pipeline can walk the reconciliation steps, flag what drifted, and "
            "write up the explanation while the ledger team focuses on the calls that "
            "need a human signature."
        ),
        "signals": ["ledger exports", "variance history", "approval trails"],
        "time_to_value": "months",
    },
    {
        "id": "uc-knowledge-refresh",
        "title": "Knowledge That Stays Current",
        "function": "operations",
        "summary": "Detect when internal documentation drifts from what teams actually do.",
        "narrative": (
            "Documentation rots quietly. By comparing written procedures against the "
            "traces of real work, the platform points at the pages that have drifted, "
            "and drafts the update for the owner to approve."
        ),
        "signals": ["procedure pages", "work traces", "change tickets"],
        "time_to_value": "weeks",
    },
    {
        "id": "uc-onboarding-path",
        "title": "Onboarding Paths That Adapt",
        "function": "support",
        "summary": "Build a guided path for each new hire from the questions they actually ask.",
        "narrative": (
            "Every new hire asks a slightly different set of first questions. Instead of "
            "one static checklist, the platform assembles a path from the answers that "
            "helped people in similar roles, and adjusts it as the newcomer progresses."
        ),
        "signals": ["question history", "role profiles", "mentor notes"],
        "time_to_value": "months",
    },
]

USE_CASE_FUNCTIONS = ["operations", "support", "engineering", "finance"]


# ---------------------------------------------------------------------------
# Connector catalog (mocked enterprise connectors)
# ---------------------------------------------------------------------------

CONNECTORS: List[Dict[str, Any]] = [
    {
        "id": "cn-atlas-erp",
        "name": "Atlas ERP",
        "category": "planning and resources",
        "description": "Reads orders, inventory positions, and approval chains from the Atlas planning suite.",
        "access": "read-only in demo",
        "latency_class": "batch",
    },
    {
        "id": "cn-beacon-crm",
        "name": "Beacon CRM",
        "category": "customer relationships",
        "description": "Pulls account timelines and open opportunities so pipelines carry real context.",
        "access": "read-only in demo",
        "latency_class": "near-real-time",
    },
    {
        "id": "cn-ledgerline",
        "name": "Ledgerline Finance",
        "category": "finance",
        "description": "Streams ledger extracts and variance notes for reconciliation workflows.",
        "access": "read-only in demo",
        "latency_class": "batch",
    },
    {
        "id": "cn-relay-desk",
        "name": "Relay Service Desk",
        "category": "support",
        "description": "Follows tickets and handoffs across support queues without duplicating them.",
        "access": "read-only in demo",
        "latency_class": "near-real-time",
    },
    {
        "id": "cn-meridian-docs",
        "name": "Meridian Documents",
        "category": "knowledge",
        "description": "Indexes procedures and briefs so every answer can point at its source.",
        "access": "read-only in demo",
        "latency_class": "indexed",
    },
    {
        "id": "cn-forge-ci",
        "name": "Forge Delivery",
        "category": "engineering",
        "description": "Tracks change sets and release trains so reviews open with the current picture.",
        "access": "read-only in demo",
        "latency_class": "near-real-time",
    },
]


# ---------------------------------------------------------------------------
# Differentiation pillars
# ---------------------------------------------------------------------------

PILLARS: List[Dict[str, Any]] = [
    {
        "id": "pillar-live-observability",
        "title": "Watch the Work Happen",
        "tagline": "Every step of every pipeline is visible as it runs.",
        "description": (
            "Most automation hides behind a success badge. The command center streams "
            "each stage of a run — what it read, what it decided, what it handed off — "
            "so your team trusts what it can see."
        ),
        "proof_points": [
            "stage-by-stage event stream over websocket and SSE",
            "full event replay for anyone joining late",
            "pausable and cancelable runs, not fire-and-forget jobs",
        ],
    },
    {
        "id": "pillar-governed-memory",
        "title": "Memory With a Paper Trail",
        "tagline": "What the platform remembers, your people approved.",
        "description": (
            "Long-running systems accumulate memory; few can explain it. Here, memories "
            "carry their evidence, their recall is auditable, and nothing is kept that "
            "the owners have not sanctioned."
        ),
        "proof_points": [
            "evidence-anchored memory entries",
            "recall you can query and review",
            "retention controlled by the team, not by defaults",
        ],
    },
    {
        "id": "pillar-human-in-the-loop",
        "title": "Humans Hold the Controls",
        "tagline": "Inject, pause, resume, or branch any run at any moment.",
        "description": (
            "Autonomy is useful only while it stays steerable. Operators can steer a live "
            "run with a new instruction, hold it for review, or fork it into an experiment — "
            "without restarting from zero."
        ),
        "proof_points": [
            "live instruction injection into running loops",
            "pause and resume with state intact",
            "branching a session into parallel explorations",
        ],
    },
    {
        "id": "pillar-measured-outcomes",
        "title": "Outcomes You Can Stand Behind",
        "tagline": "First-party numbers, gathered from your own runs.",
        "description": (
            "We would rather show you honest demo figures and your own early measurements "
            "than borrow impressive numbers from somewhere else. Outcomes are tracked from "
            "the first pilot week, in your vocabulary, against your baseline."
        ),
        "proof_points": [
            "baseline captured before the first automation ships",
            "metrics defined with the team that owns them",
            "no vendor benchmarks passed off as results",
        ],
    },
]


# ---------------------------------------------------------------------------
# Outcomes demo data — invented for this demo only
# ---------------------------------------------------------------------------

OUTCOMES: Dict[str, Any] = {
    "framing": (
        "The figures below are demonstration values, invented for this experience. "
        "They exist to show how outcomes are tracked, not to describe any real deployment."
    ),
    "headline": "What a guided transformation tends to feel like",
    "metrics": [
        {
            "id": "om-triage-time",
            "label": "Morning triage time",
            "baseline": 95,
            "current": 28,
            "unit": "minutes",
            "direction": "down",
            "note": "Time a shift lead spends sorting the overnight queue.",
        },
        {
            "id": "om-draft-acceptance",
            "label": "Draft answers accepted with light edits",
            "baseline": 0,
            "current": 72,
            "unit": "percent",
            "direction": "up",
            "note": "Share of copilot drafts agents keep after a quick pass.",
        },
        {
            "id": "om-review-prep",
            "label": "Review meetings starting on time",
            "baseline": 41,
            "current": 83,
            "unit": "percent",
            "direction": "up",
            "note": "Meetings that open with shared context already prepared.",
        },
        {
            "id": "om-close-surprises",
            "label": "Unexplained variances at close",
            "baseline": 12,
            "current": 3,
            "unit": "per month",
            "direction": "down",
            "note": "Variances that reach the close checklist without an explanation.",
        },
    ],
}


# ---------------------------------------------------------------------------
# Pipeline demo engine
# ---------------------------------------------------------------------------

PIPELINE_STAGES: List[Dict[str, Any]] = [
    {
        "id": "stage-intake",
        "name": "Intake",
        "description": "The request arrives and the platform frames the goal in plain language.",
        "duration_ms": 700,
    },
    {
        "id": "stage-plan",
        "name": "Plan",
        "description": "A short plan is drafted: the steps, the order, and what success looks like.",
        "duration_ms": 900,
    },
    {
        "id": "stage-connect",
        "name": "Connect",
        "description": "The right connectors open, and the pipeline gathers the context it needs.",
        "duration_ms": 1000,
    },
    {
        "id": "stage-reason",
        "name": "Reason",
        "description": "Working sessions run against the gathered context, step by step.",
        "duration_ms": 1200,
    },
    {
        "id": "stage-verify",
        "name": "Verify",
        "description": "Claims are checked against their sources before anything ships.",
        "duration_ms": 900,
    },
    {
        "id": "stage-deliver",
        "name": "Deliver",
        "description": "The result is packaged, the trail is stored, and the team is notified.",
        "duration_ms": 700,
    },
]


SCENARIOS: Dict[str, Dict[str, str]] = {
    "ops-triage": {
        "id": "ops-triage",
        "title": "Clear the overnight operations queue",
        "goal": "Sort last night's alerts, group the related ones, and brief the morning shift.",
    },
    "support-brief": {
        "id": "support-brief",
        "title": "Prepare a grounded support answer",
        "goal": "Draft a reply to a recurring question using only the knowledge base as evidence.",
    },
    "close-readiness": {
        "id": "close-readiness",
        "title": "Check month-end close readiness",
        "goal": "Walk the reconciliation steps and explain every variance before the checklist runs.",
    },
}


class PipelineEngine:
    """Runs scripted orchestration demos and narrates them over the event bus.

    Each run is keyed by its own id, so the existing websocket route
    (/api/ws/{run_id}) streams the events with no protocol changes. The
    engine also keeps a full in-memory event log per run for replay.
    """

    def __init__(self) -> None:
        self._runs: Dict[str, Dict[str, Any]] = {}
        self._tasks: Dict[str, asyncio.Task] = {}

    def start(self, scenario_id: str = "ops-triage", speed: float = 1.0) -> Dict[str, Any]:
        """Start a run synchronously; the stage walk happens in a background task."""
        scenario = SCENARIOS.get(scenario_id, SCENARIOS["ops-triage"])
        run_id = f"run_{uuid.uuid4().hex[:10]}"
        run = {
            "id": run_id,
            "scenario": scenario,
            "state": "running",
            "current_stage": None,
            "stages": [
                {"id": s["id"], "name": s["name"], "description": s["description"], "state": "pending"}
                for s in PIPELINE_STAGES
            ],
            "started_at": now_iso(),
            "finished_at": None,
        }
        self._runs[run_id] = run
        speed = max(0.1, min(float(speed), 5.0))
        task = asyncio.create_task(self._walk(run, speed))
        self._tasks[run_id] = task
        task.add_done_callback(lambda _t: self._tasks.pop(run_id, None))
        return run

    def get(self, run_id: str) -> Optional[Dict[str, Any]]:
        return self._runs.get(run_id)

    def events(self, run_id: str) -> List[Dict[str, Any]]:
        return bus.history(run_id)

    async def _walk(self, run: Dict[str, Any], speed: float) -> None:
        run_id = run["id"]
        await bus.emit(run_id, "PipelineStarted", {
            "scenario": run["scenario"],
            "stage_count": len(run["stages"]),
        })
        try:
            for stage in run["stages"]:
                run["current_stage"] = stage["id"]
                stage["state"] = "active"
                await bus.emit(run_id, "StageStarted", {"stage": stage})
                stage_def = next(s for s in PIPELINE_STAGES if s["id"] == stage["id"])
                wait = stage_def["duration_ms"] / 1000.0 / speed
                await asyncio.sleep(wait / 2)
                await bus.emit(run_id, "StageProgress", {
                    "stage": {"id": stage["id"], "name": stage["name"]},
                    "percent": 50,
                })
                await asyncio.sleep(wait / 2)
                stage["state"] = "done"
                await bus.emit(run_id, "StageCompleted", {"stage": stage})
            run["state"] = "completed"
            run["finished_at"] = now_iso()
            run["current_stage"] = None
            await bus.emit(run_id, "PipelineCompleted", {
                "stages_completed": len(run["stages"]),
                "finished_at": run["finished_at"],
            })
        except asyncio.CancelledError:
            run["state"] = "canceled"
            run["finished_at"] = now_iso()
            await bus.emit(run_id, "PipelineCanceled", {})
            raise

    def cancel(self, run_id: str) -> bool:
        task = self._tasks.get(run_id)
        run = self._runs.get(run_id)
        if not run or run["state"] != "running":
            return False
        if task:
            task.cancel()
        else:
            run["state"] = "canceled"
        return True


engine = PipelineEngine()
