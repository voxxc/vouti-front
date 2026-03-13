

# Correção: Scroll automático para mensagens recentes ao abrir conversa

## Problema
O `ChatPanel` só faz scroll para baixo quando **novas mensagens chegam** (`messages.length > prevMessagesLengthRef.current`). Quando uma conversa é aberta pela primeira vez, as mensagens são carregadas de uma vez e o scroll fica no topo (mensagens antigas).

## Correção

### `src/components/WhatsApp/components/ChatPanel.tsx`

Adicionar um segundo `useEffect` que detecta **troca de conversa** (mudança de `conversation?.id`) e faz scroll imediato para o final:

```typescript
// Scroll to bottom when conversation changes (opening a new chat)
useEffect(() => {
  if (conversation) {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }, 50);
  }
}, [conversation?.id]);
```

Também ajustar o useEffect existente para fazer scroll na **carga inicial** (quando `prevMessagesLengthRef.current === 0` e mensagens são carregadas):

```typescript
useEffect(() => {
  if (messages.length > 0 && prevMessagesLengthRef.current === 0) {
    // Initial load — scroll instantly
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  } else if (messages.length > prevMessagesLengthRef.current) {
    // New message arrived — smooth scroll
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }
  prevMessagesLengthRef.current = messages.length;
}, [messages]);
```

Mesma correção no `CRMInternalChat.tsx` para consistência.

