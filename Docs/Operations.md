# HomeTARS — Operações e Manutenção

> *Procedimentos, monitoramento e práticas recomendadas para operação, deploy e suporte contínuo do sistema HomeTARS.*

---

## **1. Estrutura Operacional**

### **Ambientes**

* **Desenvolvimento Local:**

  * Frontend e backend executados em modo standalone via VS Code.
  * Supabase (opcional) e MongoDB configurados localmente conforme `.env`.
* **Ambiente de Testes (Emergent Platform):**

  * Build automatizado e execução de testes headless.
  * Flags de economia ativas (`AI_DISABLED`, `VOICE_DISABLED`, `TEST_MODE`).
* **Produção (Servidor Local Permanente):**

  * FastAPI + Uvicorn sob `supervisord`.
  * Nginx como proxy reverso.
  * Frontend servido via build estático (`/frontend/build`).

### **Topologia de Processos**

| Processo      | Serviço       | Descrição                                                      |
| ------------- | ------------- | -------------------------------------------------------------- |
| `supervisord` | Gerenciamento | Inicia e reinicia o backend automaticamente                    |
| `uvicorn`     | Backend       | Servidor ASGI (FastAPI)                                        |
| `nginx`       | Proxy         | Serve o frontend e redireciona rotas `/api` e `/api/events/ws` |
| `mongod`      | Banco         | MongoDB local (ou containerizado)                              |
| `node`        | Frontend      | React (modo desenvolvimento ou build estático)                 |

---

## **2. Inicialização e Deploy**

### **Setup inicial (local)**

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # (ou venv\Scripts\activate no Windows)
pip install -r requirements.txt
uvicorn server:app --reload

# Frontend
cd frontend
npm install
npm start
```

### **Build de produção**

```bash
# Frontend
npm run build

# Backend (modo serviço)
sudo supervisorctl restart backend
```

### **Logs do sistema**

* **Backend:** `/var/log/supervisor/backend.log`
* **Frontend:** console local (ou `frontend/.next/logs`, se adaptado a Next.js futuramente)
* **GPT Link:** `./logs/gpt_sessions/{session_id}.json`

---

## **3. Variáveis de Ambiente (.env)**

| Variável                    | Descrição                         | Exemplo                            |
| --------------------------- | --------------------------------- | ---------------------------------- |
| `MONGO_URL`                 | URL de conexão MongoDB            | `mongodb://localhost:27017/tars`   |
| `DB_NAME`                   | Nome do banco MongoDB             | `tars`                             |
| `SUPABASE_URL`              | URL Supabase (opcional)           | `https://xxxxx.supabase.co`        |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave Supabase                    | `<chave>`                          |
| `OPENAI_API_KEY`            | Chave API OpenAI                  | `sk-proj-XXXX`                     |
| `AI_DISABLED`               | Desativa IA (modo econômico)      | `true` / `false`                   |
| `VOICE_ONLINE`              | Habilita TTS/STT reais            | `true` / `false`                   |
| `HA_ENABLED`                | Habilita Home Assistant           | `true` / `false`                   |
| `HOME_ASSISTANT_URL`        | Endpoint Home Assistant           | `http://localhost:8123/api`        |
| `HOME_ASSISTANT_TOKEN`      | Token de longa duração            | `<token>`                          |
| `TUYA_ENABLED`              | Habilita integração Tuya          | `true` / `false`                   |
| `TUYA_ACCESS_ID`            | ID Tuya Cloud                     | `<id>`                             |
| `TUYA_ACCESS_SECRET`        | Chave Tuya Cloud                  | `<secret>`                         |
| `TUYA_REGION`               | Região Tuya Cloud                 | `us` / `eu` / `cn`                 |
| `GOOGLE_CLIENT_ID`          | Client ID Google                  | `<id>`                             |
| `GOOGLE_CLIENT_SECRET`      | Client Secret                     | `<secret>`                         |
| `GOOGLE_REFRESH_TOKEN`      | Token de atualização              | `<token>`                          |
| `WHATSAPP_API_URL`          | URL API WhatsApp                  | `https://graph.facebook.com/v17.0` |
| `WHATSAPP_TOKEN`            | Token WhatsApp                    | `<token>`                          |
| `REACT_APP_BACKEND_URL`     | URL do backend lida pelo frontend | `http://localhost:8001`            |
| `TEST_MODE`                 | Reduz chamadas externas/logs      | `true` / `false`                   |

---

## **4. Logs e Monitoramento**

### **Localização dos logs**

* Diretório principal: `backend/app/logs/`
* Sessões GPT Link: `./logs/gpt_sessions/`

| Tipo      | Prefixo             | Descrição                               |
| --------- | ------------------- | --------------------------------------- |
| Sistema   | `[SYSTEM]`          | Inicialização e status geral            |
| Erros     | `[ERROR]`           | Falhas e exceções                       |
| IA        | `[AI]`              | Requisições e respostas GPT/Whisper/TTS |
| Automação | `[AUTOMATION]`      | Comandos e feedbacks                    |
| GPT Link  | `[GPT][session_id]` | Conversas persistentes                  |
| Reminders | `[REMINDER]`        | Criação e conclusão de lembretes        |

### **WebSocket**

* Endpoint: `/api/events/ws` transmite logs e eventos em tempo real.

### **Healthcheck e monitoramento**

* **Interno:** `/api/status` retorna `ONLINE`.
* **Externo:** monitor HTTP via UptimeRobot ou similar.
* **Logs rotacionados:** rotacionar diariamente (logrotate), reter 14 dias.

---

## **5. Persistência e Backups**

### **MongoDB (backup manual)**

```bash
mongodump --db tars --out /backups/$(date +%F)
```

### **Supabase (automático)**

* Backup agendado via dashboard Supabase.

### **Logs e Sessões GPT**

* Persistência local em `/app/logs/gpt_sessions/`.
* Recomenda-se backup incremental (Git LFS, rsync ou cron).

---

## **6. Flags e Modos Operacionais**

| Flag           | Efeito                          | Uso recomendado                   |
| -------------- | ------------------------------- | --------------------------------- |
| `AI_DISABLED`  | Desativa IA, usa respostas mock | Desenvolvimento/teste             |
| `VOICE_ONLINE` | Habilita TTS/STT reais          | Produção/local com chave válida   |
| `WS_DISABLED`  | Desativa WebSocket              | Ambientes de preview              |
| `TEST_MODE`    | Reduz chamadas/logs             | Testes automatizados              |
| `HA_ENABLED`   | Ativa integração Home Assistant | Quando chaves válidas disponíveis |
| `TUYA_ENABLED` | Ativa Tuya Cloud                | Quando chaves válidas disponíveis |

---

## **7. Execução e Diagnóstico**

### **Rotina de inicialização**

1. Backend sobe com `uvicorn` em `0.0.0.0:8001`.
2. Frontend conecta via `REACT_APP_BACKEND_URL`.
3. `supervisord` garante reinício automático.

### **Diagnóstico e logs de erro**

```bash
tail -n 100 /var/log/supervisor/backend*.log
```

* Se `502` nos endpoints de voz: validar `OPENAI_API_KEY` e `VOICE_ONLINE`.
* WebSocket falhando: verificar rota `/api/events/ws` e proxy Nginx.

---

## **8. Testes e Verificação de Integridade**

### **Frontend**

```bash
npm run test
```

* Testes unitários (Jest + React Testing Library).

### **Backend**

```bash
pytest -v
```

* Testa rotas `/api/*`, WS e persistência Mongo.

### **Emergent Platform**

* Testes automatizados a cada fase (boot, IA, voz, automações, integrações).

---

## **9. Atualizações e Versionamento**

1. Criar nova branch para sprint (`Neo`, `Phase11`, etc.).
2. Desenvolver/testar em ambiente Emergent.
3. Rodar `deep_testing_backend` e `frontend manual test`.
4. Merge para `main` com commit descritivo.
5. Atualizar `README`, `CHANGELOG`, `DECISION_LOG`, `ROADMAP`, `OPERATIONS`.

---

## **10. Futuras Ações Operacionais**

* Containerização com Docker Compose.
* Integração Contínua (GitHub Actions: lint + build + test).
* Painel de monitoramento interno (CPU, memória, uptime, latência WS).
* Healthcheck automático com alertas.

---

> *“Um sistema confiável é aquele que continua funcionando mesmo quando o humor do TARS não está dos melhores.”*
