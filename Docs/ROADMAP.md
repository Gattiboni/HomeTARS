# HomeTARS — Roadmap Integrado (Fases 11 a 16)

> *Da automação à inteligência contínua: o TARS evolui para compreender, agir e aprender no mundo físico e digital.*

---

## **Visão Geral (2025 → 2026)**

O **HomeTARS** atingiu maturidade funcional: um assistente multimodal, bilíngue e integrado, com controle local e por voz, IA generativa e suporte completo a automações residenciais e digitais. As próximas fases consolidam o ecossistema, expandem integrações reais e introduzem percepção contextual e aprendizado autônomo.

> “O TARS já escuta e fala. Agora ele precisa perceber, lembrar e decidir.”

---

## **Phase 11 — Integração com Ecossistemas Domésticos (Implementada, offline-ready)**

**Objetivo:** permitir que o TARS interaja com dispositivos reais via Home Assistant e Tuya.

**Status:** *Concluída em modo offline-ready (Neo Round 2)* — todos os endpoints e contratos funcionam sem chaves externas.

**Entregas:**

* Integrações:

  * **Home Assistant** — `/api/integrations/ha/entities`, `/api/integrations/ha/service`
  * **Tuya** — `/api/integrations/tuya/devices`, `/api/integrations/tuya/service`
* Armazenamento de estado local e mock persistente (`/api/state/*`).
* Painel de automações com múltiplos dispositivos por cômodo e sincronização de estados simulados.
* Integrações retornam `configured:false` até chaves reais serem configuradas.

**Próximos passos (fase de ativação local):**

* Conectar chaves reais (HA, Tuya) via `.env`.
* Mapear entidades, cenas e sensores.
* Testar round-trip de sincronização `/api/state/*` ↔ UI.

**Ativação local:**

| Variável               | Descrição                      |
| ---------------------- | ------------------------------ |
| `HA_ENABLED`           | Ativa Home Assistant           |
| `HOME_ASSISTANT_URL`   | URL do servidor Home Assistant |
| `HOME_ASSISTANT_TOKEN` | Token de acesso                |
| `TUYA_ENABLED`         | Ativa Tuya Cloud               |
| `TUYA_ACCESS_ID`       | ID Tuya                        |
| `TUYA_ACCESS_SECRET`   | Secret Tuya                    |
| `TUYA_REGION`          | Região Tuya (us/eu/cn)         |

---

## **Phase 12 — Context Awareness e IA Local (Em planejamento)**

**Objetivo:** tornar o TARS autônomo e capaz de operar offline com contexto ambiental.

**Entregas planejadas:**

* **Módulo de IA local** com fallback (Llama 3 / Mistral).
* **Percepção de contexto:** hora do dia, rotina, presença, clima.
* Perfis de comportamento (trabalho, noturno, silêncio).
* Aprendizado incremental de hábitos (ex: temperatura ideal, horários típicos).
* Cache offline + **modo PWA** (operações básicas sem conexão).

**Próximos passos:**

* Implementar engine local IA (FastAPI worker dedicado).
* Criar camada de contexto persistente (`context_manager.py`).
* Adicionar comandos contextuais no prompt principal do TARS.

---

## **Phase 13 — Integrações Digitais e Comunicação Pessoal (Implementada, offline-ready)**

**Objetivo:** expandir o TARS para a vida digital do usuário.

**Status:** *Concluída em modo offline-ready (Neo Round 2)*.

**Entregas:**

* **Gmail:**

  * `GET /api/integrations/gmail/messages` — retorna mensagens mock.
  * `POST /api/integrations/gmail/reply` — simula envio.
  * `POST /api/integrations/gmail/suggest-reply` — gera sugestão via `/api/ai`.
* **Google Calendar:**

  * `GET /api/integrations/calendar/events`
  * `POST /api/integrations/calendar/create`
  * `PATCH /api/integrations/calendar/edit`
* **WhatsApp:**

  * `GET /api/integrations/whatsapp/messages`
  * `POST /api/integrations/whatsapp/send`
* **Reminders:**

  * `/api/reminders` — CRUD completo; integração futura com Calendar.
  * Logs `[REMINDER]` integrados e filtro no painel de Logs.

**Próximos passos:**

* Ativar integrações reais (OAuth Gmail/Calendar, WhatsApp Cloud API).
* Sincronizar lembretes com Google Calendar.
* Adicionar notificações locais e de voz.

**Ativação local:**

| Variável               | Descrição             |
| ---------------------- | --------------------- |
| `GOOGLE_CLIENT_ID`     | ID do app Google      |
| `GOOGLE_CLIENT_SECRET` | Secret do app Google  |
| `GOOGLE_REFRESH_TOKEN` | Token de atualização  |
| `WHATSAPP_API_URL`     | URL da API WhatsApp   |
| `WHATSAPP_TOKEN`       | Token de autenticação |

---

## **Phase 14 — Captação de Voz via Mobile & Rede Local (Próxima)**

**Objetivo:** distribuir a captação de voz e ampliar o alcance físico do sistema.

**Entregas planejadas:**

* Aplicativo móvel leve (Android/iOS) como nó de voz distribuído.
* Comunicação via **WebRTC** entre app e servidor TARS.
* Hotword detection local ("Hey TARS" / "Ei TARS").
* Sincronização LAN de comandos e logs.

**Próximos passos:**

* Criar cliente mobile (React Native ou Flutter).
* Implementar canal local WebRTC + fallback HTTP.
* Prototipar wake word local (VAD + Silero).

---

## **Phase 15 — Expansão Multissensorial e Cognitiva (Planejamento médio prazo)**

**Objetivo:** integrar percepção visual e sensorial para tomada de decisão contextual.

**Entregas:**

* Módulo de **visão computacional** (OpenCV + FastAPI endpoint `/api/vision`).
* Sensores via MQTT (movimento, energia, luminosidade, temperatura).
* Memória de contexto (histórico de eventos e inferências).
* Perfil emocional leve (respostas adaptadas ao contexto).

**Próximos passos:**

* Prototipar integração MQTT.
* Adicionar painel “Ambiente” no Dashboard.
* Integrar detecção facial e de objetos.

---

## **Phase 16 — SDK e Extensões Externas (Planejamento longo prazo)**

**Objetivo:** abrir o ecossistema TARS para extensões e integrações externas.

**Entregas:**

* **SDK interno** para criação de plugins.
* **API pública** com autenticação JWT.
* Suporte a **extensões dinâmicas** (instalação sem reinício).
* Registro de extensões compatíveis e documentação formal.

**Próximos passos:**

* Estruturar `sdk/` com base em hooks internos.
* Documentar contratos públicos (`contracts.md`).
* Criar repositório paralelo `HomeTARS-Plugins`.

---

## **Roadmap Técnico Consolidado (2025–2026)**

| Fase | Tema                                 | Status                    | Tipo                   | Prioridade |
| ---- | ------------------------------------ | ------------------------- | ---------------------- | ---------- |
| 11   | Integrações Home Assistant / Tuya    | Concluída (offline-ready) | Automação              | Alta       |
| 12   | IA Local e Context Awareness         | Em planejamento           | Autonomia              | Média      |
| 13   | Gmail, Calendar, WhatsApp, Reminders | Concluída (offline-ready) | Conectividade          | Alta       |
| 14   | Voz via Mobile / LAN                 | Próxima                   | Experiência multimodal | Média      |
| 15   | Visão computacional e sensores       | Planejamento              | Expansão sensorial     | Baixa      |
| 16   | SDK / Extensões                      | Futuro                    | Ecossistema aberto     | Baixa      |

---

## **Notas Finais**

* As fases 11 e 13 estão completas em modo offline; basta configurar variáveis e reiniciar o backend para ativação real.
* O roadmap 12–16 prioriza contexto, autonomia e expansibilidade.
* A documentação (contracts, operations, roadmap) está alinhada ao branch principal.

> *“O TARS não será apenas um sistema doméstico inteligente. Será uma extensão da percepção humana.”*
