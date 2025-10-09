# HomeTARS — Phase 2/3/4 API Contracts (Terminal ⇄ FastAPI)

Purpose
- Define REST contracts and the new AI mock endpoint for Phase 4
- Keep storage-agnostic (Mongo active; Supabase repo implemented, off-by-default)

Base URL and routing
- All backend routes under prefix: /api
- Frontend uses process.env.REACT_APP_BACKEND_URL + "/api"

Shared models
- LogItem
  - id: string (uuid)
  - ts: string (ISO-8601)
  - level: 'system' | 'user' | 'error' | 'info'
  - text: string
- SystemStatus
  - status: 'ONLINE' | 'OFFLINE'
  - updated_at: string (ISO-8601)
- CommandRequest { command: string }
- CommandResponse { echo: string, lines: string[], level: 'system'|'error', wrote_log: boolean }
- AIRequest { prompt: string, session_id?: string }
- AIResponse { lines: string[], level: 'info'|'system'|'error' }

Endpoints
1) GET /api/status → 200 { status, updated_at }
2) GET /api/logs?limit=&since=&level= → 200 { items: LogItem[] }
3) POST /api/command { command } → 200 CommandResponse
   - Known commands: help, status, time, clear
   - Side-effects: writes 'user' and result logs; broadcasts via WS
4) POST /api/ai { prompt, session_id? } → 200 AIResponse
   - Phase 4 mock: returns suggestions "did you mean...";
   - Side-effects: writes 'info' logs for each suggestion; broadcasts via WS

WebSocket (Phase 3)
- /api/events/ws → emits { type: 'log', item: LogItem }

Frontend behavior (Phase 4)
- Submit flow:
  1) Always POST /api/command to persist echo/result.
  2) If command not in {help,status,time,clear}, show local thinking ("..."), then POST /api/ai.
  3) If WS active, rely on WS for lines; else render lines from HTTP responses.
  4) Styles: system=green, error=red, info=blue; typing effect for all lines.

Testing notes
- Backend tests first (fast), then UI automation; boot/WS/fallback and thinking/suggestions.