# HomeTARS

**The open, modular, sci-fi inspired smart home assistant.  
Realtime dashboard, voice, automation & AI — your home, your rules.**

---

## 🚀 Vision

HomeTARS started as a sci-fi dashboard on Home Assistant, but is designed to become a living, extensible digital core for home automations, voice/text interaction, smart devices, AI, and more.  
- Modular, lightweight, and flexible  
- Designed for Windows server + remote development  
- Fully web-based (iPad, phone, PC, wall panel — anywhere)

See [`/docs/ContextoMestre.md`](docs/ContextoMestre.md) for the full origin story and architecture.

---

## 💻 Architecture

- **Backend:** Python 3.11+ / FastAPI (REST + WebSocket) / SQLite
- **Frontend:** HTML+JS (initially), ready for React/Vue
- **AI:** OpenAI API, modular for future Llama/Mistral
- **Deployment:** Docker Compose (Windows server), dev via Git/PyCharm
- **Integration:** Home Assistant/Tuya via API, MQTT, or REST

---

## 🏗️ MVP Features

- Terminal sci-fi webapp (real-time logs, dark mode)
- Command input: text + voice (Web Speech API)
- Log history (SQLite, scrollback)
- Modular REST API for automations
- Mobile/web access (iPad Air 1 as wall panel)
- Basic security/auth (TBD)

---

## 🗺️ Roadmap

See [`/docs/ROADMAP.md`](docs/ROADMAP.md)  
(Checklist-style, derived from our Contexto Mestre doc.)

---

## 🗂️ Project Structure

- `/backend` — FastAPI app, DB, AI, automations
- `/frontend` — Sci-fi webapp (HTML+JS, React/Vue)
- `/docs` — Contexto Mestre, requirements, roadmap, changelog
- `/deploy` — Docker Compose, scripts, configs
- `/examples` — Usage scripts, sample automations
- `/tests` — Unit/integration tests

---

## 🐳 Deploy (Server / VM)

- Install Docker Desktop for Windows
- Clone this repo on your server
- Run: `docker compose up -d`
- Access HomeTARS at http://[server-ip]:8080

## 👩‍💻 Development (Remote)

- Clone repo on your main laptop (PyCharm/VSCode)
- Code/test locally, push to Git
- Pull/update on server as needed

---

## 📄 Requirements

- Windows 10/11 server (8GB RAM, SSD)
- Docker Desktop (WSL2 recommended)
- Python 3.11+ (for local dev)
- OpenAI API key

---

## ⚡ License

MIT License — for maximum flexibility

---

Maintained by [Alan Gattiboni](https://github.com/alangattiboni) — open for contributors!

