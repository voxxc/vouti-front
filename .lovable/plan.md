

## Garantir acesso completo ao historico de conversas apos transferencia

### Problema atual

Quando uma conversa e transferida, o sistema atualiza o `agent_id` das mensagens existentes do agente antigo para o novo:

```
UPDATE whatsapp_messages SET agent_id = newAgentId
WHERE from_number = phone AND agent_id = currentAgentId
```

Isso funciona parcialmente, mas tem falhas:

1. **Mensagens recebidas (incoming)** tem `agent_id` definido pela instancia no webhook -- se a conversa ja passou por varios agentes, so as mensagens do agente atual sao transferidas. Mensagens de agentes anteriores ficam "orfas" para o novo agente.
2. **Apos a transferencia**, novas mensagens recebidas pelo webhook continuam chegando com o `agent_id` da instancia original (no caso de "Atribuir"/mesma instancia), entao o novo agente pode nao ve-las na inbox filtrada.

### Solucao: Campo `visible_to_agents` (array de agent_ids)

Em vez de mover mensagens (o que gasta a mesma quantidade de espaco e perde rastreabilidade), a abordagem mais eficiente e adicionar um campo **array** na tabela `whatsapp_messages` que lista quais agentes podem ver cada mensagem.

**Porem**, isso exigiria alterar todas as queries de listagem e o webhook -- complexidade alta.

### Solucao escolhida: Tabela de acesso compartilhado (mais simples e economica)

Criar uma tabela leve `whatsapp_conversation_access` que registra quais agentes tem acesso a quais conversas (por telefone). Quando uma transferencia ocorre, insere um registro dando acesso ao novo agente. O carregamento de mensagens passa a consultar essa tabela para incluir mensagens de todos os agentes com acesso aquele telefone.

---

### Arquivos a modificar

| Arquivo | Acao |
|---|---|
| **Migration SQL** | Criar tabela `whatsapp_conversation_access` (tenant_id, agent_id, phone, granted_by_agent_id, created_at) |
| `src/components/WhatsApp/components/TransferConversationDialog.tsx` | Ao transferir, inserir registro de acesso para o novo agente em vez de (ou alem de) mover mensagens |
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx` | No `loadConversations` e `loadMessages`, consultar `whatsapp_conversation_access` para incluir conversas compartilhadas |
| `src/components/WhatsApp/sections/WhatsAppKanban.tsx` | Ajustar queries de mensagens para incluir conversas com acesso compartilhado |

---

### Detalhes tecnicos

**1. Nova tabela**

```text
CREATE TABLE whatsapp_conversation_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  agent_id UUID NOT NULL,          -- agente que recebe acesso
  phone TEXT NOT NULL,             -- numero do contato
  granted_by_agent_id UUID,        -- agente que transferiu
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX ON whatsapp_conversation_access (agent_id, phone);
ALTER TABLE whatsapp_conversation_access ENABLE ROW LEVEL SECURITY;
```

**2. TransferConversationDialog.tsx**

No `handleReassignAndNotify`, alem de mover as mensagens (manter o UPDATE existente para que a inbox do novo agente mostre as mensagens), tambem inserir um registro de acesso:

```text
await supabase.from("whatsapp_conversation_access").upsert({
  tenant_id,
  agent_id: newAgentId,
  phone: conversation.contactNumber,
  granted_by_agent_id: currentAgentId,
});
```

Isso garante que mesmo que o UPDATE de agent_id nao pegue todas as mensagens (ex: mensagens de agentes anteriores), o novo agente tera acesso ao historico completo pelo telefone.

**3. WhatsAppInbox.tsx - loadMessages**

Atualmente filtra por `agent_id = myAgentId`. Alterar para: se o agente tem acesso compartilhado ao telefone, carregar TODAS as mensagens daquele telefone (sem filtro de agent_id), garantindo visibilidade total:

```text
// Verificar se tem acesso compartilhado
const { data: access } = await supabase
  .from("whatsapp_conversation_access")
  .select("id")
  .eq("agent_id", myAgentId)
  .eq("phone", normalizedPhone)
  .maybeSingle();

// Se tem acesso compartilhado, carregar todas as mensagens do telefone
if (access) {
  query = supabase.from("whatsapp_messages").select("*").eq("tenant_id", tenantId);
  // sem filtro de agent_id - ve tudo
} else {
  query = query.eq("agent_id", myAgentId);
}
```

**4. WhatsAppInbox.tsx - loadConversations**

No carregamento da lista de conversas, alem de buscar mensagens com `agent_id = myAgentId`, tambem buscar telefones onde o agente tem acesso compartilhado e inclui-los na lista.

**5. WhatsAppKanban.tsx**

Para as mensagens exibidas nos cards do Kanban, verificar acesso compartilhado da mesma forma.

---

### Vantagens desta abordagem

- **Economiza espaco**: nao duplica mensagens, apenas cria um registro leve de acesso por conversa
- **Rastreavel**: sabe-se quem deu acesso (granted_by_agent_id)
- **Historico completo**: o novo agente ve TODAS as mensagens daquele telefone, incluindo de agentes anteriores
- **Nao quebra nada**: o fluxo existente continua funcionando, so adiciona visibilidade

