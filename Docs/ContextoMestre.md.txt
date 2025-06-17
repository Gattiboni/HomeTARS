# HomeTARS

**The open, modular, sci-fi inspired Home Assistant alternative.  
Realtime dashboard, voice, automation & AI — your home, your rules.**

---

## 🚀 Vision

HomeTARS is a next-gen, real-time smart home assistant and dashboard, inspired by sci-fi UIs and designed for hackers, makers, and project managers.  
- Modular, lightweight, and flexible  
- Designed for Windows server + remote development  
- Fully web-based (runs on iPad, phone, PC — anywhere)

## 💻 Architecture

- **Backend:** Python 3.11+, FastAPI (REST + WebSocket)
- **Frontend:** HTML+JS (initially), evolvable to React/Vue for advanced use
- **Database:** SQLite (simple, portable, upgradable)
- **AI:** OpenAI API (default), modular for future Llama/Mistral
- **Deployment:** Docker Compose (Windows server), local development via Git/PyCharm/VSCode
- **Integration:** Home Assistant/Tuya via API, MQTT, or REST

## 🏗️ MVP (Milestone 1)

- Terminal sci-fi webapp (real-time logs, dark mode)
- Command input: text + voice (Web Speech API)
- Log history (SQLite, scrollback)
- Modular REST API for automations
- Accessible from any device/browser (iPad Air 1 as wall panel)
- Basic security/auth (TBD)

## 🗺️ Roadmap (Next Steps)

- Add advanced automations & device integrations
- Plug-in local AI (Llama/Mistral)
- Add dashboard customization (by room, user)
- Physical TARS robot integration (optional)
- Vision/computer vision (camera, recognition)
- Mobile/



/backend # FastAPI app, database, API, AI integration
/frontend # Sci-fi webapp (HTML+JS, then React/Vue)
/deploy # Docker Compose, .env, configs, scripts
/docs # Mindmaps, wireframes, arch, roadmap
/examples # Usage scripts, sample automations
/tests # Unit/integration tests



## 🐳 Deploy (Server / VM)

- Install Docker Desktop for Windows
- Clone this repo on the server
- Run: `docker compose up -d`
- Access HomeTARS via http://[server-ip]:[port]

## 👩‍💻 Development (Remote)

- Clone the repo on your main laptop (PyCharm/VSCode)
- Code, test, push to Git
- Pull/update on server as needed

## 📄 Requirements

- Windows 10/11 server (8GB RAM, 200GB SSD, Celeron OK)
- Docker Desktop (WSL2 recommended)
- Python 3.11+ (for local dev)
- OpenAI API key (for initial AI features)

## ⚡ License

MIT License — for maximum flexibility

---

### Maintained by [Alan Gattiboni/GitHub] — open for contributors!


requirements.txt (Backend MVP)
txt
Copy
Edit
fastapi
uvicorn[standard]
openai
python-dotenv
sqlite-utils


docker-compose.yml (draft MVP)
yaml
Copy
Edit
version: "3.9"
services:
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    volumes:
      - ./backend:/app
    env_file:
      - .env


docs/ROADMAP.md (mini-mindmap para visualização rápida)

# HomeTARS — MVP Roadmap

- [ ] Terminal sci-fi frontend (real-time logs, voice input)
- [ ] REST API for device automation (triggers, state, logs)
- [ ] Log history (SQLite)
- [ ] Websocket for real-time frontend updates
- [ ] Integration: Home Assistant/Tuya (API/MQTT)
- [ ] OpenAI API (backend)
- [ ] Auth/security layer
- [ ] Mobile/web access (iPad compatible)
- [ ] PWA packaging
- [ ] Plugins: Vision, Hardware robot, local LLMs


