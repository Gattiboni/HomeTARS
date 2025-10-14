// Phase 2..10 API client — uses REACT_APP_BACKEND_URL (do not hardcode)
import { getFlags } from "./flags";

const BASE = (
  process.env.REACT_APP_BACKEND_URL ||
  (typeof import !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL)) ||
  ''
).replace(/\/$/, '');
const API = `${BASE}/api`;

async function httpGet(path) {
  const res = await fetch(`${API}${path}`, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
  return res.json();
}

async function httpPost(path, body) {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body || {}) });
  if (!res.ok) throw new Error(`POST ${path} ${res.status}`);
  return res.json();
}

export const api = {
  status: () => httpGet('/status'),
  logs: (params = {}) => {
    const q = new URLSearchParams();
    if (params.limit) q.set('limit', String(params.limit));
    if (params.since) q.set('since', params.since);
    if (params.level) q.set('level', params.level);
    const qs = q.toString();
    return httpGet(`/logs${qs ? `?${qs}` : ''}`);
  },
  command: (command) => httpPost('/command', { command }),
  ai: async (prompt, session_id, context) => {
    const flags = getFlags();
    if (flags.AI_DISABLED) {
      return { lines: ["[AI DISABLED] Running in economy mode."], level: 'info' };
    }
    const payload = { prompt };
    if (session_id) payload.session_id = session_id;
    if (context) payload.context = context;
    return httpPost('/ai', payload);
  },
  automationLog: (text, meta) => httpPost('/automation/log', { text, meta }),
  gpt: {
    session: () => httpPost('/gpt/session', {}),
    message: (session_id, prompt, language) => httpPost('/gpt/message', { session_id, prompt, language }),
  }
};