

## Adicionar nome do agente nas mensagens enviadas pelo CRM Chat

### Problema

O componente `WhatsAppBot.tsx` (tela do CRM em `/crm`) envia mensagens sem passar `agentName` nem `agentId` para a Edge Function. Por isso, mensagens enviadas por ali nao incluem o nome do agente.

Os componentes `WhatsAppInbox` e `WhatsAppAllConversations` ja foram corrigidos, mas o CRM Chat ficou de fora.

### Solucao

Adicionar no `WhatsAppBot.tsx` a mesma logica dos outros componentes:
1. Resolver o `agentId` do usuario logado (via email na tabela `whatsapp_agents`)
2. Antes de enviar cada mensagem, buscar o nome atualizado do agente direto do banco
3. Passar `agentName` e `agentId` no body da chamada a Edge Function

### Mudancas tecnicas

**Arquivo**: `src/components/CRM/WhatsAppBot.tsx`

1. Adicionar estados `myAgentId` e `myAgentName` ao componente
2. No `useEffect` inicial, buscar o agente vinculado ao email do usuario logado (mesma logica do Inbox)
3. Na funcao `sendMessage` (linha ~231), antes de invocar a Edge Function:
   - Buscar nome fresco: `SELECT name FROM whatsapp_agents WHERE id = myAgentId`
   - Passar `agentName: freshAgentName` e `agentId: myAgentId` no body

```text
// Dentro de sendMessage, antes do invoke:
let freshAgentName = myAgentName;
if (myAgentId) {
  const { data: agentData } = await supabase
    .from("whatsapp_agents")
    .select("name")
    .eq("id", myAgentId)
    .single();
  if (agentData) freshAgentName = agentData.name;
}

// No body do invoke:
body: {
  phone: selectedContact.number,
  message: newMessage,
  messageType: 'text',
  agentName: freshAgentName || undefined,
  agentId: myAgentId || undefined
}
```

### Resultado esperado

- Mensagens enviadas pelo CRM Chat passam a incluir o nome do agente em negrito
- Ao alterar o nome nas configuracoes, a proxima mensagem ja usa o nome novo sem recarregar
- Comportamento identico ao Inbox e Todas as Conversas
