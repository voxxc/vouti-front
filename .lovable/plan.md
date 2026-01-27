

## Correção do Webhook Judit OAB

### Problema Identificado

O webhook `judit-webhook-oab` está buscando o campo `tracking_id` diretamente no payload:
```typescript
const trackingId = payload.tracking_id; // ❌ ERRADO
```

Mas a Judit **não envia** esse campo. O equivalente ao `tracking_id` é enviado em:
- **Campo `reference_id`** (quando `reference_type` é `"tracking"`)
- Também chamado de `origin_id`

### Payload Real da Judit (conforme suporte)

```json
{
  "user_id": "ab829a35-...",
  "callback_id": "cac9367e-...",
  "event_type": "response_created",
  "reference_type": "tracking",        // ← Indica que é monitoramento
  "reference_id": "f4f02f6d-0b2a-...", // ← ESTE É O tracking_id!
  "payload": {
    "response_data": {
      "steps": [...]
    }
  }
}
```

---

### Solução

Modificar o webhook para extrair o `tracking_id` corretamente:

```typescript
// ANTES (errado):
const trackingId = payload.tracking_id;

// DEPOIS (correto):
const trackingId = payload.reference_id || payload.origin_id || payload.tracking_id;
```

---

### Alterações no Arquivo

**`supabase/functions/judit-webhook-oab/index.ts`**

Linha 42-51 será modificada de:
```typescript
// Extrair tracking_id do payload
const trackingId = payload.tracking_id;

if (!trackingId) {
  console.error('[Judit Webhook OAB] tracking_id nao encontrado no payload');
  return new Response(
    JSON.stringify({ success: false, error: 'tracking_id ausente' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

Para:
```typescript
// Extrair tracking_id do payload
// Judit envia o tracking_id no campo reference_id (ou origin_id)
// quando reference_type é "tracking"
const trackingId = payload.reference_id || payload.origin_id || payload.tracking_id;

if (!trackingId) {
  console.error('[Judit Webhook OAB] tracking_id nao encontrado no payload. Campos disponiveis:', Object.keys(payload));
  return new Response(
    JSON.stringify({ success: false, error: 'reference_id/tracking_id ausente' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

console.log('[Judit Webhook OAB] Tracking ID extraido:', trackingId, '| reference_type:', payload.reference_type);
```

---

### Também Ajustar: Extração dos Andamentos

O payload da Judit envia os dados em `payload.payload.response_data`, não diretamente em `payload.response_data`.

Linha 71-72 será ajustada:
```typescript
// ANTES:
const responseData = payload.response_data || payload.data || payload;

// DEPOIS - acessar o nivel correto:
const responseData = payload.payload?.response_data || payload.response_data || payload.data || payload;
```

---

### Resumo das Mudanças

| Linha | Antes | Depois |
|-------|-------|--------|
| 42-43 | `payload.tracking_id` | `payload.reference_id \|\| payload.origin_id \|\| payload.tracking_id` |
| 46 | Log simples | Log com campos disponiveis para debug |
| 71 | `payload.response_data` | `payload.payload?.response_data \|\| payload.response_data` |

---

### Arquivos a Modificar

- `supabase/functions/judit-webhook-oab/index.ts`

---

### Após a Correção

1. O webhook será atualizado automaticamente após o deploy
2. A Judit pode reenviar os webhooks pendentes
3. Os novos andamentos serão processados corretamente

