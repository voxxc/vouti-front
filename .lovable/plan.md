
## Corrigir webhook que esta rejeitando TODAS as mensagens

### Causa raiz

A funcao `validateWebhookData()` no `whatsapp-webhook/index.ts` esta **rejeitando 100% das chamadas** do Z-API com status 400. Isso significa que **nenhuma mensagem recebida** esta sendo salva no banco desde ~17:10 UTC de hoje.

Os numeros `44 9855-2349` e `62 9368-1919` nunca foram gravados no banco porque o webhook estava descartando tudo.

A validacao na linha 78 exige `instanceId` OU `phone`, mas o Z-API envia diversos tipos de callback (health check, status, presenca, typing, etc.) que podem nao ter esses campos no formato esperado. O resultado e que tudo e rejeitado indiscriminadamente.

### Correcao no `supabase/functions/whatsapp-webhook/index.ts`

**1. Tornar a validacao mais permissiva**

Mudar a funcao `validateWebhookData` para:
- Aceitar payloads sem `instanceId`/`phone` (apenas retornar silenciosamente para tipos irrelevantes)
- Mover a validacao de telefone para DENTRO do handler de mensagens (`handleIncomingMessage`), onde o phone e obrigatorio
- Nunca retornar 400 para webhooks do Z-API (retornar 200 para tudo, mesmo se ignorar o payload)

**2. Adicionar log de debug temporario**

Logar o tipo do payload recebido e campos presentes para diagnosticar o que o Z-API esta enviando, sem expor dados sensiveis.

**3. Garantir que payloads sem mensagem sejam ignorados graciosamente**

Em vez de retornar `400` (que faz o Z-API reenviar infinitamente), retornar `200` com `{ success: true }` para todo tipo de callback, processando apenas os relevantes.

### Mudanca principal no `validateWebhookData`:

```text
// ANTES (rejeita tudo sem instanceId/phone):
function validateWebhookData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (!data.instanceId && !data.phone) return false;  // ESTE FILTRO MATA TUDO
  ...
}

// DEPOIS (aceita payload basico, valida detalhes dentro do handler):
function validateWebhookData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  // Apenas verificar se e um objeto valido. 
  // Validacao de campos especificos acontece no handler.
  return true;
}
```

E no handler principal, ignorar graciosamente payloads sem dados de mensagem:

```text
if (type === 'ReceivedCallback' || type === 'message' || type === 'SentByMeCallback') {
  if (!webhookData.phone && !webhookData.instanceId) {
    // Log e ignora
    return Response 200
  }
  await handleIncomingMessage(webhookData);
}
```

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/whatsapp-webhook/index.ts` | Relaxar validacao, mover checagem de phone para dentro do handler, nunca retornar 400 para Z-API |

### Impacto

- Corrige TODAS as mensagens perdidas para todos os tenants e agentes
- Mensagens futuras serao salvas normalmente
- Callbacks irrelevantes do Z-API serao ignorados silenciosamente (200) em vez de rejeitados (400)
- As conversas `44 9855-2349` e `62 9368-1919` aparecerao assim que o contato enviar nova mensagem (as anteriores foram perdidas)
