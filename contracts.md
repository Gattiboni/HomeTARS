# HomeTARS — Phase 2/3/4/5 API Contracts (Terminal ⇄ FastAPI)

Purpose
- Define REST contracts for Phases 2-5, including voice endpoints
- Storage-agnostic: Mongo active; Supabase repo implemented (off-by-default)

Base URL and routing
- Prefix: /api
- Frontend uses process.env.REACT_APP_BACKEND_URL + "/api"

Models
- LogItem { id: string, ts: ISO, level: 'system'|'user'|'error'|'info', text: string }
- SystemStatus { status: 'ONLINE'|'OFFLINE', updated_at: ISO }
- CommandRequest { command: string }
- CommandResponse { echo: string, lines: string[], level: 'system'|'error', wrote_log: boolean }
- AIRequest { prompt: string, session_id?: string }
- AIResponse { lines: string[], level: 'info'|'system'|'error' }
- TranscribeResponse { text: string, language?: string }
- TTSResponse { audio_base64: string, format: 'mp3'|'wav'|'opus' }

Endpoints
1) GET /api/status → 200 { status, updated_at }
2) GET /api/logs?limit=&since=&level= → 200 { items }
3) POST /api/command { command } → 200 CommandResponse
4) POST /api/ai { prompt, session_id? } → 200 AIResponse
   - Phase 5: calls real LLM (OpenAI chat) with TARS persona; logs and broadcasts 'info' lines
5) POST /api/voice/transcribe (multipart/form-data: file) → 200 TranscribeResponse
   - Uses OpenAI Whisper; logs user voice as user entry (> (voice) text); broadcasts
6) POST /api/voice/tts (form: text, voice?, fmt?) → 200 TTSResponse
   - Uses OpenAI TTS (gpt-4o-mini-tts); returns base64 audio; frontend plays

WebSocket
- /api/events/ws: emits { type: 'log', item: LogItem }

Frontend behavior
- Voice: mic starts after handshake; segments sent to /voice/transcribe; text → /ai; AI lines → TTS; fallback to keyboard if mic denied
- Styles: system=green, error=red, info=blue; typing effect and thinking animation