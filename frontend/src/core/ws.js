// frontend/src/core/ws.js (FINAL) — WS dinâmico com backoff exponencial + jitter, keepalive e robustez de URL
// Requisitos: reconexão automática (A), integração com flags, compatível Vite/CRA, URL correta a partir do BACKEND_URL

import { getFlags } from "./flags";

// === Base URL detection (Vite ou CRA) ===
function getBackendBase() {
  // Vite
  const vite = (typeof import.meta !== 'undefined' && import.meta && import.meta.env && import.meta.env.VITE_BACKEND_URL) ? String(import.meta.env.VITE_BACKEND_URL) : '';
  // CRA
  const cra = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_URL) ? String(process.env.REACT_APP_BACKEND_URL) : '';
  // window override (útil em debug)
  const win = (typeof window !== 'undefined' && window.__TARS_FLAGS__ && window.__TARS_FLAGS__.BACKEND_URL) ? String(window.__TARS_FLAGS__.BACKEND_URL) : '';
  const base = (win || vite || cra || '').trim();
  return base.replace(/\/$/, '');
}

export function makeWsUrl() {
  const base = getBackendBase();
  try {
    if (!base) return `/api/events/ws`;
    const u = new URL(base);
    const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${u.host}/api/events/ws`;
  } catch {
    if (base.startsWith('https')) return base.replace('https', 'wss') + '/api/events/ws';
    if (base.startsWith('http')) return base.replace('http', 'ws') + '/api/events/ws';
    return `/api/events/ws`;
  }
}

export function createRealtime({ onOpen, onClose, onError, onLog, onState }) {
  const flags = getFlags();
  if (flags.WS_DISABLED) {
    onState && onState('disabled');
    return { stop: () => {}, isActive: () => false };
  }

  let ws = null;
  let stopped = false;
  let backoff = 500; // ms
  const backoffMax = 10000; // 10s
  const url = makeWsUrl();
  let pingTimer = null;
  let online = true;

  function scheduleReconnect() {
    if (stopped || !online) return;
    const jitter = Math.floor(Math.random() * 200);
    setTimeout(connect, backoff + jitter);
    backoff = Math.min(backoff * 2, backoffMax);
  }

  function clearPing() { if (pingTimer) { clearInterval(pingTimer); pingTimer = null; } }

  function connect() {
    if (stopped) return;
    try {
      ws = new WebSocket(url);
      ws.onopen = () => {
        backoff = 500;
        onState && onState('open');
        onOpen && onOpen();
        try { ws.send('ping'); } catch {}
        clearPing();
        // keepalive de 25s (evita timeouts de proxy)
        pingTimer = setInterval(() => { try { ws && ws.readyState === 1 && ws.send('ping'); } catch {} }, 25000);
      };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg?.type === 'log' && msg?.item) onLog && onLog(msg.item);
        } catch { /* ignore frames não-JSON (pong, etc.) */ }
      };
      ws.onerror = (e) => { onError && onError(e); };
      ws.onclose = () => {
        clearPing();
        onClose && onClose();
        onState && onState('closed');
        if (stopped) return;
        scheduleReconnect();
      };
    } catch (e) {
      onError && onError(e);
      scheduleReconnect();
    }
  }

  // Ouvir mudanças de rede para suspender reconexões inúteis
  const onOffline = () => { online = false; onState && onState('offline'); };
  const onOnline  = () => { online = true; onState && onState('online'); scheduleReconnect(); };
  try { window.addEventListener('offline', onOffline); window.addEventListener('online', onOnline); } catch {}

  connect();

  return {
    stop: () => {
      stopped = true;
      clearPing();
      try { window.removeEventListener('offline', onOffline); window.removeEventListener('online', onOnline); } catch {}
      try { ws && ws.close(); } catch {}
    },
    isActive: () => !!ws && ws.readyState === 1,
  };
}
