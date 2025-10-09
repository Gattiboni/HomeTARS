// Intent utilities for Phase 6 multimodal dispatcher

// Extract intents from AI response lines. Expect a line like:
// INTENT: {"action":"lights_off","except":"office"}
export function parseIntentsFromLines(lines = []) {
  const intents = [];
  for (const ln of lines) {
    const s = String(ln || "").trim();
    if (s.startsWith("INTENT:")) {
      const jsonPart = s.slice("INTENT:".length).trim();
      try {
        const obj = JSON.parse(jsonPart);
        if (obj && obj.action) intents.push(obj);
      } catch (_) {}
    }
  }
  return intents;
}

// Heuristic fallback when no explicit INTENT is present
export function inferIntentHeuristic(text = "") {
  const t = text.toLowerCase();
  // lights off / kill all
  if (/(kill|turn)\s+(off|all)/.test(t) || /too many lights/.test(t)) return { action: 'lights_off' };
  if (/turn\s+on/.test(t) || /little light|more light|brighter/.test(t)) return { action: 'lights_on' };
  const tempMatch = t.match(/(set|to)\s*(?:temperature|temp)?\s*(?:to)?\s*(\d{2})/);
  if (tempMatch) return { action: 'set_temperature', value: Number(tempMatch[2]) };
  if (/play\s+music|spotify|start\s+music/.test(t)) return { action: 'play_music' };
  if (/stop\s+music|pause\s+music/.test(t)) return { action: 'stop_music' };
  const vol = t.match(/(volume)\s*(\d{1,3})/);
  if (vol) return { action: 'set_volume', value: Math.max(0, Math.min(100, Number(vol[2]))) };
  const sm = t.match(/switch\s+mode\s+(terminal|logs|status|automations)/);
  if (sm) return { action: 'switch_mode', target: sm[1] };
  return null;
}

export function dispatchIntent(intent) {
  if (!intent || !intent.action) return;
  if (intent.action === 'switch_mode') {
    const ev = new CustomEvent('tars:switchMode', { detail: String(intent.target || 'terminal') });
    window.dispatchEvent(ev);
    return;
  }
  const ev = new CustomEvent('tars:automationCommand', { detail: intent });
  window.dispatchEvent(ev);
}

export function detectAutomationMode(text = "") {
  const t = text.toLowerCase();
  const keys = ['light','lights','lamp','room','temperature','thermostat','heat','cool','music','spotify','song','energy','power','volume'];
  return keys.some(k => t.includes(k)) ? 'automation' : undefined;
}