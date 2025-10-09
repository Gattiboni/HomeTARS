// Global automation state store with intent applier and persistence
// Single source of truth: localStorage('tars_automations')

const KEY = 'tars_automations';

const DEFAULTS = { light: false, brightness: 40, temp: 22, music: false, volume: 30 };

function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }

export function getAutomationState() {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; }
  catch { return { ...DEFAULTS }; }
}

export function setAutomationState(next) {
  const merged = { ...DEFAULTS, ...(next || {}) };
  localStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}

export function applyIntentToState(intent) {
  if (!intent || !intent.action) return getAutomationState();
  const s = getAutomationState();
  switch (intent.action) {
    case 'lights_on': s.light = true; if (s.brightness <= 0) s.brightness = 40; break;
    case 'lights_off': s.light = false; break;
    case 'set_brightness':
    case 'dim_lights': s.brightness = clamp(Math.round(Number(intent.value || 30)), 0, 100); break;
    case 'set_temperature': s.temp = clamp(Number(intent.value || s.temp), 16, 30); break;
    case 'play_music': s.music = true; break;
    case 'stop_music': s.music = false; break;
    case 'set_volume': s.volume = clamp(Math.round(Number(intent.value || s.volume)), 0, 100); break;
    default: break;
  }
  const saved = setAutomationState(s);
  // notify listeners
  const ev = new CustomEvent('tars:automationStateChanged', { detail: saved });
  window.dispatchEvent(ev);
  return saved;
}

// Attach global listener once on module import
(function attach() {
  if (typeof window !== 'undefined') {
    if (!window.__tarsAutomationAttached) {
      window.__tarsAutomationAttached = true;
      window.addEventListener('tars:automationCommand', (e) => {
        try { applyIntentToState(e.detail || {}); } catch (_) {}
      });
    }
  }
})();