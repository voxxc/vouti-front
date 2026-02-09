
# Plano: Corrigir Envio Automático do Agente IA

## Problema Identificado

Comparando as duas Edge Functions:

| Aspecto | `whatsapp-send-message` (funciona) | `whatsapp-webhook` (falha) |
|---------|-----------------------------------|---------------------------|
| URL base | `Z_API_URL` (secret global) | `instance.zapi_url` (banco) |
| Endpoint | `${zapiUrl}/send-text` | `${zapi_url}/token/${token}/send-text` |
| Headers | `Client-Token: Z_API_TOKEN` | Nenhum header de auth |
| Resultado | ✅ 200 OK | ❌ 400 "client-token is not configured" |

## Causa Raiz

O `whatsapp-webhook` está usando credenciais do banco de dados ao invés dos **secrets globais** que funcionam. A Z-API requer o `Client-Token` no header (não na URL).

## Solução

Modificar o `whatsapp-webhook` para usar **exatamente a mesma lógica** do `whatsapp-send-message`:

```text
ANTES (webhook):
  URL: ${instance.zapi_url}/token/${instance.zapi_token}/send-text
  Headers: { 'Content-Type': 'application/json' }

DEPOIS (webhook):
  URL: ${Z_API_URL}/send-text  (secret global)
  Headers: { 
    'Content-Type': 'application/json',
    'Client-Token': Z_API_TOKEN  (secret global)
  }
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-webhook/index.ts` | Usar secrets globais ao invés de valores do banco |

## Detalhes Técnicos

### 1. Bloco de Automações (linha ~208)
```typescript
// ANTES
const zapiUrl = `${instance.zapi_url}/token/${instance.zapi_token}/send-text`;

// DEPOIS
const zapiUrl = Deno.env.get('Z_API_URL');
const zapiToken = Deno.env.get('Z_API_TOKEN');
const apiEndpoint = `${zapiUrl}/send-text`;

const response = await fetch(apiEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Client-Token': zapiToken,
  },
  body: JSON.stringify({ phone, message: automation.response_message }),
});
```

### 2. Bloco de Resposta IA (handleAIResponse ~linha 343)
```typescript
// ANTES
const zapiUrl = `${zapi_url}/token/${zapi_token}/send-text`;

// DEPOIS
const zapiUrl = Deno.env.get('Z_API_URL');
const zapiToken = Deno.env.get('Z_API_TOKEN');
const apiEndpoint = `${zapiUrl}/send-text`;

const sendResponse = await fetch(apiEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Client-Token': zapiToken,
  },
  body: JSON.stringify({ phone, message: aiData.response }),
});
```

### 3. Salvar mensagem ANTES da validação do envio
Para garantir que a mensagem apareça na UI mesmo se houver erro:
```typescript
// Salvar mensagem da IA no banco IMEDIATAMENTE após gerar
await saveOutgoingMessage(phone, aiData.response, tenant_id, instanceId, user_id);

// Depois tenta enviar via Z-API
const sendResponse = await fetch(apiEndpoint, { ... });
```

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  LEAD ENVIA MENSAGEM                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   1. Webhook recebe mensagem do lead                                    │
│   2. Chama whatsapp-ai-chat → IA gera resposta ✅                       │
│   3. Salva resposta no banco (aparece na UI imediatamente)              │
│   4. Usa secrets globais: Z_API_URL + Z_API_TOKEN                       │
│   5. POST para ${Z_API_URL}/send-text com Client-Token no header        │
│   6. Z-API envia mensagem para o WhatsApp do lead ✅                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Resultado Esperado

Após a correção:
- Lead envia mensagem → IA gera resposta
- Resposta aparece na interface imediatamente
- Resposta é enviada para o WhatsApp do lead (igual quando você aperta Enter)
- Logs mostram `Z-API Response [200]` com sucesso

## Teste

1. Envie uma mensagem do celular do lead
2. Verifique se a resposta chega no celular do lead
3. Verifique se a resposta aparece na UI da plataforma
