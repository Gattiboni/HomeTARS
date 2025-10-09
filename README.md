# HomeTARS
> *"The terminal is awake."*  
> An intelligent, modular and evolving home control system inspired by TARS from *Interstellar*.

---

## Overview

**HomeTARS** is an experimental, voice-driven control terminal and home automation interface built for immersive interaction. It combines a **sci-fi terminal UI**, **multimodal AI**, and **modular architecture**, evolving phase by phase toward a fully autonomous home assistant.

Developed incrementally under a roadmap-based approach, each phase introduces new layers: from a static visual terminal to intelligent voice interaction, contextual automation, and future integrations with real-world devices and APIs.

---

## Core Features

### Terminal Interface (Phases 1–3)
- Minimalist sci-fi UI: black background, neon green text, Roboto Mono typography.
- Boot sequence and simulated logs.
- Responsive design for desktop, tablet, and iPad Air.
- WebSocket-enabled real-time logs.
- Typing effect, cursor blink, and feedback animations.

### Intelligent Command System (Phases 4–5)
- Local command parser with suggestions ("Did you mean…").
- Contextual responses with color-coded feedback.
- Voice recognition and wake word detection ("Hey TARS").
- Bilingual support (EN/PT-BR) with automatic language detection.
- Speech synthesis (TTS) and real-time transcription (Whisper).
- Dynamic persona: *dry wit, precision, and subtle irony.*

### Dashboard & Automations (Phases 6–7)
- Modular dashboard with modes: Terminal, Logs, Status, Automations.
- Room-aware automations (lights, temperature, media, energy).
- Sync between UI, voice, and text commands.
- Mock persistence via `localStorage`.
- Weather forecast and contextual feedback.

### AI Proxy Mode (Phase 10)
- “GPT Link” mode for extended reasoning sessions via OpenAI API.
- Conversation logging and playback (text + TTS).
- Multimodal interaction: User → TARS → GPT → TARS → User.

---

## Stack

**Frontend**
- React + Vite + Vanilla JS/CSS
- Tailwind (optional) and custom neon theme
- Web Speech API + WebAudio API + WebSocket

**Backend**
- FastAPI + Python 3.11+
- Supabase (PostgreSQL) — data, auth, logs, automations
- OpenAI Whisper + GPT + TTS APIs

**Architecture Principles**
- Modular and incremental design
- Contract-based API evolution (`contracts.md`)
- Storage-agnostic backend repositories
- Frontend flags for cost and resource management (`AI_DISABLED`, `VOICE_DISABLED`, etc.)

---

## Setup

### Local Installation
```bash
# clone repo
 git clone https://github.com/Gattiboni/HomeTARS.git
 cd HomeTARS

# install backend\ ncd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# install frontend
cd ../frontend
yarn install
yarn dev
```
Access: [http://localhost:5173](http://localhost:5173)

### Environment Variables
Frontend:
```
VITE_BACKEND_URL=http://localhost:8001
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

Backend:
```
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-key>
OPENAI_API_KEY=<your-openai-api-key>
AI_DISABLED=false
VOICE_DISABLED=false
```

---

## Project Structure
```
/frontend
 ├── src/
 │   ├── core/          # Core logic: API, sound, WS, mock
 │   ├── ui/            # React components
 │   ├── styles/        # CSS and animations
 │   ├── assets/        # Audio and icons
 │   └── systems/       # AI, voice, and multimodal modules
 ├── public/
 └── package.json

/backend
 ├── repository.py      # Mongo/Supabase repositories
 ├── server.py          # FastAPI routes
 ├── ws_manager.py      # WebSocket manager
 ├── contracts.md       # API definitions
 ├── requirements.txt
 └── .env
```

---

## Status
- **Current version:** v0.6.9 (Neo Baseline Merge)
- **Completed:** Phases 1–6 + GPT Proxy Mode
- **Next focus:** Integration with real devices (Tuya/Home Assistant) and autonomous behavior refinement.

---

## Credits
**Development Lead:** Alan Gattiboni  
**AI Engineer (Agent):** Neo (Emergent.sh)  
**Inspiration:** TARS — *Interstellar (2014)*

---

> “A stable link between mind, machine, and matter. HomeTARS is online.”

