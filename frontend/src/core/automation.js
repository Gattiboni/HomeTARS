// Global automation state store with intent applier, persistence and backend log hookup
import { api } from "./api";

const KEY = 'tars_automations_v2';

const ROOMS = ['living','bedroom','office','kitchen'];
const DEFAULTS = {
  lights: { living: false, bedroom: false, office: false, kitchen: false },
  brightness: { living: 60, bedroom: 40, office: 70, kitchen: 50 },
  temperature: { living: 24, bedroom: 23, office: 22, kitchen: 24 },
  music: false,
  volume: 30,
};

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

function logAutomation(text, meta) {
  try { api.automationLog(text, meta).catch(() => {}); } catch (_) {}
}

// Apply a single intent to state. Supports room-based changes and exceptions.
export function applyIntentToState(intent) {
  if (!intent || !intent.action) {
    const s0 = getAutomationState();
    const saved0 = setAutomationState(s0);
    window.dispatchEvent(new CustomEvent('tars:automationStateChanged', { detail: saved0 }));
    return saved0;
  }
  const s = getAutomationState();
  let text = '';

  switch (intent.action) {
    case 'lights_on': {
      const room = intent.room;
      if (room && s.lights.hasOwnProperty(room)) {
        s.lights[room] = true; if (s.brightness[room] <= 0) s.brightness[room] = 40;
        text = `[AUTOMATION] lights_on room=${room}`;
      } else {
        ROOMS.forEach(r => { s.lights[r] = true; if (s.brightness[r] <= 0) s.brightness[r] = 40; });
        text = `[AUTOMATION] lights_on room=all`;
      }
      break; }
    case 'lights_off': {
      const room = intent.room;
      if (room && s.lights.hasOwnProperty(room)) {
        s.lights[room] = false;
        text = `[AUTOMATION] lights_off room=${room}`;
      } else if (intent.except && s.lights.hasOwnProperty(intent.except)) {
        ROOMS.forEach(r => { s.lights[r] = (r === intent.except); });
        text = `[AUTOMATION] lights_off room=all except=${intent.except}`;
      } else {
        ROOMS.forEach(r => { s.lights[r] = false; });
        text = `[AUTOMATION] lights_off room=all`;
      }
      break; }
    case 'set_brightness':
    case 'dim_lights': {
      const v = clamp(Math.round(Number(intent.value || 30)), 0, 100);
      const room = intent.room;
      if (room && s.brightness.hasOwnProperty(room)) {
        s.brightness[room] = v; s.lights[room] = v > 0;
        text = `[AUTOMATION] dim_lights room=${room} value=${v}`;
      } else {
        ROOMS.forEach(r => { s.brightness[r] = v; s.lights[r] = v > 0; });
        text = `[AUTOMATION] dim_lights room=all value=${v}`;
      }
      break; }
    case 'set_temperature': {
      const v = clamp(Number(intent.value || 24), 16, 30);
      const room = intent.room;
      if (room && s.temperature.hasOwnProperty(room)) {
        s.temperature[room] = v;
        text = `[AUTOMATION] set_temperature room=${room} value=${v}`;
      } else {
        ROOMS.forEach(r => { s.temperature[r] = v; });
        text = `[AUTOMATION] set_temperature room=all value=${v}`;
      }
      break; }
    case 'play_music': {
      s.music = true; text = `[AUTOMATION] play_music`;
      break; }
    case 'stop_music': {
      s.music = false; text = `[AUTOMATION] stop_music`;
      break; }
    case 'set_volume': {
      const v = clamp(Math.round(Number(intent.value || s.volume)), 0, 100);
      s.volume = v; text = `[AUTOMATION] set_volume value=${v}`;
      break; }
    default: {
      // no-op
      break; }
  }

  const saved = setAutomationState(s);
  window.dispatchEvent(new CustomEvent('tars:automationStateChanged', { detail: saved }));
  if (text) logAutomation(text, { intent });
  return saved;
}

// Attach global listener once on module import
(function attach() {
  if (typeof window !== 'undefined') {
    if (!window.__tarsAutomationAttachedV2) {
      window.__tarsAutomationAttachedV2 = true;
      window.addEventListener('tars:automationCommand', (e) => {
        try { applyIntentToState(e.detail || {}); } catch (_) {}
      });
    }
  }
})();

export { ROOMS };