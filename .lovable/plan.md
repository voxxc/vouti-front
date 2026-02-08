
# Plano: Adicionar Real-Time ao Chat WhatsApp

## Problema
Quando um lead responde no WhatsApp, a mensagem é salva no banco via webhook, mas a interface não atualiza automaticamente. O usuário precisa trocar de conversa ou recarregar a página para ver novas mensagens.

## Causa Raiz
O `WhatsAppInbox.tsx` não tem **Supabase Realtime subscription** para a tabela `whatsapp_messages`. Ele apenas carrega as mensagens uma vez quando a conversa é selecionada.

## Solução
Adicionar subscription real-time para detectar INSERT na tabela `whatsapp_messages` e atualizar a UI automaticamente.

## Fluxo Atual vs. Proposto

```text
ATUAL:
Lead responde → Webhook salva no banco → (nada acontece na UI)

PROPOSTO:
Lead responde → Webhook salva no banco → Realtime detecta INSERT → UI atualiza
```

## Alterações em `src/components/WhatsApp/sections/WhatsAppInbox.tsx`

### 1. Adicionar Subscription Real-Time para Mensagens

Dentro do `useEffect` que monitora `selectedConversation`, criar uma subscription:

```typescript
useEffect(() => {
  if (!selectedConversation || !tenantId) return;

  // Carregar mensagens iniciais
  loadMessages(selectedConversation.contactNumber);

  // Subscription real-time para novas mensagens
  const channel = supabase
    .channel(`whatsapp-messages-${selectedConversation.contactNumber}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `tenant_id=eq.${tenantId}`
      },
      (payload) => {
        const newMsg = payload.new;
        // Verificar se é da conversa atual
        if (newMsg.from_number === selectedConversation.contactNumber) {
          const formattedMsg: WhatsAppMessage = {
            id: newMsg.id,
            messageText: newMsg.message_text || "",
            direction: newMsg.direction === "outgoing" ? "outgoing" : "incoming",
            timestamp: newMsg.created_at,
            isFromMe: newMsg.direction === "outgoing",
          };
          setMessages(prev => [...prev, formattedMsg]);
        }
      }
    )
    .subscribe();

  // Cleanup ao desmontar ou trocar conversa
  return () => {
    supabase.removeChannel(channel);
  };
}, [selectedConversation, tenantId]);
```

### 2. Adicionar Subscription para Lista de Conversas

Atualizar também a lista de conversas quando chegar nova mensagem:

```typescript
useEffect(() => {
  if (!tenantId) return;

  loadConversations();

  // Subscription para atualizar lista de conversas
  const conversationsChannel = supabase
    .channel('whatsapp-conversations')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `tenant_id=eq.${tenantId}`
      },
      () => {
        // Recarregar lista de conversas
        loadConversations();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(conversationsChannel);
  };
}, [tenantId]);
```

### 3. Evitar Duplicação de Mensagens

Adicionar verificação para não duplicar mensagens que já existem:

```typescript
setMessages(prev => {
  // Verificar se mensagem já existe
  if (prev.some(m => m.id === formattedMsg.id)) {
    return prev;
  }
  return [...prev, formattedMsg];
});
```

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx` | Adicionar subscriptions real-time para mensagens e conversas |

## Resultado Esperado

1. Quando lead responde, mensagem aparece **instantaneamente** no chat
2. Lista de conversas atualiza com última mensagem
3. Experiência similar ao WhatsApp Web real
4. Subscriptions são limpas corretamente ao trocar conversa ou desmontar componente

## Diagrama do Fluxo Real-Time

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Lead envia    │────▶│   Z-API Webhook  │────▶│   Edge Function │
│   mensagem      │     │                  │     │   salva no DB   │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   UI atualiza   │◀────│   Subscription   │◀────│   Supabase      │
│   mensagens     │     │   detecta INSERT │     │   Realtime      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```
