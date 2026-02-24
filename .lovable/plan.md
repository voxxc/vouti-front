

## Migrar WhatsApp para Realtime e eliminar pollings

### Resumo da mudanca

6 componentes serao alterados. Componentes que ja tem Realtime terao apenas o polling removido. Componentes sem Realtime ganharao subscription e terao o polling removido.

### Componentes e acoes

| Componente | Polling atual | Realtime existente? | Acao |
|---|---|---|---|
| **WhatsAppInbox** | 2s (conversas + mensagens) | Sim, completo | Remover os 2 `setInterval` (linhas 405-426) |
| **WhatsAppAllConversations** | 2s (conversas + mensagens) | Sim (conversas) | Remover os 2 `setInterval` (linhas 204-221). Adicionar Realtime para mensagens da conversa selecionada |
| **WhatsAppLabelConversations** | 3s conversas + 2s mensagens | Nao | Adicionar Realtime em `whatsapp_messages` para atualizar conversas e mensagens. Remover os 2 `setInterval` (linhas 127-131 e 170-174) |
| **WhatsAppKanban** | 2s | Nao | Adicionar Realtime em `whatsapp_conversation_kanban` + `whatsapp_messages`. Remover `setInterval` (linhas 280-284) |
| **ContactInfoPanel** | 2s (macros) | Nao | Macros raramente mudam. Carregar uma vez, remover `setInterval` (linhas 100-115). Sem Realtime necessario |
| **CRMNotificationsBell** | 5s | Nao | Adicionar Realtime em `notifications` filtrado por `user_id`. Remover `setInterval` (linhas 56-60) |

### Detalhes tecnicos

**Padrao Realtime aplicado** (mesmo do WhatsAppInbox que ja funciona):
```typescript
const channel = supabase
  .channel('nome-canal')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'whatsapp_messages',
    filter: `tenant_id=eq.${tenantId}`
  }, () => loadData())
  .subscribe();

return () => { supabase.removeChannel(channel); };
```

**WhatsAppLabelConversations** - Ao receber INSERT em `whatsapp_messages`, chama `loadConversations(false)`. Se houver conversa selecionada, tambem chama `loadMessages`.

**WhatsAppKanban** - Escuta INSERT em `whatsapp_messages` e changes em `whatsapp_conversation_kanban` para chamar `silentRefresh`.

**CRMNotificationsBell** - Escuta INSERT em `notifications` filtrado pelo `user_id` para chamar `loadNotifications`.

**ContactInfoPanel** - Macros sao dados de configuracao que quase nunca mudam em tempo real. Basta carregar uma vez ao montar (o fetch inicial ja existe). Sem Realtime, sem polling.

### Economia estimada

- **Antes**: ~10.800 queries/hora (3 usuarios ativos no WhatsApp)
- **Depois**: ~50 queries/hora (apenas carregamentos iniciais + reacoes a eventos reais)
- **Reducao**: ~99.5%

