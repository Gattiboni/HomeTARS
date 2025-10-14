# HomeTARS — Roadmap (Phases 11 & 13)

Scope of this batch
- Phase 11: Home integrations offline-ready — Home Assistant, Tuya, device-state mock store
- Phase 13: Digital integrations offline-ready — Gmail, Calendar, WhatsApp, Reminders module

State
- All integrations are offline-ready (stubs functional, contracts defined). Enabling real calls requires only setting env vars locally.

Next Up (suggested)
- Wire Automations UI to /api/state/* for round-trip device sync
- Enable HA/Tuya with real keys in local env; test entity mapping and scenes
- Expand Gmail/Calendar with OAuth reauth flows and per-user tokens (off-by-default)
- WhatsApp: choose provider (Cloud API or vendor) and wire token-based auth
- Reminders: add due-date notifications and calendar auto-sync when configured
- Add Logs filter for each integration category (done for [REMINDER], [GPT], [AUTOMATION])

Activation checklist
- HA: HA_ENABLED=true, HOME_ASSISTANT_URL, HOME_ASSISTANT_TOKEN
- Tuya: TUYA_ENABLED=true, TUYA_ACCESS_ID, TUYA_ACCESS_SECRET, TUYA_REGION
- Google: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
- WhatsApp: WHATSAPP_API_URL, WHATSAPP_TOKEN
- Voice Online: VOICE_ONLINE=true, OPENAI_API_KEY
- AI economy: AI_DISABLED=false for live LLM calls

Testing
- Use backend deep tests to validate endpoints return 200 and expected shapes in offline mode.
- Manual UI tests for Reminders panel creation/completion and Logs filters.
