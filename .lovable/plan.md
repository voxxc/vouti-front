

## Corrigir erro ao apagar agente - FK transferred_from_agent_id

### Problema

A tabela `whatsapp_conversation_kanban` possui a coluna `transferred_from_agent_id` que referencia `whatsapp_agents(id)`. Quando um agente e excluido, podem existir registros em kanbans de OUTROS agentes que foram transferidos a partir do agente sendo excluido. A cascata atual so limpa registros pelo `column_id`, mas nao trata essa referencia.

### Solucao

**Arquivo:** `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx`

Antes do passo 9 (delete kanban cards), adicionar um passo que limpa a referencia `transferred_from_agent_id`:

```
// Limpar referencia de transferencia em kanbans de outros agentes
await supabase
  .from("whatsapp_conversation_kanban")
  .update({ transferred_from_agent_id: null, transferred_from_agent_name: null })
  .eq("transferred_from_agent_id", deleteAgentId);
```

Isso seta como `null` os campos de auditoria em cards que foram transferidos pelo agente sendo excluido, sem apagar os cards dos outros agentes. Depois disso, o delete normal do agente funcionara sem violar a constraint.

### Resumo

| Arquivo | Acao |
|---|---|
| `WhatsAppAgentsSettings.tsx` | Adicionar update para nullificar `transferred_from_agent_id` antes de deletar o agente |

