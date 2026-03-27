

## Plano: Workflow de Bot no CRM (WhatsApp)

### Onde se encaixa

O CRM já possui a infraestrutura para bots no menu lateral do WhatsApp, dentro de **Configurações**:

```text
WhatsApp CRM Sidebar
├── Inbox
├── Conversas
├── Kanban
├── Contatos
├── Campanhas
├── Relatórios
└── ⚙ Configurações
    ├── Agentes (já tem aba "IA" por agente)
    ├── Automação        ← placeholder "Em desenvolvimento"
    ├── N8N              ← placeholder "Em desenvolvimento"
    ├── Bots             ← placeholder "Em desenvolvimento"
    └── Typebot Bot      ← placeholder "Em desenvolvimento"
```

Existem **4 seções vazias** prontas para receber a lógica de workflows de bot. A proposta é unificá-las em um sistema coerente.

---

### Arquitetura proposta

```text
┌─────────────────────────────────────────────────┐
│              FLUXO DE MENSAGEM                  │
│                                                 │
│  Mensagem recebida (webhook)                    │
│       │                                         │
│       ▼                                         │
│  ┌──────────┐    Sim    ┌───────────────────┐   │
│  │ Bot ativo?├─────────►│ Executar workflow  │   │
│  └────┬─────┘          │ (regras/nós)       │   │
│       │ Não            └────────┬──────────┘   │
│       ▼                        │               │
│  ┌──────────┐           ┌──────▼──────┐       │
│  │ IA ativa?│           │ Ação final: │       │
│  └────┬─────┘           │ - Responder │       │
│       │                 │ - Transferir│       │
│       ▼                 │ - Etiquetar │       │
│  Resposta IA            │ - Webhook   │       │
│  (atual)                └─────────────┘       │
└─────────────────────────────────────────────────┘
```

---

### Plano de implementação

#### 1. Tabela `whatsapp_bot_workflows`
Armazena os workflows configurados por agente/tenant:
- `id`, `tenant_id`, `agent_id`, `name`, `is_active`
- `trigger_type` (keyword, first_message, always, schedule)
- `trigger_value` (palavra-chave ou regex)
- `priority` (ordem de avaliação)

#### 2. Tabela `whatsapp_bot_workflow_steps`
Nós/passos do workflow:
- `workflow_id`, `step_order`, `step_type`
- Tipos: `send_message`, `wait_reply`, `condition`, `transfer_agent`, `add_label`, `webhook`, `delay`, `set_variable`
- `config` (JSONB com parâmetros do passo)

#### 3. Tela "Bots" (settings/WhatsAppBotsSettings)
Substituir o placeholder atual por:
- Lista de workflows do agente/tenant
- Criar/editar workflow com nome, trigger e status
- Editor de passos em lista ordenável (drag-and-drop)
- Cada passo tem um tipo e campos de configuração específicos

#### 4. Tela "Automação" (settings/WhatsAppAutomationSettings)
Regras rápidas sem workflow completo:
- Auto-resposta por horário (fora do expediente)
- Auto-etiqueta por palavra-chave
- Auto-transferência por departamento

#### 5. Integração no webhook (`whatsapp-webhook`)
Antes de processar IA, verificar se existe workflow ativo que faz match com a mensagem recebida. Se sim, executar os passos do workflow ao invés de acionar a IA.

#### 6. Tela "N8N" e "Typebot"
Integrar como **tipos de passo** dentro do workflow:
- Passo tipo `n8n_webhook`: dispara um workflow n8n externo
- Passo tipo `typebot_flow`: inicia um fluxo Typebot

---

### Como usar (fluxo do usuário)

1. Acesse o CRM WhatsApp → Configurações → **Bots**
2. Clique em "Novo Workflow"
3. Defina o **gatilho**: ex. "Quando mensagem contém 'preço'"
4. Adicione **passos**:
   - Enviar mensagem: "Olá! Segue nossa tabela de preços..."
   - Aguardar resposta (30 min timeout)
   - Condição: se resposta contém "sim" → transferir para agente comercial
   - Senão → enviar "Obrigado pelo contato!"
5. Ative o workflow
6. Mensagens que fizerem match serão tratadas automaticamente

---

### Detalhes técnicos

- **Persistência de estado**: tabela `whatsapp_bot_sessions` para rastrear em qual passo o contato está
- **Prioridade**: workflows são avaliados em ordem de prioridade; primeiro match ganha
- **Convivência com IA**: se nenhum workflow faz match, a IA existente (whatsapp_ai_config) é acionada normalmente
- **Passos configuráveis via JSONB**: flexibilidade para adicionar novos tipos sem migração
- **Telas existentes**: as 4 seções placeholder (Bots, Automação, N8N, Typebot) já estão roteadas no sidebar e no layout -- basta substituir o conteúdo

