
## Corrigir transferencia de conversas em "Todas as Conversas"

### Problema identificado

Quando Daniel acessa "Todas as Conversas" e tenta transferir a conversa do 92 99306-6901 (que pertence a Juliana), o sistema usa o `currentAgentId` de Daniel como origem da transferencia. Isso causa falha porque:

- As mensagens estao vinculadas ao agent_id da Juliana (`acef3363`)
- O card do Kanban tambem pertence a Juliana
- O sistema tenta atualizar/deletar registros de Daniel, que nao existem

### Solucao

Modificar o `TransferConversationDialog` para aceitar e usar o **agent dono da conversa** como origem, em vez de sempre usar o agente logado.

### Mudancas tecnicas

**1. `WhatsAppAllConversations.tsx`** - Passar o `agentId` da conversa selecionada

A interface `AllConversationsItem` ja tem `agentId` e `agentName`. Passar esses dados como novas props ao `ContactInfoPanel`:

```
conversationAgentId={selectedConversation.agentId}
conversationAgentName={selectedConversation.agentName}
```

**2. `ContactInfoPanel.tsx`** - Receber e propagar as novas props

Adicionar `conversationAgentId` e `conversationAgentName` opcionais na interface e passa-los ao `TransferConversationDialog`.

**3. `TransferConversationDialog.tsx`** - Usar o agente correto como origem

| Aspecto | Antes | Depois |
|---|---|---|
| Origem da transferencia | Sempre `currentAgentId` (usuario logado) | `conversationAgentId` se fornecido, senao `currentAgentId` |
| Lista de agentes | Exclui o usuario logado | Exclui o dono da conversa |
| Reassociar mensagens | `WHERE agent_id = currentAgentId` | `WHERE agent_id = sourceAgentId` |
| Mover Kanban | Deleta card de `currentAgentId` | Deleta card de `sourceAgentId` |

Internamente, criar uma variavel `sourceAgentId` e `sourceAgentName`:
```
const sourceAgentId = conversationAgentId || currentAgentId;
const sourceAgentName = conversationAgentName || currentAgentName;
```

Substituir todas as referencias a `currentAgentId` na logica de transferencia por `sourceAgentId`, mantendo `currentAgentId` apenas para verificar se o botao deve ser exibido.

A condicao de exibicao muda de `if (!currentAgentId)` para `if (!currentAgentId && !conversationAgentId)`, permitindo que o botao apareca mesmo quando o agente logado nao e o dono da conversa.
