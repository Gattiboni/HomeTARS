// WebSocket client for Phase 3 (real-time logs)
// - Uses REACT_APP_BACKEND_URL to derive ws URL (no hardcoded hosts/ports)

export function makeWsUrl() {
  const base = process.env.REACT_APP_BACKEND_URL || '';
  try {
    const u = new URL(base);
    const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${u.host}/api/events/ws`;
  } catch (e) {
    // fallback: try replace http -> ws
    if (base.startsWith('https')) return base.replace('https', 'wss') + '/api/events/ws';
    if (base.startsWith('http')) return base.replace('http', 'ws') + '/api/events/ws';
    return `/api/events/ws`;
  }
}

export function createRealtime({ onOpen, onClose, onError, onLog }) {
  let ws = null;
  let stopped = false;
  let backoff = 500; // ms, grows up to 5000

  const url = makeWsUrl();

  const connect = () => {
    if (stopped) return;
    try {
      ws = new WebSocket(url);
      ws.onopen = () => {
        backoff = 500;
        onOpen && onOpen();
        // start a noop ping by sending a small string periodically to keep connection active
        // Note: server expects text, ignores content
        try { ws.send('ping'); } catch (_) {}
      };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg?.type === 'log' && msg?.item) {
            onLog && onLog(msg.item);
          }
        } catch (_) { /* ignore */ }
      };
      ws.onerror = (e) => {
        onError && onError(e);
      };
      ws.onclose = () => {
        onClose && onClose();
        if (stopped) return;
        setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 5000);
      };
    } catch (e) {
      onError && onError(e);
      setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, 5000);
    }
  };

  connect();

  return {
    stop: () => {
      stopped = true;
      try { ws && ws.close(); } catch (_) {}
    },
    isActive: () => !!ws && ws.readyState === 1,
  };
}