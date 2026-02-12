

## Corrigir: nome do agente nao atualiza em tempo real ao enviar mensagens

### Problema

Quando o usuario altera o nome do agente nas configuracoes, os componentes `WhatsAppInbox` e `WhatsAppAllConversations` continuam usando o nome antigo armazenado no estado React (`myAgentName`). O nome so e buscado do banco uma vez, na montagem do componente.

### Solucao

Buscar o nome do agente diretamente do banco de dados no momento do envio da mensagem, em vez de usar o valor em cache do estado React.

### Mudancas tecnicas

**Arquivo 1**: `src/components/WhatsApp/sections/WhatsAppInbox.tsx`

Na funcao `handleSendMessage`, antes de chamar a Edge Function, buscar o nome atualizado do agente:

```text
const handleSendMessage = async (text: string) => {
  // Buscar nome atualizado do agente no momento do envio
  let freshAgentName = myAgentName;
  if (myAgentId) {
    const { data: agentData } = await supabase
      .from("whatsapp_agents")
      .select("name")
      .eq("id", myAgentId)
      .single();
    if (agentData) freshAgentName = agentData.name;
  }
  
  // Usar freshAgentName em vez de myAgentName no body
  ...
  agentName: freshAgentName || undefined,
  ...
};
```

**Arquivo 2**: `src/components/WhatsApp/sections/WhatsAppAllConversations.tsx`

Mesma mudanca na funcao `handleSendMessage` deste componente.

### Arquivos afetados

| Arquivo | Mudanca |
|---|---|
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx` | Buscar nome fresco do agente antes de enviar |
| `src/components/WhatsApp/sections/WhatsAppAllConversations.tsx` | Buscar nome fresco do agente antes de enviar |

### Resultado esperado

- Ao alterar o nome do agente nas configuracoes, a proxima mensagem enviada ja usa o nome novo
- Sem necessidade de recarregar a pagina

