

## Mensagens iniciadas pelo agente aparecem na Caixa de Entrada + Kanban

### Problema atual

Quando um atendente envia a **primeira mensagem** para um contato (inicia uma conversa), o registro salvo em `whatsapp_messages` pela Edge Function `whatsapp-send-message` **nao inclui `agent_id`**. Como a Caixa de Entrada filtra por `agent_id`, essa conversa nao aparece -- e consequentemente tambem nao e inserida no Kanban "Topo de Funil".

### Solucao

Passar o `agent_id` do frontend para a Edge Function e salva-lo no registro da mensagem no banco. Assim, toda mensagem enviada pelo CRM fica vinculada ao agente, e a conversa aparece na Inbox + Kanban automaticamente.

---

### Alteracoes

| Arquivo | Acao |
|---|---|
| `supabase/functions/whatsapp-send-message/index.ts` | Receber campo `agentId` no body e incluir como `agent_id` no registro salvo em `whatsapp_messages` |
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx` | Passar `agentId: myAgentId` no body da chamada `whatsapp-send-message` |
| `src/components/WhatsApp/sections/WhatsAppKanban.tsx` | Passar `agentId` no body da chamada `whatsapp-send-message` |
| `src/components/WhatsApp/sections/WhatsAppAllConversations.tsx` | Buscar e passar `agentId` no body (se disponivel) |

### Detalhes tecnicos

**Edge Function** -- adicionar `agentId` ao body e ao registro:

```typescript
const { phone, message, messageType, mediaUrl, mode, agentName, agentId } = await req.json();

// No messageRecord:
const messageRecord = {
  // ... campos existentes ...
  agent_id: agentId || null,
};
```

**Frontend (Inbox)** -- ja tem `myAgentId` disponivel, basta adicionar ao body:

```typescript
body: {
  phone: ...,
  message: text,
  messageType: "text",
  agentName: myAgentName || undefined,
  agentId: myAgentId || undefined   // NOVO
}
```

A mesma mudanca aplica-se ao Kanban e Todas as Conversas.

Com o `agent_id` salvo, a query da Inbox (`.eq("agent_id", myAgentId)`) ja retornara a conversa, e a logica de `autoInsertToKanban` inserira automaticamente no "Topo de Funil".

