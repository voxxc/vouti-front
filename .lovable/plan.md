

# Plano: Corrigir Integração Z-API no Super Admin

## Problema Identificado

Analisando os logs da Edge Function:

```
Z-API Action: qr-code -> https://api.z-api.io/instances/3E8A7687638142678C80FA4754EC29F2/token/F5DA3871D271E4965BD44484/qr-code/image
Z-API Response: { error: "Client-Token F5DA3871D271E4965BD44484 not allowed" }
```

O erro ocorre porque há **confusão entre dois tokens diferentes** da Z-API:

1. **Token da URL** (`/token/{TOKEN}`) - Faz parte do endpoint da instância
2. **Client-Token** (header HTTP) - Token de autenticação do cliente

O usuário está salvando a URL completa (que já inclui o token da instância), mas o código tenta usar o mesmo token como `Client-Token` no header.

## Formato Correto Z-API

A Z-API requer:
- **URL Base**: `https://api.z-api.io/instances/{INSTANCE_ID}/token/{INSTANCE_TOKEN}`
- **Header HTTP**: `Client-Token: {CLIENT_TOKEN}` (token diferente!)

## Solução

### Opção Escolhida: Simplificar a Interface

Alterar o formulário para aceitar apenas:
1. **URL Completa** - A URL da instância Z-API (já contém instance ID e token da URL)
2. **Client Token** - O token de autenticação separado

E remover o campo "Instance ID" que está causando confusão.

### Alterações no Drawer

No arquivo `SuperAdminAgentConfigDrawer.tsx`:

```text
┌────────────────────────────────────────┐
│ Credenciais Z-API                      │
├────────────────────────────────────────┤
│ URL da Instância                       │
│ ┌────────────────────────────────────┐ │
│ │ https://api.z-api.io/instances/... │ │  <- URL completa com token
│ └────────────────────────────────────┘ │
│                                        │
│ Client Token                           │
│ ┌────────────────────────────────────┐ │
│ │ ••••••••••••                       │ │  <- Token de autenticação
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

### Alterações na Edge Function

Verificar se a URL já contém `/token/` na path e usar diretamente, enviando o `Client-Token` corretamente no header.

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/SuperAdmin/WhatsApp/SuperAdminAgentConfigDrawer.tsx` | Simplificar formulário removendo campo "Instance ID" e melhorando labels |
| `supabase/functions/whatsapp-zapi-action/index.ts` | Garantir que o token do header seja o correto |

## Detalhes Técnicos

### SuperAdminAgentConfigDrawer.tsx

1. Remover o campo `zapi_instance_id` do estado e formulário
2. Renomear labels para clareza:
   - "URL da API" → "URL da Instância"
   - "Token" → "Client Token"
3. Ao salvar, extrair o instance_id automaticamente da URL para o campo `instance_name`:

```typescript
// Extrair instance_id da URL para salvar no banco
const extractInstanceId = (url: string): string => {
  const match = url.match(/instances\/([A-F0-9]+)/i);
  return match ? match[1] : url;
};
```

### whatsapp-zapi-action/index.ts

Verificar se a normalização da URL está correta:

```typescript
// A URL já vem completa do banco: https://api.z-api.io/instances/{ID}/token/{TOKEN}
// Apenas adicionar o endpoint (/status, /qr-code/image, etc.)
const baseUrl = zapi_url.replace(/\/$/, ''); // Remove trailing slash
let endpoint = '';

switch (action) {
  case 'status':
    endpoint = `${baseUrl}/status`;
    break;
  case 'qr-code':
    endpoint = `${baseUrl}/qr-code/image`;
    break;
  // ...
}

// O Client-Token no header é diferente do token na URL
const zapiResponse = await fetch(endpoint, {
  method: method,
  headers: {
    'Client-Token': zapi_token,  // Este é o CLIENT token, não o da URL
    'Content-Type': 'application/json',
  },
});
```

## Resultado Esperado

Após as alterações:
- Interface mais clara com apenas 2 campos necessários
- QR Code gerado corretamente
- Conexão/desconexão funcionando
- Status verificado corretamente

