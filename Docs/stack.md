# HomeTARS — Stack Técnico

> *Arquitetura completa, tecnologias e integrações do sistema TARS, do terminal ao assistente multimodal.*

---

## **Visão Geral da Arquitetura**

**Arquitetura:** Cliente–Servidor (Fullstack React + FastAPI)  
**Paradigma:** Event-driven, modular e multimodal (voz, texto, automação e IA)  
**Linguagens principais:**
- **Frontend:** JavaScript (ES6+) / React.js / CSS Modules  
- **Backend:** Python 3.11 / FastAPI  
- **IA e Voz:** OpenAI GPT-4o-mini / Whisper / TTS  

**Padrões-chave:**
- REST + WebSocket + Event Dispatcher no cliente.
- Storage-agnostic (MongoDB → Supabase-ready).
- Bilingue (EN/PT-BR) com detecção automática de idioma.
- Infra modular e escalável (cada Phase é uma camada isolada).

---

## **Frontend (React.js)**

### **Estrutura de pastas**
```
frontend/
├── src/
│   ├── core/               # Núcleo lógico (API, WS, automação, voz)
│   ├── components/         # Terminal, painéis e UI modular
│   ├── assets/             # Sons, ícones, fontes
│   ├── styles/             # CSS global e temas
│   ├── hooks/              # React hooks customizados
│   ├── App.js              # Entry principal
│   └── index.js            # Renderização e flags globais
```

### **Principais módulos**
- **`core/api.js`** → Cliente REST unificado (`/api/*`).
- **`core/ws.js`** → WebSocket dinâmico com fallback REST.
- **`core/automation.js`** → Store global com persistência local (localStorage) e eventos `tars:automationStateChanged`.
- **`core/voice.js`** → Integração com Web Speech API e endpoints Whisper/TTS.
- **`Terminal.jsx`** → Núcleo da UI e do fluxo de comandos.
- **`Dashboard.jsx`** → Painel modular (Terminal / Logs / Status / Automations / GPT Link).
- **`LogsPanel`, `StatusPanel`, `AutomationsPanel`, `GptLinkPanel`** → UIs independentes com sincronização global.

### **Frameworks e libs auxiliares**
- React 18 + Hooks API
- Axios (requisições REST)
- Framer Motion (animações sutis)
- Lucide Icons (ícones vetoriais minimalistas)
- Tailwind (classes utilitárias)
- Tone.js (áudio e feedbacks sonoros)

### **Recursos adicionais**
- Detecção automática de idioma via Whisper.
- Wake word (“Hey TARS”, “Ei TARS”).
- TTS integrado para respostas com sincronização de logs e efeitos visuais.
- Flags de economia via `window.__TARS_FLAGS__`:
  - `AI_DISABLED`, `VOICE_DISABLED`, `WS_DISABLED`, `TEST_MODE`.

---

## **Backend (FastAPI)**

### **Estrutura de pastas**
```
backend/
├── app/
│   ├── main.py             # Entry principal FastAPI
│   ├── server.py           # Rotas REST + WS + inicialização
│   ├── repository.py       # Camada de persistência (Mongo/Supabase)
│   ├── ws_manager.py       # Broadcast e controle de conexões WS
│   ├── ai_handler.py       # Módulo GPT + Whisper + TTS
│   ├── gpt_proxy.py        # Bridge do modo GPT Link
│   ├── voice_handler.py    # Transcrição e síntese de voz
│   ├── automation.py       # Lógica de intents e estado persistente
│   └── contracts.md        # Documentação de rotas e schemas
```

### **Principais rotas e endpoints**
| Endpoint | Descrição | Implementação |
|-----------|------------|----------------|
| `GET /api/status` | Status do sistema | Backend ativo, retorno padrão ONLINE |
| `GET /api/logs` | Histórico de logs (paginado) | Mongo/Supabase (agnóstico) |
| `POST /api/command` | Processa comandos locais | Parser interno + logs |
| `POST /api/ai` | Interpreta comandos via IA | GPT-4o-mini (ou mock, se AI_DISABLED) |
| `POST /api/voice/transcribe` | Transcreve áudio para texto | Whisper-1 |
| `POST /api/voice/tts` | Gera áudio de resposta | GPT-4o-mini-tts |
| `POST /api/gpt/session` | Cria sessão GPT Link | Cria arquivo e ID incremental |
| `POST /api/gpt/message` | Envia mensagem ao GPT | Proxy GPT / loga resposta |
| `WS /api/events/ws` | Logs em tempo real | Gerenciado via `ws_manager` |

### **Tecnologias e libs do backend**
- **FastAPI** (framework principal)
- **Uvicorn** (servidor ASGI)
- **Motor** (driver MongoDB assíncrono)
- **Requests** (chamadas REST a APIs externas)
- **Python-dotenv** (gerenciamento de variáveis de ambiente)
- **OpenAI SDK** (GPT, Whisper, TTS)
- **JSON & UUID** (controle de logs e sessões)
- **Supervisor** (gerência de processos no servidor)

---

## **Banco de Dados e Storage**

### **MongoDB (ativo)**
- Coleções:
  - `logs`: `{ id, ts, level, text }`
  - `system_status`: `{ id: 'singleton', status, updated_at }`
  - `commands`: `{ id, ts, command, result_lines, result_level }`
- Hospedado em container local (modo dev).

### **Supabase (inativo, pronto para ativar)**
- Repositório alternativo com mesmas coleções e endpoints via PostgREST.
- Chave `SUPABASE_SERVICE_ROLE_KEY` já configurada e segura.
- Habilitação simples via env (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

---

## **IA e Multimodalidade (OpenAI)**

- **Modelo de linguagem:** `gpt-4o-mini` (modo diálogo e proxy GPT Link)
- **Transcrição:** `whisper-1`
- **Síntese de voz:** `gpt-4o-mini-tts`
- **Persona System Prompt:**
  ```json
  {
    "role": "system",
    "content": "You are TARS, an onboard AI with dry wit, mild sarcasm, and absolute honesty. Respond concisely, with a tone that balances military precision and subtle irony. You speak both English and Portuguese fluently, switching to match the user's language."
  }
  ```
- **Fluxo completo (voz/texto):**
  - Usuário fala → Whisper → texto → GPT → resposta → TTS → reprodução.

---

## **Infraestrutura e Deploy**

- **Ambiente:** Emergent Platform (IDE + Deploy automatizado)
- **Servidor:** Linux + Supervisor (backend) + Nginx Proxy (frontend)
- **Branch principal:** `main` (estável)  
- **Branch de desenvolvimento:** `Neo` (último sprint)
- **Flags de execução:**
  - `AI_DISABLED`, `VOICE_DISABLED`, `WS_DISABLED`, `TEST_MODE`
- **Logs e sessões GPT:** armazenados em `/app/logs/`

---

## **Estilo e UX**

- **Tema:** preto absoluto + verde neon discreto.
- **Tipografia:** Roboto Mono / monospace.
- **Layout:** grid fluido com transições suaves.
- **Feedback visual:** glow leve, sem cores saturadas.
- **Efeitos sonoros:** feedbacks de boot, envio e erro.
- **Interface bilíngue automática (sem troca manual).**

---

## **Testes e Automação**

- **Framework:** Pytest + Jest (frontend/back)
- **Testes automatizados:**
  - Boot sequence
  - Comandos REST e WS
  - Voz (mock headless)
  - Fallback REST
  - Persistência local
  - Bilíngue + IA ativa/inativa
- **Test Mode:** reduz chamadas externas e logs.

---

## **Resumo Final**

O HomeTARS é um sistema **multimodal, bilíngue e modular**, com camadas independentes de voz, IA, automação e interface.  
A arquitetura foi construída para ser **agnóstica, escalável e economicamente controlável**, com cada módulo capaz de operar isoladamente em ambiente local ou remoto.  

> “TARS não apenas responde — ele entende, fala e age. O código é apenas o corpo; a ironia, a alma.”

