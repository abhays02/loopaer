const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

export const PLATFORM_API = `${BACKEND}/api/platform`;

export const WS_RUN_BASE = (() => {
  try {
    const url = new URL(BACKEND);
    return `${url.protocol === "https:" ? "wss:" : "ws:"}//${url.host}/api/ws`;
  } catch {
    return "ws://localhost:8000/api/ws";
  }
})();

async function getJson(path) {
  const res = await fetch(`${PLATFORM_API}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`platform ${path} -> ${res.status}`);
  return res.json();
}

export const platform = {
  health: () => getJson("/health"),
  useCases: (fn) => getJson(`/use-cases${fn && fn !== "all" ? `?function=${encodeURIComponent(fn)}` : ""}`),
  connectors: () => getJson("/connectors"),
  pillars: () => getJson("/pillars"),
  outcomes: () => getJson("/outcomes"),
  stageMap: () => getJson("/pipelines/stages"),
  startRun: (scenario, speed = 1.0) =>
    fetch(`${PLATFORM_API}/pipelines/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario, speed }),
    }).then((r) => {
      if (!r.ok) throw new Error(`run start -> ${r.status}`);
      return r.json();
    }),
  cancelRun: (runId) =>
    fetch(`${PLATFORM_API}/pipelines/${runId}/cancel`, { method: "POST" }).then((r) => r.json()),
  streamUrl: (runId) => `${PLATFORM_API}/pipelines/${runId}/stream`,
  wsUrl: (runId) => `${WS_RUN_BASE}/${runId}`,
};

/* ------------------------------------------------------------------ */
/* Offline fallback content — keeps the landing whole when the API is */
/* unreachable. Mirrors the shapes in docs/backend-api.md.            */
/* ------------------------------------------------------------------ */

export const FALLBACK_STAGES = {
  stages: [
    { id: "stage-intake", name: "Intake", description: "The request lands here and is read for intent, urgency, and the systems it touches.", duration_ms: 700 },
    { id: "stage-plan", name: "Plan", description: "The run is broken into ordered steps with owners, checks, and clear exit criteria.", duration_ms: 900 },
    { id: "stage-connect", name: "Connect", description: "Governed links open to the systems involved, reading exactly what the plan allows.", duration_ms: 1000 },
    { id: "stage-reason", name: "Reason", description: "Options are weighed against live data, and a recommended path is chosen with its rationale recorded.", duration_ms: 1200 },
    { id: "stage-verify", name: "Verify", description: "The result is checked against the plan's exit criteria before anything is released.", duration_ms: 900 },
    { id: "stage-deliver", name: "Deliver", description: "The outcome ships with a full event record attached, ready for replay by anyone.", duration_ms: 700 },
  ],
  scenarios: [
    { id: "ops-triage", title: "Clear the overnight operations queue", goal: "Sort, route, and resolve the overnight exception queue before the morning standup." },
  ],
};

export const FALLBACK_PILLARS = {
  pillars: [
    {
      id: "pillar-live-observability",
      title: "Watch the Work Happen",
      tagline: "Every step of every pipeline is visible as it runs.",
      description: "Most automation hides behind a success badge. Loopaer streams each stage as an event you can read, pause, and replay — the same transparency you would get standing behind the operator.",
      proof_points: [
        "stage-by-stage event stream over websocket and SSE",
        "full event replay for anyone joining late",
        "pausable and cancelable runs, not fire-and-forget jobs",
      ],
    },
    {
      id: "pillar-governed-connections",
      title: "Connections With Guardrails",
      tagline: "Every system link is declared, scoped, and auditable.",
      description: "Agents only touch what the plan says they may touch. Connectors carry explicit access levels, so a demo reading orders can never be mistaken for a write to production.",
      proof_points: [
        "connector catalog with declared access levels",
        "per-run scope instead of standing credentials",
        "an event record that names every system touched",
      ],
    },
    {
      id: "pillar-verification-first",
      title: "Verified Before It Ships",
      tagline: "Verification is a stage, not a hope.",
      description: "Every run walks through a dedicated verification stage with exit criteria set at planning time. If the check fails, the run says so plainly instead of failing quietly downstream.",
      proof_points: [
        "exit criteria defined during planning",
        "a dedicated verify stage in every pipeline",
        "clear terminal states: completed or canceled",
      ],
    },
    {
      id: "pillar-human-pace",
      title: "Built for Human Pace",
      tagline: "Fast enough to matter, legible enough to trust.",
      description: "Transformation stalls when teams cannot follow what changed and why. Loopaer keeps runs at a pace people can watch, and leaves a record written for people rather than auditors.",
      proof_points: [
        "runs narrated in plain language",
        "replay joins a finished run from the top",
        "cancellation is one deliberate action",
      ],
    },
  ],
};

export const FALLBACK_USE_CASES = {
  functions: ["operations", "support", "engineering", "finance"],
  use_cases: [
    {
      id: "uc-ops-triage",
      title: "Operations Triage, Without the Queue",
      function: "operations",
      summary: "Route exceptions, alerts, and manual handoffs into a single governed flow.",
      narrative: "Most operations teams lose their mornings to the same ritual: reading the overnight queue by hand and deciding, item by item, what matters. Loopaer takes that intake, plans a route for each exception, and hands people only the decisions that genuinely need them.",
      signals: ["incident streams", "runbook references", "escalation history"],
      time_to_value: "weeks",
    },
    {
      id: "uc-support-deflection",
      title: "Support That Resolves, Not Just Responds",
      function: "support",
      summary: "Close routine tickets end-to-end while surfacing the ones that need a person.",
      narrative: "Tier-one support is full of questions with answers already living somewhere in the estate. Loopaer connects the ticket to those sources, drafts the resolution, and verifies it against policy before it reaches the customer.",
      signals: ["ticket history", "knowledge bases", "policy documents"],
      time_to_value: "weeks",
    },
    {
      id: "uc-eng-review",
      title: "Reviews That Keep Up With the Codebase",
      function: "engineering",
      summary: "Give every change a first-pass review that never gets tired.",
      narrative: "Review queues grow quietly until they become the bottleneck. A Loopaer pipeline reads each change against the team's conventions and history, flags what deserves eyes, and leaves a written rationale for the rest.",
      signals: ["repository history", "convention notes", "test outcomes"],
      time_to_value: "weeks",
    },
    {
      id: "uc-finance-close",
      title: "The Quiet Parts of the Close",
      function: "finance",
      summary: "Reconcile, chase, and annotate the recurring work around month-end.",
      narrative: "Month-end close is a pipeline already — it just runs on spreadsheets and memory. Loopaer walks the same stages with an audit trail attached, and flags the reconciliations that refuse to balance.",
      signals: ["ledger exports", "reconciliation rules", "approval chains"],
      time_to_value: "weeks",
    },
    {
      id: "uc-ops-capacity",
      title: "Capacity Calls From Live Data",
      function: "operations",
      summary: "Turn scattered utilization signals into a reasoned staffing picture.",
      narrative: "Capacity planning usually means exporting six systems into one spreadsheet. Loopaer connects those systems directly, reasons across them on a schedule, and delivers a recommendation with the evidence attached.",
      signals: ["utilization feeds", "shift schedules", "demand history"],
      time_to_value: "weeks",
    },
    {
      id: "uc-eng-onboarding",
      title: "Onboarding That Reads the Room",
      function: "engineering",
      summary: "Give new engineers a guided path through code, conventions, and history.",
      narrative: "New hires spend weeks assembling context from chats, docs, and tribal knowledge. A guided Loopaer run gathers that context and answers questions against it, with every source cited.",
      signals: ["repository maps", "decision logs", "documentation"],
      time_to_value: "weeks",
    },
  ],
};

export const FALLBACK_CONNECTORS = {
  connectors: [
    { id: "cn-atlas-erp", name: "Atlas ERP", category: "planning and resources", description: "Reads orders, inventory positions, and approval chains from the Atlas planning suite.", access: "read-only in demo", latency_class: "batch" },
    { id: "cn-meridian-crm", name: "Meridian CRM", category: "customer records", description: "Pulls account context and open cases from the Meridian customer record system.", access: "read-only in demo", latency_class: "live" },
    { id: "cn-helix-itsm", name: "Helix ITSM", category: "service management", description: "Subscribes to incident streams and runbook references from Helix service management.", access: "read-only in demo", latency_class: "live" },
    { id: "cn-vault-ledger", name: "Vault Ledger", category: "finance core", description: "Reads ledger exports and reconciliation states from the Vault finance core.", access: "read-only in demo", latency_class: "batch" },
    { id: "cn-quarry-repo", name: "Quarry Repo", category: "engineering estate", description: "Walks repository history, conventions, and test outcomes across the Quarry estate.", access: "read-only in demo", latency_class: "live" },
    { id: "cn-relay-mail", name: "Relay Mail", category: "communication", description: "Reads shared inboxes and digests routed through the Relay mail gateway.", access: "read-only in demo", latency_class: "batch" },
  ],
};

export const FALLBACK_OUTCOMES = {
  outcomes: {
    framing: "The figures below are demonstration values, invented for this experience. They describe the shape of a guided transformation, not a measured deployment.",
    headline: "What a guided transformation tends to feel like",
    metrics: [
      { id: "om-triage-time", label: "Morning triage time", baseline: 95, current: 28, unit: "minutes", direction: "down", note: "Time a shift lead spends sorting the overnight queue." },
      { id: "om-handoffs", label: "Manual handoffs per run", baseline: 6, current: 1, unit: "handoffs", direction: "down", note: "How often a run stops to ask a person to move it along." },
      { id: "om-visibility", label: "Of each run visible as it happens", baseline: 20, current: 100, unit: "percent", direction: "up", note: "Share of pipeline steps observable in the live event stream." },
      { id: "om-replay", label: "Time to bring a late joiner up to speed", baseline: 40, current: 5, unit: "minutes", direction: "down", note: "From walking in to understanding the run, using event replay." },
    ],
  },
};

export const FALLBACK_HEALTH = {
  service: "loopaer-command-center",
  storage: "offline",
  engine: "simulated",
};
