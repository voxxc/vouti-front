

# Plano: Corrigir Mapeamento do Client-Token

## Problema Raiz Confirmado

O campo `zapi_url` no banco de dados contém dados antigos (URL completa), e o código está mapeando isso para o `zapi_client_token`, fazendo com que a URL seja enviada como header de autenticação.

```text
Banco de Dados:
┌─────────────────┬───────────────────────────────────────────────┐
│ Campo           │ Valor                                         │
├─────────────────┼───────────────────────────────────────────────┤
│ instance_name   │ 3E8A7687638142678C80FA4754EC29F2              │
│ zapi_token      │ F5DA3871D271E4965BD44484                      │
│ zapi_url        │ https://api.z-api.io/.../send-text (ANTIGO)   │
└─────────────────┴───────────────────────────────────────────────┘

Código Atual (ERRADO):
┌─────────────────────────────────────────────────────────────────┐
│ zapi_client_token: data.zapi_url  → Envia URL como token!      │
└─────────────────────────────────────────────────────────────────┘
```

## Solução

### 1. Ignorar o Campo `zapi_url` Antigo

O `zapi_url` não deve mais ser usado para nada. O Client-Token é **opcional** e deve começar vazio se não foi configurado explicitamente.

### 2. Alterações no Código

**Arquivo:** `src/components/SuperAdmin/WhatsApp/SuperAdminAgentConfigDrawer.tsx`

Mudar o `loadInstanceConfig`:
```typescript
// ANTES (errado)
zapi_client_token: data.zapi_url || "",

// DEPOIS (correto)
zapi_client_token: "",  // Client-Token é opcional, começa vazio
```

**Importante:** O campo `zapi_url` do banco será ignorado na leitura. Se o usuário precisar de um Client-Token específico (Security Token), ele deve preencher manualmente.

### 3. Ajustar o `handleSave`

Não salvar o `zapi_client_token` no campo `zapi_url`:
```typescript
// ANTES
zapi_url: config.zapi_client_token,

// DEPOIS - Não salvar URL, apenas limpar ou adicionar novo campo
zapi_url: null,  // ou remover esse campo do update
```

### 4. Edge Function - Fallback Correto

A edge function já está correta com:
```typescript
authToken = zapi_client_token || zapi_instance_token;
```

Se `zapi_client_token` estiver vazio, usa o `zapi_instance_token` automaticamente.

## Fluxo Correto Após Correção

```text
Frontend envia:
┌──────────────────────────────────────────┐
│ zapi_instance_id: "3E8A768..."           │
│ zapi_instance_token: "F5DA387..."        │
│ zapi_client_token: "" (vazio)            │
└──────────────────────────────────────────┘
           │
           ▼
Edge Function processa:
┌──────────────────────────────────────────┐
│ baseUrl: https://api.z-api.io/instances/ │
│          3E8A768.../token/F5DA387...     │
│                                          │
│ authToken = "" || "F5DA387..."           │
│           = "F5DA387..."                 │
│                                          │
│ Header: Client-Token: F5DA387...         │
└──────────────────────────────────────────┘
           │
           ▼
Z-API aceita e retorna QR Code!
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `SuperAdminAgentConfigDrawer.tsx` | Não carregar `zapi_url` como client_token |
| `AgentConfigDrawer.tsx` | Mesma correção para tenants |

## Resumo Técnico

1. **Remover mapeamento incorreto**: `zapi_client_token` não deve receber `data.zapi_url`
2. **Client-Token começa vazio**: Só será preenchido se o usuário configurar manualmente
3. **Fallback funciona**: Se vazio, a edge function usa o Instance Token como autenticação

