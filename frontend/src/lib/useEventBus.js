import { useEffect, useRef, useState, useCallback } from "react";
import { WS_BASE } from "./api";

/** Connect to /api/ws/{sid} and stream events. Returns { events, connected, replay }. */
export function useEventBus(sessionId) {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;
    setEvents([]);
    const url = `${WS_BASE}/${sessionId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (msg) => {
      try {
        const ev = JSON.parse(msg.data);
        setEvents((prev) => [...prev, ev].slice(-500));
      } catch (e) {}
    };
    return () => { try { ws.close(); } catch(e) {} };
  }, [sessionId]);

  const clear = useCallback(() => setEvents([]), []);
  return { events, connected, clear };
}
