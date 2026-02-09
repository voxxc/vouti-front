

## Plano: Capturar Mensagens Enviadas pelo Celular no Webhook

### Problema

O webhook descarta todas as mensagens com `fromMe: true`. Isso impede que mensagens enviadas manualmente pelo celular apareçam na caixa de entrada do Vouti.Bot.

### Solução

Salvar mensagens `fromMe: true` como `direction: 'outgoing'` no banco, mas **sem disparar IA nem automacoes** para elas.

### Alteracao

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

**Logica atual:**
```
ReceivedCallback + fromMe = IGNORADO
handleIncomingMessage + fromMe = IGNORADO
```

**Logica nova:**
```
ReceivedCallback + fromMe = SALVAR como outgoing (sem IA, sem automacao)
ReceivedCallback + !fromMe = SALVAR como received + processar IA/automacao (atual)
```

**Mudancas especificas:**

1. No handler principal (serve), remover o filtro `if (!fromMe)` e sempre chamar `handleIncomingMessage`
2. Dentro de `handleIncomingMessage`, em vez de `return` quando `fromMe`, salvar a mensagem como `direction: 'outgoing'` e retornar sem processar IA/automacoes

```typescript
// ANTES (descarta):
if (fromMe) {
  console.log('Ignorando mensagem propria');
  return;
}

// DEPOIS (salva como outgoing):
if (fromMe) {
  // Salvar mensagem enviada pelo celular no historico
  await supabase.from('whatsapp_messages').insert({
    instance_name: instanceId,
    message_id: messageId || `msg_${Date.now()}`,
    from_number: phone, // ja normalizado
    message_text: text?.message || '',
    message_type: 'text',
    direction: 'outgoing',
    raw_data: data,
    user_id: instance.user_id,
    tenant_id: effectiveTenantId,
    timestamp: momment ? new Date(momment).toISOString() : new Date().toISOString(),
    is_read: true,
  });
  console.log('Mensagem enviada pelo celular salva no historico');
  return; // Nao processa IA nem automacoes
}
```

3. No handler principal, remover a condicao `!fromMe`:
```typescript
// ANTES:
if (type === 'ReceivedCallback') {
  if (!fromMe) {
    await handleIncomingMessage(webhookData);
  }
}

// DEPOIS:
if (type === 'ReceivedCallback') {
  await handleIncomingMessage(webhookData);
}
```

### Prevencao de Duplicatas

Mensagens enviadas **pela plataforma** (via `saveOutgoingMessage`) ja sao salvas. O webhook tambem recebera essas mensagens com `fromMe: true` e `fromApi: true`. Para evitar duplicatas:

- Verificar se `fromApi: true` (enviada pela API/plataforma) e ignorar, pois ja foi salva
- Apenas salvar quando `fromApi: false` (enviada manualmente pelo celular)

```typescript
if (fromMe) {
  if (data.fromApi) {
    console.log('Ignorando mensagem ja salva pela plataforma (fromApi: true)');
    return;
  }
  // Salvar mensagem manual do celular...
}
```

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/whatsapp-webhook/index.ts` | Salvar mensagens fromMe como outgoing, filtrar fromApi |

### Resultado

- Mensagens enviadas pelo celular aparecerao na caixa de entrada como mensagens enviadas
- IA e automacoes continuam sendo disparadas apenas para mensagens recebidas de leads
- Mensagens enviadas pela plataforma nao serao duplicadas (filtro fromApi)
