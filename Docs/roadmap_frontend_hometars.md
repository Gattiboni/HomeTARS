🨭 HomeTARS — Roadmap Frontend 2025 (versão otimizada para evolução incremental)

> "O front é o rosto, o backend é o cérebro, e o TARS é a consciência entre eles." Este roadmap define a evolução **incremental e contínua** do frontend do HomeTARS — construído **desde a base dentro do React**, utilizando **JS/CSS puros** nas primeiras fases e evoluindo progressivamente em camadas de funcionalidade.

## Visão

O **frontend do HomeTARS** é a interface viva e inteligente do sistema: um **terminal sci-fi** inspirado no TARS de *Interstellar*, crescendo em camadas — primeiro funcional, depois imersivo, e finalmente cognitivo.

Deve transmitir:

- **Controle total** (logs, comandos, feedback)
- **Imersão visual** (tela preta, texto verde neon, animações e sons)
- **Interação multimodal** (voz, toque, texto)
- **Modularidade evolutiva** (painéis, IA, plugins)

## 🧯 Estrutura Base do Projeto

Toda a evolução ocorrerá **dentro do projeto React**, garantindo reuso e consistência:

```
/frontend
 ├── /src
 │    ├── core/              # Núcleo (estado, eventos, API, hooks)
 │    ├── ui/                # Componentes visuais (Terminal, Header, Logs, Input)
 │    ├── systems/           # Módulos de voz, IA, automação (a partir da Phase 5)
 │    ├── assets/            # Sons, fontes e imagens
 │    ├── styles/            # CSS e temas globais
 │    ├── App.jsx
 │    └── main.jsx
 ├── /public
 ├── package.json
 ├── Dockerfile
 └── README.md
```

O React será utilizado **como framework estrutural** desde o início, mas as **fases iniciais usarão JS e CSS puros** nos componentes — sem bibliotecas adicionais — para manter simplicidade e velocidade.

---

## Etapas Incrementais

### **Phase 1 — Base Estrutural (Terminal Desperta)**

**Objetivo:** criar a base visual e funcional do terminal TARS.\
**Foco:** estrutura, layout, estilo sci-fi e interações simuladas.\
**Implementação:** componentes React com lógica em JS puro.

**Entregas:**

- Estrutura `/src` com pastas `core`, `ui`, `styles`, `assets`
- Componentes básicos: `Header`, `Logs`, `CommandInput`
- Layout terminal com cabeçalho **TARS SYSTEM ONLINE**
- Estilo sci-fi: **tela preta**, **fonte Roboto Mono**, **texto verde neon**, brilho no cabeçalho
- Animações de boot sequence e cursor piscante
- Logs simulados com sons leves de teletipo
- Input funcional com comandos mockados (`help`, `status`, `clear`, `time`)
- Respostas fake com auto-scroll e sons
- Responsividade total (desktop, tablet, mobile)

### **Phase 2 — Comunicação com Backend**

**Objetivo:** conectar com FastAPI.\
**Foco:** endpoints reais e feedback dinâmico.

**Entregas:**

- Integração REST:
  - `GET /status` → indicador ONLINE/OFFLINE
  - `GET /logs` → histórico real
  - `POST /command` → envio de comandos reais
- Loader de boot (“BOOTING SEQUENCE…”)
- Tratamento de erros (“CORE LINK LOST”)
- Logs e status atualizados via API

### **Phase 3 — Reatividade e WebSocket**

**Objetivo:** tornar o terminal vivo.\
**Foco:** reatividade em tempo real e feedback visual.

**Entregas:**

- Conexão WebSocket para logs em tempo real
- Efeitos de digitação, animações e transições
- Reações visuais por tipo de comando
- Modo debug (payloads e tempo de resposta)

### **Phase 4 — Inteligência de Comandos**

**Objetivo:** adicionar parsing e IA contextual.\
**Foco:** entender intenções e sugerir ações.

**Entregas:**

- Parser local para comandos
- Sugestões automáticas ("did you mean...")
- Diferenciação visual por tipo de resposta
- Conexão com `/ai` para respostas geradas

### **Phase 5 — Voz e Multimodalidade**

**Objetivo:** ativar o TARS falante.\
**Foco:** voz e síntese auditiva.

**Entregas:**

- Captura de voz (Web Speech API)
- Transcrição e envio automático
- SpeechSynthesis para respostas
- Indicador visual de microfone ativo

### **Phase 6 — Dashboard Modular**

**Objetivo:** expandir para múltiplos modos.\
**Foco:** organização por painéis.

**Entregas:**

- Modos: Terminal / Logs / Status / Automations
- Navbar ou comando `switch mode`
- Painéis modulares com CSS Grid/Flex

### **Phase 7 — Integrações Reais**

**Objetivo:** conectar ao ecossistema.\
**Foco:** automação e controle real.

**Entregas:**

- Home Assistant / Tuya (API/MQTT)
- Painel de dispositivos e sensores
- Comandos de voz reais

### **Phase 8 — Personalização e IA Local**

**Objetivo:** autonomia e adaptação.\
**Foco:** temas, perfis e modo offline.

**Entregas:**

- Temas TARS/CASE/Mission Control
- Configurações persistentes (LocalStorage)
- Integração com IA local (Llama/Mistral)
- PWA e cache offline

### **Phase 9 — Extensões e Plugins**

**Objetivo:** abrir o sistema.\
**Foco:** modularidade e extensibilidade.

**Entregas:**

- API interna de extensões
- Plugins externos dinâmicos
- Suporte a visão computacional e sensores externos

---

## Stack Base

| Categoria  | Tecnologia                           | Observação                      |
| ---------- | ------------------------------------ | ------------------------------- |
| Framework  | **React + Vite**                     | Base estrutural desde a Phase 1 |
| Lógica UI  | JS (ES6+) puro                       | Sem libs extras inicialmente    |
| Estilo     | CSS puro (futuro: Tailwind opcional) | Tema sci-fi TARS                |
| Tipografia | Roboto Mono (Google Fonts)           | Padrão do sistema               |
| Som        | Áudios leves tipo teletipo           | Feedback imersivo               |
| Voz        | Web Speech API                       | Chrome/Safari compatível        |
| Backend    | FastAPI (REST + WebSocket)           | Integração incremental          |
| Deploy     | Docker + Nginx                       | Build unificado                 |

---

## Diretriz

Cada fase deve **evoluir o mesmo código-base**, incrementando funcionalidades sem reescrever camadas anteriores.\
O resultado final será um **terminal TARS interativo, responsivo e inteligente**, refletindo a consciência viva do sistema.

