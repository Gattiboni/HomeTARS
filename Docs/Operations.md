# HomeTARS — Operações e Manutenção

> *Procedimentos, monitoramento e práticas recomendadas para operação, deploy e suporte contínuo do sistema TARS.*

---

## **1. Estrutura Operacional**

### **Ambientes**
- **Desenvolvimento Local:**
  - Frontend e backend executados em modo standalone via VS Code.
  - Supabase e MongoDB configurados localmente conforme `.env`.
- **Ambiente de Testes (Emergent Platform):**
  - Build automatizado e execução de testes headless.
  - Flags de economia ativas (`AI_DISABLED`, `VOICE_DISABLED`, `TEST_MODE`).
- **Produção (Servidor Local Permanente):**
  - FastAPI + Uvicorn rodando sob `supervisord`.
  - Nginx atuando como proxy reverso.
  - Frontend servido via `build/` estático.

### **Topologia de Processos**
| Processo | Serviço | Descrição |
|-----------|----------|------------|
| `supervisord` | Gerenciamento | Inicia e reinicia o backend automaticamente |
| `uvicorn` | Backend | Servidor ASGI que hospeda FastAPI |
| `nginx` | Proxy | Distribui frontend e redireciona rotas para backend/WS |
| `mongod` | Banco | MongoDB local (ou containerizado) |
| `node` | Frontend | React build/serve (modo local) |

---

## **2. Inicialização e Deploy**

### **Setup inicial (local)**
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # (ou venv\Scripts\activate no Windows)
pip install -r requirements.txt
uvicorn app.server:app --reload

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
- **Backend:** `/var/log/supervisor/backend.log`
- **Frontend:** logs locais no console ou `frontend/.next/logs` (se NextJS futuramente)
- **GPT Link:** `/app/logs/gpt_sessions/{session_id}.json`

---

## **3. Variáveis de Ambiente (.env)**
| Variável | Descrição | Exemplo |
|-----------|------------|----------|
| `MONGO_URL` | Conexão MongoDB | `mongodb://localhost:27017/tars` |
| `SUPABASE_URL` | URL Supabase (opcional) | `https://hcxbvapuqzeqlyzasuqa.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave Supabase | `<chave>` |
| `OPENAI_API_KEY` | Chave API OpenAI | `sk-proj-XXXX` |
| `AI_DISABLED` | Desativa IA (modo econômico) | `true`/`false` |
| `VOICE_DISABLED` | Desativa voz/TTS | `true`/`false` |
| `WS_DISABLED` | Desativa WebSocket | `true`/`false` |
| `TEST_MODE` | Ativa modo de teste | `true`/`false` |

---

## **4. Estrutura de Logs e Monitoramento**

### **Logs do TARS**
Localização: `backend/app/logs/`

| Tipo | Prefixo | Descrição |
|-------|----------|------------|
| Sistema | `[SYSTEM]` | Inicialização e status geral |
| Erros | `[ERROR]` | Falhas críticas e exceções |
| IA | `[AI]` | Requisições e respostas GPT/Whisper/TTS |
| Automação | `[AUTOMATION]` | Comandos e feedbacks de automação |
| GPT Link | `[GPT][session_id]` | Conversas persistentes via proxy |

### **Rotação e persistência**
- Rotação diária via script cron (`logrotate` recomendado).
- Retenção padrão: 14 dias.
- Logs antigos comprimidos em `/logs/archive/`.

### **Monitoramento ativo (opcional)**
- **UptimeRobot**: monitor HTTP `/api/status`.
- **Healthcheck interno:** `/api/status` retorna `ONLINE`/`OFFLINE`.

---

## **5. Backups e Recuperação**

### **MongoDB (backup manual)**
```bash
mongodump --db tars --out /backups/$(date +%F)
```

### **Supabase (automático)**
- Backup diário configurado via dashboard Supabase.

### **Logs e Sessões GPT**
- Arquivos `.json` versionados localmente e sincronizados em `/app/logs/gpt_sessions/`.
- Recomenda-se backup incremental com Git LFS ou rsync.

---

## **6. Flags Operacionais e Modos de Execução**

| Flag | Efeito | Uso recomendado |
|-------|---------|-----------------|
| `AI_DISABLED` | IA desativada; responde com mock | Durante desenvolvimento e testes |
| `VOICE_DISABLED` | Desativa microfone e TTS | Ambientes headless |
| `WS_DISABLED` | Pausa logs em tempo real | Ambientes de preview |
| `TEST_MODE` | Reduz chamadas e logs | Testes automatizados |

---

## **7. Segurança e Custos**

- **Segredos:** armazenados apenas no `.env` (não versionado).
- **Acesso:** credenciais OpenAI e Supabase restritas a servidor backend.
- **Modo econômico:** ativo por padrão no ambiente de staging.
- **Auditoria:** logs de acesso e eventos GPT mantidos por 14 dias.

---

## **8. Testes e Verificação de Integridade**

### **Frontend (Jest + React Testing Library)**
```bash
npm run test
```
- Valida renderização, eventos e persistência de estado.

### **Backend (Pytest)**
```bash
pytest -v
```
- Testa rotas `/api/*`, integração WS e persistência Mongo.

### **Testes automatizados (Emergent)**
- Executados ao final de cada Phase.
- Incluem verificação de boot, automações, IA, multimodalidade e performance.

---

## **9. Procedimento de Atualização (Sprints / Branches)**

1. Criar nova branch para sprint (ex: `Neo`, `Phase11`, etc.).
2. Desenvolver e testar em ambiente Emergent.
3. Rodar testes automatizados finais (`TEST_MODE=false`).
4. Merge → `main` com commit descritivo (ex: `feat: merge Neo sprint → main (v1.0.0 baseline)`).
5. Gerar documentação (`README`, `CHANGELOG`, `DECISION_LOG`, `ROADMAP`).

---

## **10. Próximos Passos Operacionais**

- Containerização via Docker Compose.
- Integração contínua com GitHub Actions (lint + build + testes).
- Dashboard interno de monitoramento (CPU, memória, uptime, latência WS).
- Implementar healthcheck periódico via `/api/status` + alertas automáticos.

---

> *“Um sistema confiável é aquele que continua funcionando mesmo quando o humor do TARS não está dos melhores.”*

