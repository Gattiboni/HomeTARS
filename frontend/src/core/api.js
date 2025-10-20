// frontend/src/core/api.js

// Resolve BASE a partir do .env (CRA e Vite compatível)
let BASE = '';

try {
  // CRA (Create React App)
  if (process.env.REACT_APP_BACKEND_URL) {
    BASE = process.env.REACT_APP_BACKEND_URL;
  }
  // Vite (sem usar import.meta diretamente, pra evitar parse error)
  else if (typeof window !== 'undefined' && window?.__vite_plugin_env__) {
    BASE = window.__vite_plugin_env__.VITE_BACKEND_URL;
  }
} catch {
  BASE = '';
}

// Normaliza sem barra final
BASE = (BASE || '').replace(/\/$/, '');
const API = `${BASE}/api`;

// --- Funções utilitárias ---
export async function httpGet(path) {
  const res = await fetch(`${API}${path}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function httpPost(path, data) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function httpDelete(path) {
  const res = await fetch(`${API}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// --- API principal ---
export const api = {
  status: () => httpGet('/status'),

  reminders: {
    list: () => httpGet('/reminders'),
    create: (data) => httpPost('/reminders', data),
    delete: (id) => httpDelete(`/reminders/${id}`),
  },

  automations: {
    list: () => httpGet('/automations'),
    trigger: (id) => httpPost(`/automations/${id}/trigger`),
  },

  ha: {
    entities: () => httpGet('/integrations/ha/entities'),
    service: (domain, service, entity_id, data = {}) =>
      httpPost('/integrations/ha/service', { domain, service, entity_id, data }),
  },

  voice: {
    transcribe: (blob) => {
      const formData = new FormData();
      formData.append('file', blob, 'audio.wav');
      return fetch(`${API}/voice/transcribe`, { method: 'POST', body: formData });
    },
    tts: (text) => httpPost('/voice/tts', { text }),
  },
};
