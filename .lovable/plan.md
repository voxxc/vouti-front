
## Configurar Daniel como agente de landing page + melhorias Kanban

### 1. Mensagem de boas-vindas para agentes de Tenant

Atualmente, a interface de "Mensagem de Boas-Vindas" so aparece para o Super Admin. Para o tenant /demorais, o agente Daniel precisa poder configurar sua propria mensagem com variaveis como `{{nome}}`.

**Arquivo**: `src/components/WhatsApp/settings/WhatsAppAISettings.tsx`

- Quando o agente de tenant tem `landing_page_source` definido (ou uma nova opcao "Landing Page Homepage"), exibir o card de "Mensagem de Boas-Vindas" com as mesmas variaveis (`{{nome}}`, `{{email}}`, `{{telefone}}`, `{{tamanho_escritorio}}`)
- Carregar e salvar a mensagem na tabela `whatsapp_lead_triggers` filtrando por `tenant_id` e `lead_source = 'landing_leads'`
- Adicionar uma nova opcao no Select de Landing Page: "Homepage (Landing Page)" com valor `'vouti_landing'`

### 2. Auto-inserir leads no Kanban "Topo Landing PAGE"

Quando o `whatsapp-process-queue` envia uma mensagem de boas-vindas com sucesso, ele ja salva no `whatsapp_messages`, mas nao cria um card no Kanban.

**Arquivo**: `supabase/functions/whatsapp-process-queue/index.ts`

Apos o envio bem-sucedido (linha ~237), adicionar logica para:
- Buscar a coluna "Topo Landing PAGE" (ou a primeira coluna nao-Transferidos) do agente
- Inserir um card em `whatsapp_conversation_kanban` com o telefone do lead, vinculado ao agente e coluna correta
- Usar `ON CONFLICT DO NOTHING` para evitar duplicatas

```text
Fluxo:
Lead preenche form -> DB trigger cria pending_message
  -> Cron processa fila -> Envia via Z-API
    -> Salva mensagem no inbox
    -> NOVO: Cria card no Kanban na coluna "Topo Landing PAGE"
```

### 3. Duplo-clique no Kanban abre conversa

Atualmente, o `onClick` no card do Kanban conflita com o drag-and-drop (o clique dispara ao soltar o arraste).

**Arquivo**: `src/components/WhatsApp/sections/WhatsAppKanban.tsx`

- Trocar `onClick` por `onDoubleClick` no Card (linha 522)
- O `handleCardClick` permanece identico, so muda o evento de disparo

### Detalhes tecnicos

**Mudancas em 3 arquivos:**

| Arquivo | Tipo | Descricao |
|---|---|---|
| `WhatsAppAISettings.tsx` | Frontend | Exibir campo de mensagem de boas-vindas para agentes de tenant com landing page configurada |
| `whatsapp-process-queue/index.ts` | Edge Function | Auto-inserir card no Kanban apos envio bem-sucedido |
| `WhatsAppKanban.tsx` | Frontend | Trocar onClick por onDoubleClick nos cards |

**Migracao SQL**: Nenhuma necessaria. A coluna "Topo Landing PAGE" ja existe (id: `dfbbb398`) no pipeline do Daniel. A tabela `whatsapp_lead_triggers` ja tem um registro ativo para o tenant.
