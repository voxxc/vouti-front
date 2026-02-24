

## Problema identificado: Mensagens enviadas nao aparecem em tempo real

### Diagnostico

A edge function `whatsapp-send-message` salva a mensagem outgoing no banco (INSERT em `whatsapp_messages`). O Realtime deveria captar esse INSERT e atualizar a tela. Porem ha dois problemas distintos dependendo do componente:

**WhatsAppInbox** - Tem mensagem otimista (aparece imediatamente com ID falso), mas quando o Realtime traz o INSERT real do banco, o ID e diferente do otimista, entao a mensagem aparece **duplicada**. Se o otimista falhar por qualquer motivo, nao aparece nada.

**WhatsAppAllConversations e WhatsAppLabelConversations** - **NAO tem mensagem otimista**. Dependem 100% do Realtime para mostrar a mensagem enviada. O Realtime deveria funcionar, mas se houver qualquer delay ou falha na subscription, a mensagem simplesmente nao aparece ate recarregar.

### Solucao

Adicionar **mensagem otimista** em todos os componentes (para feedback imediato) E ajustar o Realtime para **substituir** a mensagem otimista pela real do banco (evitando duplicatas).

### Componentes e mudancas

| Componente | Mudanca |
|---|---|
| **WhatsAppInbox** | Ja tem otimista. Ajustar o handler do Realtime para substituir a msg otimista pela real (comparar por `from_number` + `direction` + timestamp proximo, ou usar prefixo no ID otimista) |
| **WhatsAppAllConversations** | Adicionar mensagem otimista no `handleSendMessage`. O Realtime ja faz `loadMessages()` que vai trazer a versao real |
| **WhatsAppLabelConversations** | Adicionar mensagem otimista no `handleSendMessage`. O Realtime ja faz `loadMessages()` que vai trazer a versao real |

### Detalhes tecnicos

**Padrao otimista + Realtime sem duplicatas (WhatsAppInbox):**

O `handleSendMessage` ja adiciona a mensagem com `id: crypto.randomUUID()`. Quando o Realtime dispara o INSERT com o ID real do banco, o check `prev.some(m => m.id === formattedMsg.id)` falha porque os IDs sao diferentes, causando duplicata.

Correcao: usar um prefixo `optimistic_` no ID da mensagem otimista. No handler do Realtime, ao receber uma mensagem outgoing para o mesmo `from_number`, remover a otimista e inserir a real:

```typescript
// Otimista
const optimisticMsg = {
  id: `optimistic_${Date.now()}`,
  ...
};

// No handler Realtime
setMessages(prev => {
  // Remover otimista se a msg real chegou
  const withoutOptimistic = newMsg.direction === 'outgoing' 
    ? prev.filter(m => !m.id.startsWith('optimistic_') || m.messageText !== newMsg.message_text)
    : prev;
  if (withoutOptimistic.some(m => m.id === formattedMsg.id)) return withoutOptimistic;
  return [...withoutOptimistic, formattedMsg];
});
```

**AllConversations e LabelConversations - Adicionar otimista:**

Apos o `supabase.functions.invoke`, adicionar a mensagem otimista ao estado `messages`. O Realtime ja chama `loadMessages()` que faz fetch completo, substituindo naturalmente a otimista.

```typescript
// Apos invoke com sucesso:
const optimisticMsg = {
  id: `optimistic_${Date.now()}`,
  messageText: text,
  direction: "outgoing",
  timestamp: new Date().toISOString(),
  isFromMe: true,
  messageType: messageType || "text",
  mediaUrl,
};
setMessages(prev => [...prev, optimisticMsg]);
```

### Resultado esperado

- Mensagem enviada aparece **imediatamente** (otimista) em todos os 3 componentes
- Quando o INSERT real chega via Realtime, substitui a otimista sem duplicar
- Funciona para qualquer instancia (Z-API ou Meta)

