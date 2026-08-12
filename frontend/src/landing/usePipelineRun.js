import { useCallback, useEffect, useRef, useState } from "react";
import { platform, FALLBACK_STAGES } from "../lib/platform";

/*
 * Drives the live pipeline view. Talks to the backend over SSE
 * (docs/backend-api.md) and falls back to a local simulation of the
 * same six-stage choreography when the API is unreachable, so the
 * centerpiece always works.
 */
export default function usePipelineRun() {
  const [stageMap, setStageMap] = useState(FALLBACK_STAGES);
  const [apiOnline, setApiOnline] = useState(null);
  const [runState, setRunState] = useState("idle"); // idle | starting | running | completed | canceled
  const [stages, setStages] = useState(() =>
    FALLBACK_STAGES.stages.map((s) => ({ ...s, state: "pending", percent: 0 }))
  );
  const [runId, setRunId] = useState(null);
  const [eventCount, setEventCount] = useState(0);
  const [lastEvent, setLastEvent] = useState(null);

  const esRef = useRef(null);
  const wsRef = useRef(null);
  const simTimersRef = useRef([]);

  const stopTransports = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    simTimersRef.current.forEach(clearTimeout);
    simTimersRef.current = [];
  }, []);

  useEffect(() => {
    let alive = true;
    platform
      .stageMap()
      .then((data) => {
        if (!alive) return;
        setStageMap(data);
        setApiOnline(true);
        setStages(data.stages.map((s) => ({ ...s, state: "pending", percent: 0 })));
      })
      .catch(() => {
        if (alive) setApiOnline(false);
      });
    return () => {
      alive = false;
      stopTransports();
    };
  }, [stopTransports]);

  const applyEvent = useCallback((ev) => {
    if (!ev || !ev.type) return;
    setEventCount((c) => c + 1);
    setLastEvent(ev);
    switch (ev.type) {
      case "PipelineStarted":
        setRunState("running");
        setStages((prev) => prev.map((s) => ({ ...s, state: "pending", percent: 0 })));
        break;
      case "StageStarted": {
        const id = ev.payload?.stage?.id;
        setStages((prev) => prev.map((s) => (s.id === id ? { ...s, state: "active", percent: 4 } : s)));
        break;
      }
      case "StageProgress": {
        const id = ev.payload?.stage?.id;
        const pct = ev.payload?.percent ?? 50;
        setStages((prev) => prev.map((s) => (s.id === id ? { ...s, percent: pct } : s)));
        break;
      }
      case "StageCompleted": {
        const id = ev.payload?.stage?.id;
        setStages((prev) => prev.map((s) => (s.id === id ? { ...s, state: "done", percent: 100 } : s)));
        break;
      }
      case "PipelineCompleted":
        setRunState("completed");
        setStages((prev) => prev.map((s) => ({ ...s, state: "done", percent: 100 })));
        break;
      case "PipelineCanceled":
        setRunState("canceled");
        break;
      default:
        break;
    }
  }, []);

  const resetTrack = useCallback(() => {
    setStages((prev) => prev.map((s) => ({ ...s, state: "pending", percent: 0 })));
    setEventCount(0);
    setLastEvent(null);
  }, []);

  const simulate = useCallback(() => {
    const defs = stageMap.stages;
    resetTrack();
    setRunState("running");
    setEventCount((c) => c + 1);
    let cursor = 200;
    defs.forEach((stage, i) => {
      const startedAt = cursor;
      simTimersRef.current.push(
        window.setTimeout(() => {
          setStages((prev) => prev.map((s) => (s.id === stage.id ? { ...s, state: "active", percent: 4 } : s)));
          setEventCount((c) => c + 1);
        }, startedAt)
      );
      simTimersRef.current.push(
        window.setTimeout(() => {
          setStages((prev) => prev.map((s) => (s.id === stage.id ? { ...s, percent: 50 } : s)));
          setEventCount((c) => c + 1);
        }, startedAt + stage.duration_ms * 0.5)
      );
      simTimersRef.current.push(
        window.setTimeout(() => {
          setStages((prev) => prev.map((s) => (s.id === stage.id ? { ...s, state: "done", percent: 100 } : s)));
          setEventCount((c) => c + 1);
          if (i === defs.length - 1) setRunState("completed");
        }, startedAt + stage.duration_ms)
      );
      cursor += stage.duration_ms + 120;
    });
  }, [stageMap, resetTrack]);

  const subscribe = useCallback(
    (id) => {
      if (typeof EventSource !== "undefined") {
        const es = new EventSource(platform.streamUrl(id));
        esRef.current = es;
        es.onmessage = (msg) => {
          try {
            const ev = JSON.parse(msg.data);
            applyEvent(ev);
            if (ev.type === "PipelineCompleted" || ev.type === "PipelineCanceled") {
              es.close();
              esRef.current = null;
            }
          } catch {
            /* ignore malformed frames */
          }
        };
        es.onerror = () => {
          es.close();
          esRef.current = null;
        };
        return;
      }
      const ws = new WebSocket(platform.wsUrl(id));
      wsRef.current = ws;
      ws.onmessage = (msg) => {
        try {
          const ev = JSON.parse(msg.data);
          applyEvent(ev);
          if (ev.type === "PipelineCompleted" || ev.type === "PipelineCanceled") ws.close();
        } catch {
          /* ignore malformed frames */
        }
      };
    },
    [applyEvent]
  );

  const start = useCallback(async () => {
    if (runState === "running" || runState === "starting") return;
    stopTransports();
    resetTrack();
    setRunState("starting");
    if (apiOnline) {
      try {
        const data = await platform.startRun(undefined, 1.0);
        setRunId(data.run.id);
        setRunState("running");
        subscribe(data.run.id);
        return;
      } catch {
        setApiOnline(false);
      }
    }
    simulate();
  }, [runState, apiOnline, stopTransports, resetTrack, subscribe, simulate]);

  const cancel = useCallback(async () => {
    if (apiOnline && runId && runState === "running") {
      try {
        await platform.cancelRun(runId);
      } catch {
        /* server replies 404 when the run already ended */
      }
    }
    simTimersRef.current.forEach(clearTimeout);
    simTimersRef.current = [];
    setRunState((s) => (s === "running" || s === "starting" ? "canceled" : s));
  }, [apiOnline, runId, runState]);

  return { stageMap, apiOnline, runState, stages, runId, eventCount, lastEvent, start, cancel };
}
