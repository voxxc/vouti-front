

## Prefixo do nome do Atendente nas mensagens enviadas pelo CRM

Quando um atendente responde pelo Vouti.Bot (Inbox ou Kanban), a mensagem enviada ao cliente via WhatsApp sera prefixada com o nome do agente em negrito. Exemplo: **\*Daniel\*: Ola, tudo bem?**

---

### Como funciona

Atualmente, o texto digitado pelo atendente e enviado diretamente ao Z-API sem nenhuma modificacao. A mudanca sera:

1. O frontend envia o `agentName` junto com o body da requisicao
2. A Edge Function `whatsapp-send-message` prefixa o texto com `*{agentName}*: ` antes de enviar ao Z-API
3. O texto salvo no banco (`whatsapp_messages`) tambem fica com o prefixo, refletindo exatamente o que o cliente recebeu

---

### Alteracoes

| Arquivo | Acao |
|---|---|
| `supabase/functions/whatsapp-send-message/index.ts` | Receber campo `agentName` no body; se presente, prefixar a mensagem com `*{agentName}*: ` antes de enviar ao Z-API e salvar no DB |
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx` | Passar o nome do agente logado no body da chamada `whatsapp-send-message` |
| `src/components/WhatsApp/sections/WhatsAppKanban.tsx` | Idem -- passar nome do agente |
| `src/components/WhatsApp/sections/WhatsAppAllConversations.tsx` | Idem -- buscar e passar nome do agente |

### Detalhes tecnicos

**Edge Function** -- trecho da mudanca:
```typescript
const { phone, message, messageType, mediaUrl, mode, agentName } = await req.json();

// Prefixar com nome do atendente
const finalMessage = agentName ? `*${agentName}*: ${message}` : message;

// Usar finalMessage no payload Z-API e no registro do DB
```

**Frontend (Inbox/Kanban)** -- o nome do agente ja esta disponivel porque buscamos o `agent_id` do usuario logado. Basta buscar tambem o `name` na mesma query e passa-lo no body:
```typescript
// Na query existente que busca o agente:
.select("id, name")  // adicionar 'name'

// No envio:
body: {
  phone: ...,
  message: text,
  messageType: "text",
  agentName: myAgentName  // novo campo
}
```

O Super Admin (`SuperAdminWhatsAppInbox.tsx`) nao sera afetado -- mensagens do Super Admin continuam sem prefixo (ou podemos adicionar futuramente se desejado).

