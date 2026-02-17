

## Corrigir: Webhook da Z-API nao esta sendo configurado (endpoint errado)

### Problema

O `set-webhook` implementado anteriormente **falhou** com erro `NOT_FOUND` porque usa o endpoint e formato errados da Z-API:

- Endpoint errado: `POST /update-webhook`
- Formato errado: `{ "webhookUrl": "...", "sendAckCallback": false }`

O correto segundo a documentacao oficial da Z-API:

- Endpoint correto: `PUT /update-webhook-received`
- Formato correto: `{ "value": "https://..." }`

### Solucao

Corrigir a action `set-webhook` no edge function `whatsapp-zapi-action/index.ts`:

```text
Antes (errado):
  endpoint = baseUrl + "/update-webhook"
  method = "POST"
  body = { webhookUrl: "...", sendAckCallback: false }

Depois (correto):
  endpoint = baseUrl + "/update-webhook-received"
  method = "PUT"
  body = { value: "https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/whatsapp-webhook" }
```

### Arquivo a editar

1. `supabase/functions/whatsapp-zapi-action/index.ts` - corrigir endpoint, metodo e body da action `set-webhook`

### Nota

Apos o deploy, a Laura precisara **reconectar** (desconectar e escanear QR Code novamente) para que o webhook seja configurado automaticamente. Ou pode-se disparar a action `set-webhook` manualmente para a instancia dela.
