

## Correcao: Transferencia de conversa na mesma instancia

### Problema identificado

Quando Daniel transfere um lead para Laura usando "Atribuir (mesma instancia)", ha dois problemas:

1. **Mensagens enviadas**: O `handleAssign` nao passa `agentId` na chamada ao `whatsapp-send-message`, entao a mensagem de transferencia nao fica associada ao agente correto no banco.

2. **Mensagens recebidas (bug principal)**: O webhook (`whatsapp-webhook`) recebe a resposta do lead e atribui a mensagem ao `instance.agent_id` -- que e o Daniel (dono da instancia). Como Laura nao e dona da instancia, as respostas do lead nunca chegam na inbox dela. O webhook nao tem conhecimento de que aquela conversa foi transferida para outro agente.

### Solucao

Implementar um mecanismo de "roteamento por conversa" no webhook. Quando uma mensagem chega, antes de usar o `agent_id` da instancia, o webhook deve verificar se existe um registro em `whatsapp_conversation_kanban` para aquele telefone + instancia, e usar o `agent_id` desse registro (o agente que realmente atende o lead).

---

### Arquivos a modificar

| Arquivo | Acao |
|---|---|
| `supabase/functions/whatsapp-webhook/index.ts` | Apos identificar a instancia, consultar `whatsapp_conversation_kanban` para resolver o agente real da conversa |
| `src/components/WhatsApp/components/TransferConversationDialog.tsx` | Passar `agentId` correto na mensagem de transferencia do tipo "assign" |

---

### Detalhes tecnicos

**1. whatsapp-webhook/index.ts -- roteamento por conversa**

Apos resolver a instancia e obter `instance.agent_id`, adicionar uma busca no kanban para verificar se a conversa pertence a outro agente:

```text
// Apos obter instance.agent_id (agente dono da instancia)
let effectiveAgentId = instance.agent_id;

// Verificar se a conversa foi transferida para outro agente
const { data: kanbanEntry } = await supabase
  .from('whatsapp_conversation_kanban')
  .select('agent_id')
  .eq('phone', phone)
  .eq('tenant_id', effectiveTenantId)
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (kanbanEntry?.agent_id) {
  effectiveAgentId = kanbanEntry.agent_id;
}
```

Esse `effectiveAgentId` substitui `instance.agent_id` em todos os pontos onde a mensagem e salva no banco e onde o AI config e consultado. Assim, a mensagem vai para a inbox do agente que realmente atende aquele lead.

**2. TransferConversationDialog.tsx -- handleAssign**

Atualmente a funcao `handleAssign` nao passa `agentId` na chamada:

```text
// Antes (linha 168-174):
await supabase.functions.invoke("whatsapp-send-message", {
  body: {
    phone: conversation.contactNumber,
    message: transferMessage(selectedAgent.name),
    messageType: "text",
  },
});

// Depois:
await supabase.functions.invoke("whatsapp-send-message", {
  body: {
    phone: conversation.contactNumber,
    message: transferMessage(selectedAgent.name),
    messageType: "text",
    agentId: currentAgentId,  // usa instancia do agente atual (mesma instancia)
  },
});
```

Isso garante que a mensagem de transferencia e enviada pela instancia correta e fica registrada no banco com o agent correto.

---

### Fluxo apos a correcao

1. Daniel transfere lead para Laura (mesma instancia)
2. Mensagem de transferencia e enviada pelo numero do Daniel (correto, mesma instancia)
3. O kanban registra a conversa como pertencente a Laura
4. Lead responde -> webhook recebe a mensagem
5. Webhook consulta kanban -> encontra Laura como agente da conversa
6. Mensagem e salva com `agent_id = Laura` -> aparece na inbox da Laura
7. Laura responde pelo CRM com seu agentId -> mensagem sai pelo mesmo numero (mesma instancia)

