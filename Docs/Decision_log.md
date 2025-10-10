# HomeTARS — Decision Log

> *Registro das principais decisões técnicas, conceituais e estratégicas do desenvolvimento do sistema TARS.*

---

## **09/10/2025 — Implementação do Modo Proxy GPT (Phase 10)**
**Decisão:** Integrar um módulo de mediação direta entre o usuário e o modelo GPT, com logging completo e interação multimodal.
- **Motivação:** Tornar o TARS capaz de atuar como interface inteligente entre o humano e a IA, mantendo o estilo e controle de contexto.
- **Alternativas:** Acesso direto ao GPT via UI (descartado — quebra da imersão e do fluxo narrativo).
- **Impacto:** Criação de endpoints `/api/gpt/session` e `/api/gpt/message`; logs integrados e sessões persistentes.
- **Status:** Concluído com sucesso, testado em modo econômico.

---

## **07/10/2025 — Automação por Cômodo e Contexto Semântico (Phase 7+)**
**Decisão:** Evoluir o painel de automação para compreender cômodos e intenções contextuais.
- **Motivação:** Aumentar o realismo e a fluidez dos comandos de voz e texto (ex: “tá escuro aqui” → luz do cômodo atual).
- **Alternativas:** Controle manual único (descartado — limitado e pouco natural).
- **Impacto:** Estrutura `automation.js` refeita para subestados por cômodo; logging inteligente de automações.
- **Status:** Implementado e testado com sucesso.

---

## **06/10/2025 — Dashboard Modular (Phase 6)**
**Decisão:** Expandir o projeto para um painel completo, com múltiplos modos e navegação fluida.
- **Motivação:** Organizar o ecossistema em módulos: Terminal, Logs, Status e Automations.
- **Alternativas:** Manter tudo em uma única tela (descartado — complexidade visual e manutenção difícil).
- **Impacto:** Estrutura de `Dashboard.jsx` criada; modos persistentes; base pronta para extensões futuras.
- **Status:** Concluído com êxito.

---

## **05/10/2025 — Implementação da Camada de Voz (Phase 5)**
**Decisão:** Adicionar voz (escuta e fala) como interface primária de interação.
- **Motivação:** Permitir controle natural e contínuo via fala, mantendo coerência estética e narrativa.
- **Alternativas:** Apenas texto (descartado — limitação imersiva).
- **Impacto:** Integração com Whisper (transcrição) e TTS da OpenAI; implementação de wake word (“Hey TARS”).
- **Status:** Concluído com testes bilíngues.

---

## **05/10/2025 — Sistema de Comandos Inteligente (Phase 4)**
**Decisão:** Criar parser local e endpoint /api/ai mockado para interpretação de comandos.
- **Motivação:** Introduzir inteligência sem depender da API principal no início.
- **Alternativas:** IA integrada direta (descartado — alto custo e instabilidade).
- **Impacto:** Feedback colorido, sugestões automáticas e animações de “thinking”.
- **Status:** Estável e validado.

---

## **05/10/2025 — Terminal Vivo e Reativo (Phase 3)**
**Decisão:** Introduzir logs em tempo real via WebSocket e animações dinâmicas.
- **Motivação:** Tornar o terminal mais imersivo e responsivo.
- **Alternativas:** Atualizações periódicas via REST (descartado — pouca fluidez).
- **Impacto:** WS `/api/events/ws` e efeitos de digitação.
- **Status:** Implementado com fallback REST.

---

## **05/10/2025 — Integração Backend (Phase 2)**
**Decisão:** Criar backend real com FastAPI e MongoDB, adicionando Supabase preparado.
- **Motivação:** Conectar o terminal a uma base real, mantendo flexibilidade futura.
- **Alternativas:** Backend mockado (descartado — inviável para persistência real).
- **Impacto:** Repositório agnóstico; contratos definidos; REST endpoints criados.
- **Status:** Concluído com sucesso.

---

## **05/10/2025 — Criação do Terminal Estático (Phase 1)**
**Decisão:** Desenvolver a base visual e comportamental do terminal.
- **Motivação:** Estabelecer identidade e estética TARS antes das camadas funcionais.
- **Alternativas:** UI convencional (descartado — fugia da proposta imersiva).
- **Impacto:** Layout sci-fi minimalista; logs simulados e boot sequence.
- **Status:** Fase concluída, base visual consolidada.

---

> *“Cada decisão aproximou o TARS de uma mente que não apenas entende comandos, mas compreende contexto.”*