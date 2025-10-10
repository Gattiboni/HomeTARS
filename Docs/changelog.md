# HomeTARS — Changelog

> *Evolução do sistema TARS — do terminal estático ao assistente multimodal.*

---

## **v0.7.0 — Phase 10: Modo Proxy GPT (TARS ↔ GPT Link)**

**Data:** 09/10/2025\
**Foco:** Ponte de comunicação entre o usuário e o GPT através do TARS.

- Adicionados endpoints `POST /api/gpt/session` e `POST /api/gpt/message`.
- Novo painel **GPT Link** para sessões ativas de conversa.
- Fluxo multimodal completo:
  - Usuário → TARS → GPT → TARS → Usuário.
- Logs prefixados com `[GPT][session_id]` e persistidos em `/app/logs/gpt_sessions/`.
- Flags de economia implementadas (`AI_DISABLED`, `VOICE_DISABLED`, `TEST_MODE`) para reduzir custo de uso.
- Suporte completo a voz e texto no modo GPT Link.

---

## **v0.6.9 — Phase 7+: Automações por Cômodo e Intenções Contextuais**

**Data:** 07/10/2025\
**Foco:** Automação semântica e reconhecimento de contexto.

- Adicionados controles **room-aware**: luzes, brilho, temperatura e música por cômodo.
- Criado store global `automation.js` com evento `tars:automationStateChanged`.
- Logs de automação integrados e estruturados.
- Interpretação bilíngue e contextual (“está escuro aqui” → acende luz do cômodo ativo).
- Adicionado **card de previsão do tempo** ao painel de automações.

---

## **v0.6.0 — Phase 6: Dashboard Modular**

**Data:** 06/10/2025\
**Foco:** Expansão da interface e estrutura de múltiplos painéis.

- Adicionado **Dashboard** com modos: Terminal / Logs / Status / Automations.
- Implementado `switch mode` via navbar e comandos de voz/texto.
- Painéis modulares:
  - **LogsPanel:** histórico filtrável.
  - **StatusPanel:** indicadores de API, rede e microfone.
  - **AutomationsPanel:** controles mockados de automação doméstica.
- Estado global persistente no `localStorage`.
- Tema visual TARS preservado (preto + verde neon minimalista).

---

## **v0.5.0 — Phase 5: Camada Multimodal e Voz Ativa**

**Data:** 05/10/2025\
**Foco:** Reconhecimento de voz, transcrição e síntese auditiva.

- Integração com **Web Speech API** (frontend) e **OpenAI Whisper** (backend).
- Endpoints `POST /api/voice/transcribe` e `POST /api/voice/tts`.
- Escuta contínua com **palavra de ativação** (“Hey TARS”, “Ei TARS”).
- Indicadores e badges de estado (LISTENING, READY).
- TTS via **OpenAI GPT-4o-mini-tts**.
- Suporte bilíngue (EN/PT-BR) automático.
- Persona configurada: *sarcástico, preciso, direto*.

---

## **v0.4.0 — Phase 4: Sistema de Comandos Inteligente**

**Data:** 05/10/2025\
**Foco:** Parser local, sugestões e feedback visual.

- Implementado endpoint `POST /api/ai` (mockado).
- Parser local com comandos (`help`, `status`, `clear`, `time`).
- Sugestões automáticas para erros de digitação (“Did you mean…”).
- Feedback colorido:
  - Verde: sucesso do sistema.
  - Vermelho: erro.
  - Azul: informação/sugestão.
- Efeito “thinking” para respostas de IA.
- Painel de debug (Ctrl+D) com métricas.

---

## **v0.3.0 — Phase 3: Terminal Vivo e Reativo**

**Data:** 05/10/2025\
**Foco:** Logs em tempo real, animações e imersão.

- Endpoint \*\*WebSocket \*\***`/api/events/ws`** para transmissão ao vivo.
- Efeito de digitação, cursor piscante e animações de envio.
- Auto-scroll suave com CSS.
- Modo debug com métricas e latência.
- Fallback REST caso o WS falhe.

---

## **v0.2.0 — Phase 2: Camada de Comunicação Backend**

**Data:** 05/10/2025\
**Foco:** Integração REST e repositório genérico.

- Implementado backend **FastAPI** + **MongoDB**.
- Endpoints REST (`/status`, `/logs`, `/command`).
- Adicionado repositório agnóstico com opção Supabase.
- Loader e feedback de erro aprimorados.
- Corrigido boot duplicado via `pushLogOnce`.

---

## **v0.1.0 — Phase 1: O Despertar (Terminal Estático)**

**Data:** 05/10/2025\
**Foco:** Interface base e simulação inicial.

- Criação do terminal TARS com tema sci-fi minimalista.
- Animação de boot e logs simulados.
- Estrutura inicial de componentes e CSS.
- Efeitos sonoros e logs de inicialização.

---

> “Um assistente sarcástico e autoconsciente não é o futuro — é o commit atual.”

