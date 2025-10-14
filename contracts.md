# HomeTARS — API Contracts (Phases 2–5 + 10 + 11 + 13)

Purpose
- Define REST contracts covering Terminal/Logs/Command/AI/Voice, GPT Link, and offline-ready integrations
- Storage-agnostic: Mongo active; Supabase repo implemented (off-by-default)

Base URL and routing
- Prefix: /api
- Frontend uses process.env.REACT_APP_BACKEND_URL + "/api"

Models (core)
- LogItem { id: string, ts: ISO, level: 'system'|'user'|'error'|'info', text: string }
- SystemStatus { status: 'ONLINE'|'OFFLINE', updated_at: ISO }
- CommandRequest { command: string }
- CommandResponse { echo: string, lines: string[], level: 'system'|'error', wrote_log: boolean }
- AIRequest { prompt: string, session_id?: string, context?: object }
- AIResponse { lines: string[], level: 'info'|'system'|'error' }
- TranscribeResponse { text: string, language?: string, wake?: boolean, command_text?: string }
- TTSResponse { audio_base64: string, format: 'mp3'|'wav'|'opus' }

Core Endpoints
1) GET /api/status → 200 { status, updated_at }
2) GET /api/logs?limit=&since=&level= → 200 { items }
3) POST /api/command { command } → 200 CommandResponse
4) POST /api/ai { prompt, session_id?, context? } → 200 AIResponse
5) POST /api/voice/transcribe (multipart/form-data: file) → 200 TranscribeResponse
   - Offline fallback: { text: "", language: "en", wake: false, command_text: null }
6) POST /api/voice/tts (form: text, voice?, fmt?) → 200 TTSResponse
   - Offline fallback: returns base64-encoded WAV beep

WebSocket
- /api/events/ws: emits { type: 'log', item: LogItem }

GPT Link (Phase 10)
- POST /api/gpt/session → 200 { session_id }
- POST /api/gpt/message { session_id, prompt, language? } → 200 { session_id, user, assistant, language?, audio_base64? }

Automations (UI + Logs)
- Frontend emits intents; state persisted in localStorage. 
- Backend logs automation events via POST /api/automation/log { text, meta? } → 200 { ok: true }.

Integrations — Offline Ready (Phase 11 & 13)
All endpoints return configured:false when required env vars are missing. When configured locally by user, same endpoints become operational with real providers.

Home Assistant (HA)
- Env: HA_ENABLED (bool), HOME_ASSISTANT_URL, HOME_ASSISTANT_TOKEN
- GET /api/integrations/ha/entities → 200 { configured: boolean, items: Array<{ entity_id, name, state }> }
- POST /api/integrations/ha/service { domain, service, entity_id } → 200 { configured: boolean, ok: boolean, reason? }

Tuya
- Env: TUYA_ENABLED (bool), TUYA_ACCESS_ID, TUYA_ACCESS_SECRET, TUYA_REGION
- GET /api/integrations/tuya/devices → 200 { configured: boolean, items: Array<any> }
- POST /api/integrations/tuya/service { action, device_id, payload? } → 200 { configured: boolean, ok: boolean, reason? }

Gmail
- Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
- GET /api/integrations/gmail/messages → 200 { configured: boolean, messages: Array<{ id, from, subject, snippet, ts }>} (mock 3 items)
- POST /api/integrations/gmail/reply { threadId?, to?, subject?, body } → 200 { configured: boolean, ok: true, id }
- POST /api/integrations/gmail/suggest-reply { text } → 200 { ok: true, suggestion: string } (uses /api/ai; AI fallback supported)

Google Calendar
- Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
- GET /api/integrations/calendar/events → 200 { configured: boolean, events: Array<{ id, title, start, end }> } (mock 3 items)
- POST /api/integrations/calendar/create { title, start, end, ... } → 200 { configured: boolean, ok: true, event }
- PATCH /api/integrations/calendar/edit { id, ...updates } → 200 { configured: boolean, ok: true, event }

WhatsApp
- Env: WHATSAPP_API_URL, WHATSAPP_TOKEN
- GET /api/integrations/whatsapp/messages → 200 { configured: boolean, messages: Array<{ id, from, text, ts }>} (mock)
- POST /api/integrations/whatsapp/send { to, text } → 200 { configured: boolean, ok: true, id }

Device State (Mock Store)
- GET /api/state/device/:id → 200 { ok: true, state: { id, name, on } }
- POST /api/state/device/:id { on?, name? } → 200 { ok: true, state }
- GET /api/state/sync → 200 { ok: true, items: Array<{ id, name, on }> }
- POST /api/state/sync { items: Array<{ id, name?, on? }> } → 200 { ok: true, items }

Reminders
- GET /api/reminders → 200 { items: Array<{ id, text, status:'open'|'done', created_at, due? }> }
- POST /api/reminders { text, due? } → 200 { ok: true, item }
- PATCH /api/reminders/:id { status?, text?, due? } → 200 { ok: true }

Integration Activation Matrix (Offline-ready)
- HA: requires HA_ENABLED=true, HOME_ASSISTANT_URL, HOME_ASSISTANT_TOKEN → Entities/Service operational; otherwise configured:false
- Tuya: requires TUYA_ENABLED=true, TUYA_ACCESS_ID, TUYA_ACCESS_SECRET, TUYA_REGION → Devices/Service operational; otherwise configured:false
- Gmail: requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN → Messages/Reply live; otherwise returns mock with configured:false in meta
- Calendar: requires same Google envs → Events live; otherwise mock
- WhatsApp: requires WHATSAPP_API_URL, WHATSAPP_TOKEN → Messages/Send live; otherwise mock
- Voice Online: set VOICE_ONLINE=true to enable real TTS/STT (requires OPENAI_API_KEY)
- AI economy: AI_DISABLED=true to disable external AI calls and use suggestions fallback

Samples
- GET /api/integrations/gmail/messages → 200
{
  "configured": false,
  "messages": [
    {"id":"m1","from":"boss@example.com","subject":"Status Report","snippet":"Send status by EOD","ts":"2025-09-10T12:34:56Z"},
    {"id":"m2","from":"friend@example.com","subject":"Dinner","snippet":"Let's meet at 8pm","ts":"2025-09-10T12:34:56Z"},
    {"id":"m3","from":"service@example.com","subject":"Alert","snippet":"Your subscription renews tomorrow","ts":"2025-09-10T12:34:56Z"}
  ]
}

- POST /api/reminders {"text":"Pay electricity"} → 200
{
  "ok": true,
  "item": {"id":"uuid","text":"Pay electricity","status":"open","created_at":"ISO","due":null}
}

Operational Notes
- All backend routes start with /api; frontend must use REACT_APP_BACKEND_URL env (no hardcoding).
- MongoDB is the active storage (MONGO_URL, DB_NAME). Supabase remains implemented in repository but off-by-default.
- Voice offline fallback is the default; set VOICE_ONLINE=true + OPENAI_API_KEY to activate real audio.
- WebSocket at /api/events/ws broadcasts logs; essential for real-time UI feedback.
- Logs: Use POST /api/automation/log to add info-level entries, e.g., "[AUTOMATION] lights_off room=all".
- Reminder lifecycle writes [REMINDER] logs on create/complete for visibility.
