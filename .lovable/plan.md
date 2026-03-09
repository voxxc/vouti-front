
# Fix: Lista de Conversas não atualiza visualmente

## Problema Identificado

O código de `WhatsAppAllConversations.tsx` está com dois bugs críticos:

1. **Contador de não-lidas sempre 0** — Linha 111 define `unreadCount: 0` hardcoded, ignorando completamente mensagens não lidas
2. **Lista não ordenada** — Após construir o Map de conversas, não há `.sort()` por `lastMessageTime` — conversas novas não sobem para o topo

O `WhatsAppInbox.tsx` já funciona corretamente (tem unreadMap + sort), mas `AllConversations` está quebrado.

## Solução

### Corrigir `WhatsAppAllConversations.tsx`

Adicionar lógica idêntica ao `WhatsAppInbox.tsx`:

```tsx
// ANTES (quebrado)
conversationMap.set(normalizedNumber, {
  ...
  unreadCount: 0, // ← sempre 0
});
setConversations(Array.from(conversationMap.values())); // ← sem sort

// DEPOIS (corrigido)
const unreadMap = new Map<string, number>();
(messagesResult.data).forEach((msg) => {
  if (msg.direction === 'received' && msg.is_read === false) {
    unreadMap.set(normalizedNumber, (unreadMap.get(normalizedNumber) || 0) + 1);
  }
  if (!conversationMap.has(normalizedNumber)) {
    conversationMap.set(normalizedNumber, {
      ...
      unreadCount: 0, // ← valor inicial
    });
  }
});

// Aplicar contadores
unreadMap.forEach((count, phone) => {
  const conv = conversationMap.get(phone);
  if (conv) conv.unreadCount = count;
});

// Ordenar por mais recente
const sorted = Array.from(conversationMap.values())
  .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
setConversations(sorted);
```

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/components/WhatsApp/sections/WhatsAppAllConversations.tsx` | Adicionar contagem de não-lidas + sort por timestamp |
