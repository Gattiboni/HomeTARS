# HomeTARS Frontend

Phase 1 (delivered)
- Terminal sci-fi inspirado no TARS (Interstellar): fundo preto, texto verde neon (#00FF99), tipografia Roboto Mono, boot sequence, logs simulados, input funcional e sons (beep/click) — 100% front-end, **mocked**.

Referência visual (rastreabilidade)
- "Seguir estética sci-fi minimalista inspirada no TARS de Interstellar, com tela preta absoluta, texto verde neon e sequência de boot."

Estrutura
- src/core — lógica (mock, som, futuros serviços)
- src/ui — componentes visuais (Terminal)
- src/styles — CSS do terminal
- src/assets — reservado (sons/imagens; Phase 1 usa WebAudio)

Phase 2 (próxima)
- Conectar com FastAPI: GET /api/status, GET /api/logs, POST /api/command.
- Loader “BOOTING SEQUENCE…” até backend responder; erro “CORE LINK LOST” quando offline.

Execução
- yarn start (hot reload). Variável: REACT_APP_BACKEND_URL já configurada pelo ambiente.