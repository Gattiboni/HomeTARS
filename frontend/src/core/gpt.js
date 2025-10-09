const KEY = 'tars_gpt_session_id';

export function getActiveGptSession() {
  try { return localStorage.getItem(KEY) || null; } catch { return null; }
}

export function setActiveGptSession(id) {
  if (!id) { try { localStorage.removeItem(KEY); } catch {} }
  else { try { localStorage.setItem(KEY, id); } catch {} }
  const ev = new CustomEvent('tars:gptSessionChanged', { detail: id || null });
  window.dispatchEvent(ev);
}