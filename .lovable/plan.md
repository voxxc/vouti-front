
# Plano: Corrigir Envio de Mensagens do Bot via Z-API

## Problema Identificado

O webhook está montando a URL incorretamente para o Z-API:

| Situação | Valor |
|----------|-------|
| URL no banco | `https://api.z-api.io/instances/3E8A7687638142678C80FA4754EC29F2` |
| Token no banco | `F5DA3871D271E4965BD44484` |
| URL montada | `https://api.z-api.io/instances/3E8A7687.../send-text` ❌ |
| URL correta | `https://api.z-api.io/instances/3E8A7687.../token/F5DA3871.../send-text` ✅ |

A Z-API requer o token na URL, não apenas no header. O campo `Client-Token` no header é para um **Account Security Token** separado, não o token da instância.

## Solução

Modificar o código para montar a URL corretamente incluindo o token:

```text
ANTES:
  zapiUrl = `${zapi_url}/send-text`
  
DEPOIS:
  zapiUrl = `${zapi_url}/token/${zapi_token}/send-text`
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-webhook/index.ts` | Corrigir montagem da URL em 3 locais |

## Detalhes Técnicos

### 1. Linha ~209 (Automações)
```typescript
// ANTES
const zapiUrl = `${instance.zapi_url}/send-text`;

// DEPOIS  
const zapiUrl = `${instance.zapi_url}/token/${instance.zapi_token}/send-text`;
```

### 2. Linha ~329 (Resposta IA)
```typescript
// ANTES
const zapiUrl = `${zapi_url}/send-text`;

// DEPOIS
const zapiUrl = `${zapi_url}/token/${zapi_token}/send-text`;
```

### 3. Manter Client-Token no Header (Opcional para Security Token)
```typescript
headers: { 
  'Content-Type': 'application/json',
  'Client-Token': zapi_token || '', // Este pode ser mantido para segurança adicional
},
```

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  LEAD ENVIA MENSAGEM                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. Webhook recebe mensagem do lead                                        │
│   2. Busca instância: zapi_url + zapi_token                                 │
│   3. Chama whatsapp-ai-chat → IA gera resposta ✅                           │
│   4. Monta URL: ${zapi_url}/token/${zapi_token}/send-text                   │
│   5. POST para Z-API com a resposta da IA                                   │
│   6. Z-API envia mensagem para o WhatsApp do lead ✅                        │
│   7. Salva mensagem no banco como outgoing                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Resultado Esperado

Após a correção:
- Lead envia mensagem
- IA gera resposta (já funciona)
- Resposta é enviada via Z-API para o WhatsApp do lead ✅
- Mensagem aparece na interface E chega no celular do lead
