

## Bug: Early return impede processamento de campanhas

### Causa raiz

Na `whatsapp-process-queue/index.ts`, linhas 56-65: quando não há mensagens na fila regular (`whatsapp_pending_messages`), a função faz `return` imediatamente. O bloco de campanhas (linha 349+) **nunca é executado**.

### Correção

Remover o `return` early da condição "no pending messages" e substituir por apenas um log, permitindo que a execução continue até o bloco de campanhas.

**Arquivo:** `supabase/functions/whatsapp-process-queue/index.ts`

Linhas 56-65: trocar o `return new Response(...)` por apenas um `console.log`, mantendo o fluxo para o bloco de campanhas abaixo.

```typescript
// ANTES (retorna e nunca chega nas campanhas):
if (!pendingMessages || pendingMessages.length === 0) {
  console.log('[whatsapp-process-queue] No pending messages to process');
  return new Response(JSON.stringify({ ... }));  // ← BUG
}

// DEPOIS (continua para processar campanhas):
if (!pendingMessages || pendingMessages.length === 0) {
  console.log('[whatsapp-process-queue] No pending messages to process');
  // Não retorna - continua para processar campanhas
}
```

O bloco `for (const msg of pendingMessages)` já não executará se o array estiver vazio, então não precisa de nenhuma outra mudança.

Mover a resposta final para incluir contadores de campanhas no resultado.

