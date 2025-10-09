# HomeTARS — Phase 2 API Contracts (Terminal ⇄ FastAPI)

Purpose
- Define REST contracts for Phase 2 and map which data is mocked in Phase 1 (to be replaced)
- Specify backend implementation scope and frontend integration plan

Important environment note
- This deployment MUST use MongoDB via backend/.env MONGO_URL (platform constraint). Supabase is not permitted in this environment.
- We keep contracts storage-agnostic to ease future migration (repository pattern). In a future infra where Supabase is allowed, only the repository layer changes.

Base URL and routing
- All backend routes must be under prefix: /api
- Frontend must use process.env.REACT_APP_BACKEND_URL + "/api"

Shared models
- LogItem
  - id: string (uuid)
  - ts: string (ISO-8601)
  - level: 'system' | 'user' | 'error'
  - text: string
- SystemStatus
  - status: 'ONLINE' | 'OFFLINE'
  - updated_at: string (ISO-8601)
- CommandRequest
  - command: string
- CommandResponse
  - echo: string (the original command)
  - lines: string[] (multi-line textual response to render in terminal)
  - level?: 'system' | 'error' (default 'system')
  - wrote_log: boolean

Endpoints
1) GET /api/status
- Description: Returns current system status.
- Query: none
- 200 Response (application/json):
  {
    "status": "ONLINE",
    "updated_at": "2025-07-01T12:34:56.789Z"
  }
- 503 Response: { "status": "OFFLINE", "updated_at": ISO } (use 200 or 503 depending on implementation; frontend treats non-2xx as offline)

2) GET /api/logs
- Description: Returns latest log history (reverse chronological by ts)
- Query (optional):
  - limit: number (default 100, max 1000)
  - since: ISO-8601 string (return logs with ts > since)
  - level: 'system' | 'user' | 'error' (filter)
- 200 Response:
  {
    "items": LogItem[]
  }

3) POST /api/command
- Description: Receives a user command, stores it and its evaluation result, and returns the textual response to display in the terminal.
- Body (json): { "command": "help" }
- 200 Response (example: known command):
  {
    "echo": "help",
    "lines": [
      "AVAILABLE COMMANDS:",
      " - help   : list available commands",
      " - status : show system status",
      " - clear  : clear the terminal",
      " - time   : show current system time"
    ],
    "level": "system",
    "wrote_log": true
  }
- 200 Response (example: clear):
  {
    "echo": "clear",
    "lines": [],
    "level": "system",
    "wrote_log": true
  }
- 200 Response (example: unknown):
  {
    "echo": "xyz",
    "lines": ["COMMAND NOT RECOGNIZED."],
    "level": "error",
    "wrote_log": true
  }
- 400 Response (invalid body): { "detail": "command is required" }

Mapping: Phase 1 mocks → Phase 2 real data
- Boot sequence (front-end): stays on the client as UX. Now also shows loader “BOOTING SEQUENCE…” until GET /api/status succeeds.
- Commands: previously resolved locally in /src/core/mock.js; Phase 2 moves this logic to the backend (POST /api/command). Frontend will only echo the command then render backend response.
- Logs: previously ephemeral state in Terminal; Phase 2 reads/writes logs from/to MongoDB (collection: logs) via GET /api/logs and POST /api/command side-effects.

Backend implementation (MongoDB)
- Collections:
  - logs: { _id: uuid, ts: Date, level: 'system'|'user'|'error', text: string }
  - system_status: { _id: 'singleton', status: 'ONLINE'|'OFFLINE', updated_at: Date }
  - commands: { _id: uuid, ts: Date, command: string, result_level: 'system'|'error', result_lines: string[] }
- Endpoints to add (prefix /api):
  - GET /status
  - GET /logs
  - POST /command
- Business rules:
  - POST /command: always write a 'user' log ("> command") and one or more 'system'/'error' logs for responses (unless command is 'clear', whose effect is client-side clearing only, but still store the command itself for traceability).
  - Known commands: help, status, time, clear. Unknown → error line.
  - GET /status derives from system_status (fallback ONLINE if missing; also update on startup).

Frontend integration plan
- On mount:
  1) Show loader text “BOOTING SEQUENCE…” (existing boot animation) until GET /api/status returns 200. If request fails → show “CORE LINK LOST” once and keep retrying every 3–5s.
  2) Fetch initial logs via GET /api/logs (e.g., limit=100) and render.
- On command submit:
  1) Echo "> command" immediately in the UI.
  2) POST /api/command, then append returned lines. If level === 'error', style as error.
  3) Optionally refresh logs with GET /api/logs since=lastTs for consistency (or rely purely on returned lines in Phase 2; WebSocket arrives in Phase 3).
- Error handling:
  - Network/5xx → show a single red line “CORE LINK LOST” and keep input enabled.

Testing notes
- Backend tests first (pytest or FastAPI TestClient) to validate contracts. Avoid curl in this environment.
- After backend is green, connect frontend and verify flows manually or with the frontend testing agent (on approval).

This doc is the protocol for integration. Keep it source of truth and update on change.