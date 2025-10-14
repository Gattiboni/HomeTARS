# HomeTARS — Operations Notes

Environment
- Backend binds on 0.0.0.0:8001; all routes are under /api
- Frontend must read REACT_APP_BACKEND_URL from frontend/.env
- Backend uses MONGO_URL and DB_NAME from backend/.env

Feature Flags & Env
- AI_DISABLED: disable external AI calls (economy)
- VOICE_ONLINE: enable/disable real TTS/STT; default false (offline beep + empty STT)
- HA_ENABLED, HOME_ASSISTANT_URL, HOME_ASSISTANT_TOKEN
- TUYA_ENABLED, TUYA_ACCESS_ID, TUYA_ACCESS_SECRET, TUYA_REGION
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
- WHATSAPP_API_URL, WHATSAPP_TOKEN

Startup
- On backend startup, status is ensured in DB
- Logs directory for GPT Link: ./logs/gpt_sessions

WebSocket
- /api/events/ws broadcasts logs

Offline Defaults
- All integrations return configured:false unless env vars are present
- Voice returns functional offline responses; AI respects AI_DISABLED

Data Persistence
- Mongo stores: logs, commands, reminders; device-state mock is in-memory (non-persistent)

Runbooks
- Enable any integration by setting envs and restarting backend (sudo supervisorctl restart backend)
- Validate with GET endpoints (e.g., /api/integrations/ha/entities)

Troubleshooting
- If backend fails to start, check supervisor logs: tail -n 100 /var/log/supervisor/backend.*.log
- 502 on voice endpoints in online mode: verify OPENAI_API_KEY and VOICE_ONLINE
- WebSocket connectivity depends on ingress; HTTP fallback remains available in UI
