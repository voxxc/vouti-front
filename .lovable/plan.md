

# Plano: Corrigir Autenticação Z-API - Header Client-Token

## Problema Identificado

A Z-API está rejeitando a requisição com erro:
```
Client-Token F5DA3871D271E4965BD44484 not allowed
```

A URL está correta, mas a **autenticação no header está errada**.

## Como a Z-API Funciona

| Cenário | Header Client-Token |
|---------|---------------------|
| Security Token **DESATIVADO** | NÃO enviar ou enviar vazio |
| Security Token **ATIVADO** | Enviar o Account Security Token |

O código atual **sempre** envia o Instance Token como Client-Token, o que é incorreto.

## Solução

### 1. Edge Function: Enviar Header Apenas Quando Necessário

Modificar `whatsapp-zapi-action/index.ts`:

```typescript
// ANTES (errado)
const zapiResponse = await fetch(endpoint, {
  method: method,
  headers: {
    'Client-Token': authToken,  // SEMPRE envia
    'Content-Type': 'application/json',
  },
});

// DEPOIS (correto)
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
};

// Só adiciona Client-Token se foi fornecido explicitamente
if (zapi_client_token) {
  headers['Client-Token'] = zapi_client_token;
}

const zapiResponse = await fetch(endpoint, {
  method: method,
  headers: headers,
});
```

### 2. Lógica de Autenticação

```text
Frontend envia:
┌───────────────────────────────────────────┐
│ zapi_instance_id: "3E8A768..."            │
│ zapi_instance_token: "F5DA387..."         │
│ zapi_client_token: "" (vazio)             │
└───────────────────────────────────────────┘
            │
            ▼
Edge Function:
┌───────────────────────────────────────────┐
│ URL: .../instances/{ID}/token/{TOKEN}/... │
│                                           │
│ Headers:                                  │
│   Content-Type: application/json          │
│   (SEM Client-Token - campo está vazio)   │
└───────────────────────────────────────────┘
            │
            ▼
Z-API aceita a requisição!
```

### 3. Quando o Usuário TEM Security Token Ativado

Se o usuário ativou o Security Token no painel Z-API:

```text
Frontend envia:
┌───────────────────────────────────────────┐
│ zapi_instance_id: "3E8A768..."            │
│ zapi_instance_token: "F5DA387..."         │
│ zapi_client_token: "ABC123XYZ789"         │ ← Token de segurança
└───────────────────────────────────────────┘
            │
            ▼
Edge Function:
┌───────────────────────────────────────────┐
│ Headers:                                  │
│   Content-Type: application/json          │
│   Client-Token: ABC123XYZ789              │ ← Enviado!
└───────────────────────────────────────────┘
```

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-zapi-action/index.ts` | Enviar Client-Token apenas quando fornecido |

## Código Final da Edge Function

```typescript
serve(async (req) => {
  // ... CORS handling ...

  try {
    const body = await req.json();
    const { action, zapi_instance_id, zapi_instance_token, zapi_client_token } = body;

    if (!action || !zapi_instance_id || !zapi_instance_token) {
      throw new Error('Missing required fields');
    }

    const baseUrl = `https://api.z-api.io/instances/${zapi_instance_id}/token/${zapi_instance_token}`;

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
    }

    // Headers - só adiciona Client-Token se fornecido
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (zapi_client_token && zapi_client_token.trim() !== '') {
      headers['Client-Token'] = zapi_client_token;
    }

    const zapiResponse = await fetch(endpoint, {
      method: method,
      headers: headers,
    });

    const zapiData = await zapiResponse.json();
    
    return new Response(JSON.stringify({
      success: zapiResponse.ok,
      data: zapiData,
      action: action
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // ... error handling ...
  }
});
```

## Resumo

O problema é que o código sempre envia o Instance Token como `Client-Token`, mas a Z-API só aceita:
- Nenhum header (se Security Token desativado)
- O Account Security Token correto (se ativado)

A correção é simples: só enviar o header `Client-Token` quando o campo `zapi_client_token` for preenchido explicitamente pelo usuário.

