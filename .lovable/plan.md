

# Plano: Corrigir URL Base da Z-API para Acoes

## Problema Identificado

Os logs da Edge Function revelam o problema:

```text
URL salvo no banco:
https://api.z-api.io/instances/.../token/.../send-text

Edge Function constroi:
${zapi_url}/qr-code/image

Resultado ERRADO:
.../send-text/qr-code/image
     ^^^^^^^^^
     Nao deveria estar aqui!
```

A URL salva no campo `zapi_url` do banco de dados inclui o sufixo `/send-text`, que e usado apenas para envio de mensagens. As demais acoes (status, disconnect, qr-code) usam a URL base sem esse sufixo.

## Solucao

Modificar a Edge Function para **remover o sufixo `/send-text`** da URL antes de construir o endpoint:

```typescript
// Antes
endpoint = `${zapi_url}/qr-code/image`;

// Depois
const baseUrl = zapi_url.replace(/\/send-text$/, ''); // Remove /send-text do final
endpoint = `${baseUrl}/qr-code/image`;
```

## Alteracao na Edge Function

### `supabase/functions/whatsapp-zapi-action/index.ts`

```typescript
serve(async (req) => {
  // ...

  try {
    const { action, zapi_url, zapi_token } = await req.json();

    if (!action || !zapi_url || !zapi_token) {
      throw new Error('Missing required fields');
    }

    // NOVO: Normalizar URL removendo /send-text se existir
    const baseUrl = zapi_url.replace(/\/send-text\/?$/, '');

    let endpoint = '';
    let method = 'GET';

    switch (action) {
      case 'status':
        endpoint = `${baseUrl}/status`;
        break;
      case 'disconnect':
        endpoint = `${baseUrl}/disconnect`;
        method = 'POST';
        break;
      case 'qr-code':
        endpoint = `${baseUrl}/qr-code/image`;
        break;
      default:
        throw new Error(`Invalid action: ${action}`);
    }

    // ... resto do codigo
  }
});
```

## Fluxo Corrigido

```text
URL do banco: .../token/XXX/send-text
                         │
                         ▼
     baseUrl = url.replace(/\/send-text\/?$/, '')
                         │
                         ▼
URL normalizada: .../token/XXX
                         │
                         ▼
     endpoint = baseUrl + '/qr-code/image'
                         │
                         ▼
URL final: .../token/XXX/qr-code/image  ✓ CORRETO
```

## Arquivo Modificado

- `supabase/functions/whatsapp-zapi-action/index.ts`

## Resultado Esperado

| Acao | Antes (Erro) | Depois (Correto) |
|------|--------------|------------------|
| qr-code | .../send-text/qr-code/image | .../qr-code/image |
| status | .../send-text/status | .../status |
| disconnect | .../send-text/disconnect | .../disconnect |

