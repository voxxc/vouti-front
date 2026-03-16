

# Fix: Mensagens do chat não atualizam em tempo real

## Causa raiz

Dois problemas no `useWhatsAppSync.ts`:

1. **Deduplicação com clock skew**: `lastSignalTime` é inicializado com `Date.now()` (hora do cliente), mas comparado com `signal.created_at` (hora do servidor Supabase). Se o relógio do cliente estiver à frente do servidor (mesmo 1 segundo), **todos os sinais Realtime são ignorados silenciosamente**. A lista de conversas ainda atualiza porque o polling de 30s chama `onConversationUpdate`, mas `onMessageUpdate` nunca é chamado pelo polling.

2. **Polling fallback incompleto**: O polling de 30s só chama `onConversationUpdate`, ignorando `onMessageUpdate`. Resultado: a sidebar atualiza a cada 30s, mas o chat nunca.

## Solução — Arquivo: `src/hooks/useWhatsAppSync.ts`

### Mudança 1: Inicializar `lastSignalTime` com `0`
Realtime só entrega INSERTs novos, então não há risco de processar sinais antigos. Valor `0` garante que o primeiro sinal sempre passa, independente de diferença de relógio.

```typescript
const lastSignalTime = useRef<number>(0);  // era Date.now()
```

### Mudança 2: Polling fallback também atualiza mensagens
Adicionar chamada a `onMessageUpdate` no intervalo de 30s. Sem parâmetro de telefone, o callback precisa lidar com `undefined`. Para isso, vou passar uma string vazia ou usar um flag especial.

Na verdade, a abordagem mais limpa: adicionar um novo callback `onPollingTick` ou simplesmente fazer o polling chamar ambos. Como `onMessageUpdate` precisa de um `phone`, a solução ideal é mover a lógica para dentro dos componentes.

**Abordagem final**: No polling, chamar `onMessageUpdate` com string `"*"` (wildcard) para indicar "atualizar a conversa atual, seja qual for". Os componentes já têm a lógica de saber qual conversa está aberta.

Ou mais simples: os 3 componentes (Inbox, AllConversations, LabelConversations) passam um `onPollingTick` que atualiza mensagens incondicionalmente. Mas para minimizar mudanças, vou:

- Mudar o polling para também chamar `onMessageUpdateRef.current?.("")` — e nos componentes, tratar string vazia como "atualizar conversa atual sem comparar phone".

**Abordagem mais simples e correta**: Nos componentes, quando `onMessageUpdate` recebe phone vazio OU phone que bate, atualizar:

```typescript
onMessageUpdate: (phone: string) => {
  if (!phone || (selectedConversation && normalizePhone(phone) === normalizePhone(selectedConversation.contactNumber))) {
    loadMessages(selectedConversation.contactNumber);
  }
}
```

E no polling:
```typescript
onConversationUpdateRef.current?.();
onMessageUpdateRef.current?.("");
```

## Arquivos a modificar

1. **`src/hooks/useWhatsAppSync.ts`** — `lastSignalTime` → `0`, polling chama `onMessageUpdate("")`
2. **`src/components/WhatsApp/sections/WhatsAppInbox.tsx`** — `onMessageUpdate` aceita phone vazio
3. **`src/components/WhatsApp/sections/WhatsAppAllConversations.tsx`** — mesma mudança
4. **`src/components/WhatsApp/sections/WhatsAppLabelConversations.tsx`** — mesma mudança

Total: ~4 linhas modificadas em cada arquivo.

