

# Remover linha em branco entre nome do agente e mensagem

## Problema
Na linha 47 de `supabase/functions/whatsapp-send-message/index.ts`, o template usa `\n\n` (duas quebras de linha), criando uma linha em branco entre o nome e a mensagem.

## Mudança

**`supabase/functions/whatsapp-send-message/index.ts`** — linha 47:

```
// De:
const finalMessage = message ? (agentName ? `*${agentName}*\n\n${message}` : message) : '';

// Para:
const finalMessage = message ? (agentName ? `*${agentName}:*\n${message}` : message) : '';
```

Mudanças: `\n\n` → `\n` (uma só quebra de linha) e adiciona `:` após o nome para ficar `*Daniel M:*`.

Depois: deploy da edge function.

