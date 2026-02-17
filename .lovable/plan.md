
## Suporte a Grupos WhatsApp + Indicador de Mensagens Nao Lidas

### 1. Indicador de mensagens nao lidas na Caixa de Entrada

O campo `unreadCount` ja existe na interface `WhatsAppConversation` e o badge verde ja esta renderizado no `ConversationList.tsx` (linha 119-123). O problema e que `loadConversations` sempre define `unreadCount: 0`. A coluna `is_read` ja existe na tabela `whatsapp_messages` e mensagens recebidas estao com `is_read = false`.

**Arquivo: `WhatsAppInbox.tsx`**
- No `loadConversations`, ao agrupar mensagens por numero, contar quantas mensagens incoming tem `is_read = false` para cada contato
- Preencher `unreadCount` com esse valor real

**Arquivo: `WhatsAppInbox.tsx`**
- Ao selecionar uma conversa (`onSelectConversation`), marcar como lidas: fazer `UPDATE whatsapp_messages SET is_read = true WHERE from_number = X AND agent_id = Y AND is_read = false`

**Arquivo: `SuperAdminWhatsAppInbox.tsx`**
- Mesma logica: contar `is_read = false` e marcar ao abrir conversa

### 2. Suporte a grupos WhatsApp (Z-API)

O envio para grupos usa os mesmos endpoints (`/send-text`, etc.), substituindo o telefone pelo ID do grupo. Para listar grupos, usamos `GET /chats` filtrando `isGroup: true`.

**Novo arquivo: `supabase/functions/whatsapp-list-groups/index.ts`**
- Edge function que busca `GET /chats` da Z-API (ou `GET /groups`)
- Filtra registros onde `isGroup === true`
- Retorna lista de grupos com `id`, `name`, `isGroup`
- Resolve credenciais da instancia seguindo a hierarquia padrao (agentId > tenant > env vars)

**Arquivo: `supabase/functions/whatsapp-send-message/index.ts`**
- Nenhuma mudanca necessaria -- o campo `phone` ja aceita qualquer string, incluindo IDs de grupo

**Arquivo: `WhatsAppInbox.tsx` e `ConversationList.tsx`**
- No `loadConversations`, identificar conversas de grupo pelo formato do `from_number` (grupos Z-API tem formato `XXXX@g.us`)
- Exibir icone diferente (Users) para grupos na lista de conversas
- Tratar nome do grupo (buscar via contatos ou usar o ID)

### Resumo dos arquivos

| Arquivo | Acao |
|---|---|
| `WhatsAppInbox.tsx` | Contar `is_read=false` para preencher `unreadCount`; marcar como lidas ao abrir conversa |
| `SuperAdminWhatsAppInbox.tsx` | Mesma logica de unread count e marcacao |
| `ConversationList.tsx` | Adicionar icone de grupo para conversas com `@g.us`; badge de unread ja existe |
| `supabase/functions/whatsapp-list-groups/index.ts` | Nova edge function para listar grupos via Z-API |

### Detalhes tecnicos

**Contagem de nao lidas** (em `loadConversations`):
```text
// Ao iterar mensagens agrupadas por from_number:
// Se msg.direction === 'received' && msg.is_read === false -> incrementa unreadCount
```

**Marcar como lidas** (ao clicar na conversa):
```text
supabase.from('whatsapp_messages')
  .update({ is_read: true })
  .eq('from_number', contactNumber)
  .eq('agent_id', myAgentId)
  .eq('is_read', false)
```

**Deteccao de grupo**: conversas cujo `from_number` contem `@g.us` sao tratadas como grupo, exibindo icone `Users` em vez da letra inicial do nome.
