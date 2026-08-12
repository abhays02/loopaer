import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
export const API = `${BACKEND}/api`;

// derive websocket base
export const WS_BASE = (() => {
  try {
    const url = new URL(BACKEND);
    const proto = url.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${url.host}/api/ws`;
  } catch {
    return "ws://localhost:8000/api/ws";
  }
})();

const http = axios.create({ baseURL: API, timeout: 60000 });

export const api = {
  listModels: () => http.get("/models").then(r => r.data),
  createSession: (goal, model) => http.post("/sessions", { goal, model }).then(r => r.data),
  listSessions: () => http.get("/sessions").then(r => r.data),
  getSession: (sid) => http.get(`/sessions/${sid}`).then(r => r.data),
  runPlan: (sid) => http.post(`/sessions/${sid}/plan`).then(r => r.data),
  runResearch: (sid) => http.post(`/sessions/${sid}/research`).then(r => r.data),
  runVerify: (sid) => http.post(`/sessions/${sid}/verify`).then(r => r.data),
  runSkill: (sid) => http.post(`/sessions/${sid}/skill`).then(r => r.data),
  runAll: (sid) => http.post(`/sessions/${sid}/run-all`).then(r => r.data),
  pauseLoop: (sid, lid) => http.post(`/sessions/${sid}/loops/${lid}/pause`).then(r => r.data),
  resumeLoop: (sid, lid) => http.post(`/sessions/${sid}/loops/${lid}/resume`).then(r => r.data),
  cancelLoop: (sid, lid) => http.post(`/sessions/${sid}/loops/${lid}/cancel`).then(r => r.data),
  inject: (sid, lid, instruction) => http.post(`/sessions/${sid}/loops/${lid}/inject`, { instruction }).then(r => r.data),
  branch: (sid, goal) => http.post(`/sessions/${sid}/branch`, { goal }).then(r => r.data),
  getEvents: (sid) => http.get(`/sessions/${sid}/events`).then(r => r.data),
  getKnowledge: (sid) => http.get(`/sessions/${sid}/knowledge`).then(r => r.data),
  patchSession: (sid, payload) => http.patch(`/sessions/${sid}`, payload).then(r => r.data),
  createSnapshot: (sid1, sid2, note) => http.post("/diff/snapshot", { sid1, sid2, note }).then(r => r.data),
  getSnapshot: (snapId) => http.get(`/snapshots/${snapId}`).then(r => r.data),
  secretStatus: () => http.get("/secrets/status").then(r => r.data),
  setOpenRouterKey: (api_key) => http.put("/secrets/openrouter", { api_key }).then(r => r.data),
  listSkills: () => http.get("/skills").then(r => r.data),
};
