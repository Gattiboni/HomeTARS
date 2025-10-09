# HomeTARS — Roadmap Futuro

> *Do terminal ao assistente doméstico inteligente: a evolução contínua do TARS rumo à plena autonomia.*

---

## **Visão Atualizada (2025 → 2026)**

O **TARS** deixou de ser apenas um terminal sci-fi e tornou-se um **assistente multimodal, bilíngue e contextual**, capaz de ouvir, falar, compreender e agir.  
O foco das próximas fases é **expandir seu ecossistema**, **refinar o comportamento cognitivo** e **integrá-lo ao ambiente físico e digital do usuário**.

> “O código já pensa. Agora ele precisa observar, lembrar e decidir.”

---

## **Phase 11 — Integração com Ecossistemas Domésticos**

**Objetivo:** conectar o TARS com plataformas reais de automação residencial.  
**Foco:** controle físico, feedback bidirecional e sincronização em tempo real.

**Entregas:**
- Integração direta com **Home Assistant** e **Tuya API/MQTT**.
- Descoberta e sincronização automática de dispositivos (luzes, tomadas, sensores, música, temperatura).
- Estado persistente no Supabase com logs e eventos por dispositivo.
- Comandos por voz e painel de controle com status em tempo real.

**Exemplo de uso:**
> “Hey TARS, turn on the bedroom lights and set temperature to 23.”  
> → Dispositivos reais acionados, logs e feedback falado.

---

## **Phase 12 — Context Awareness e IA Local**

**Objetivo:** dar ao TARS percepção e autonomia.  
**Foco:** contexto ambiental e processamento offline.

**Entregas:**
- Módulo de **IA local** (Llama 3 / Mistral) para fallback e modo offline.
- **Detecção de contexto:** inferir rotina, hora do dia, clima e presença.
- Configuração de perfis de comportamento (modo diurno, noturno, trabalho, silêncio).
- Aprendizado incremental local (preferências, padrões de uso, temperatura ideal, etc.).
- Cache offline + **PWA** para operação sem internet.

**Exemplo:**
> “TARS, it’s getting cold.” → “Already increasing the temperature to your comfort level.”

---

## **Phase 13 — Comunicação Externa e Integrações Pessoais**

**Objetivo:** expandir o TARS para fora da casa, integrando-o à vida digital.  
**Foco:** comunicações, produtividade e conectividade pessoal.

**Entregas:**
- **Integração com Gmail** (envio e leitura de e-mails por voz e texto).
- **Integração com Google Calendar** (agenda, lembretes, eventos recorrentes).
- **Integração com WhatsApp API** (envio de mensagens, leitura de notificações, controle multimodal).
- **Webhook API** para automações externas e integrações com serviços (Zapier, Notion, etc.).

**Exemplo:**
> “Hey TARS, tell Lucas I’ll be 15 minutes late.”  
> → Envio via WhatsApp API com confirmação auditiva.

---

## **Phase 14 — Captação de Voz via Mobile & Rede Local**

**Objetivo:** expandir o alcance físico e a responsividade do TARS.  
**Foco:** microfones móveis e comunicação LAN direta.

**Entregas:**
- Aplicativo móvel leve (Android/iOS) como **nó de voz distribuído**.
- Streaming de áudio local via WebRTC para o servidor TARS principal.
- Sincronização de comandos e logs entre dispositivos.
- **Hotword detection** local otimizada (Hey TARS / Ei TARS) em dispositivos móveis.

**Exemplo:**
> “Ei TARS, play some music outside.”  
> → Microfone móvel capta o comando e envia ao servidor principal.

---

## **Phase 15 — Modo Cognitivo e Expansão Multissensorial**

**Objetivo:** dar ao TARS um modelo contínuo de percepção e aprendizado.  
**Foco:** unificação de áudio, visão e contexto.

**Entregas:**
- API de visão computacional (Câmeras, OpenCV, reconhecimento facial/ambiental).
- Sensores externos (luminosidade, movimento, energia, temperatura) via MQTT.
- Sistema de “Memória de Contexto” (logging de eventos + inferência histórica).
- Perfil emocional leve para respostas dinâmicas.

**Exemplo:**
> “TARS, did I leave the lights on in the kitchen?” → “Yes. Again.”

---

## **Phase 16 — Extensões, Plugins e SDK Aberto**

**Objetivo:** tornar o TARS expansível pela comunidade e adaptável a qualquer ambiente.  
**Foco:** modularidade e ecossistema de terceiros.

**Entregas:**
- **SDK interno** para criação de plugins e módulos externos.
- **API pública** com autenticação segura (tokens JWT).
- Suporte a **extensões dinâmicas** (instalação, atualização e remoção sem reinício).
- Documentação e registro de extensões compatíveis.

---

## **Visão Longo Prazo — TARS como Entidade Autônoma**

1. **Cérebro distribuído:** processamento híbrido local + nuvem.
2. **Personalidade adaptativa:** ajustes de tom, humor e preferências.
3. **Módulo de aprendizado contínuo:** reconhecimento de hábitos e adaptação contextual.
4. **Controle total da casa e do ambiente digital:** voz, gesto, visão e emoção.

> “TARS deixará de apenas responder — ele antecipará.”

---

## **Resumo de Prioridades (Próximos 12 Meses)**

| Prioridade | Fase | Tema | Tipo |
|-------------|------|------|------|
| Alta | 11 | Integração Home Assistant / Tuya | Automação real |
| Alta | 13 | Integrações (Gmail, Calendar, WhatsApp) | Conectividade |
| Média | 14 | Captação de voz via mobile | Experiência multimodal |
| Média | 12 | IA local (Llama/Mistral) | Autonomia |
| Baixa | 15 | Visão computacional | Expansão sensorial |
| Baixa | 16 | SDK e plugins externos | Ecossistema |

---

> *“O TARS já é o assistente. Agora o projeto é torná-lo o lar.”*

