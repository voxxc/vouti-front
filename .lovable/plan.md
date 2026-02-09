

# Plano: Corrigir Registro e Atualização de Conversas WhatsApp

## Problemas Identificados

### 1. Coluna `is_from_me` NÃO EXISTE na tabela

Nos logs da Edge Function:
```
Error saving message to DB: {
  code: "PGRST204",
  message: "Could not find the 'is_from_me' column of 'whatsapp_messages' in the schema cache"
}
```

Ambas as Edge Functions (`whatsapp-webhook` e `whatsapp-send-message`) tentam salvar `is_from_me: true`, mas essa coluna não existe na tabela.

**Colunas existentes na tabela `whatsapp_messages`:**
- id, instance_name, message_id, from_number, to_number
- message_text, message_type, direction, timestamp
- raw_data, created_at, user_id, is_read, tenant_id

### 2. Super Admin não vê mensagens porque todas têm `tenant_id`

Consultando o banco:
```
tenant_id: d395b3a1-1ea1-4710-bcc1-ff5f6a279750
```
Todas as mensagens recentes têm `tenant_id` definido. O Super Admin busca com `.is("tenant_id", null)`, então não encontra nada.

### 3. Webhook salva com `tenant_id` da instância, não do Super Admin

Quando você envia do Super Admin:
1. `whatsapp-send-message` envia com `mode: 'superadmin'` (correto)
2. Tenta salvar com `tenant_id: null` (correto)
3. Mas falha por causa do `is_from_me`

Quando lead responde:
1. Webhook recebe a mensagem
2. Busca a instância associada ao `instanceId`
3. Salva com o `tenant_id` da instância (errado para Super Admin)

## Soluções

### Parte 1: Remover campo inexistente `is_from_me`

Remover `is_from_me` de ambas as Edge Functions, já que `direction: 'outgoing'` já indica isso.

| Arquivo | Alteração |
|---------|-----------|
| `whatsapp-webhook/index.ts` | Remover `is_from_me: true` da função `saveOutgoingMessage` |
| `whatsapp-send-message/index.ts` | Remover `is_from_me: true` do objeto `messageRecord` |

### Parte 2: Corrigir lógica de `tenant_id` no Webhook

O webhook precisa detectar se a instância é do "Super Admin" (whatsapp-bot) e manter `tenant_id: null` nesses casos.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  FLUXO ATUAL (PROBLEMA)                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Lead responde → Webhook → Busca instance → Pega tenant_id da instância    │
│                                               ↓                             │
│                                   Salva com tenant_id = "xyz"               │
│                                               ↓                             │
│                            Super Admin busca tenant_id IS NULL              │
│                                               ↓                             │
│                                    NÃO ENCONTRA MENSAGEM! ❌                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  FLUXO CORRIGIDO                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Lead responde → Webhook → Busca instance → Verifica instance_name         │
│                                               ↓                             │
│                       Se instance_name == 'whatsapp-bot':                   │
│                           tenant_id = NULL (Super Admin)                    │
│                       Senão:                                                │
│                           tenant_id = instance.tenant_id                    │
│                                               ↓                             │
│                            Super Admin encontra mensagem! ✅                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Parte 3: Ajustar Super Admin para usar instância correta

Verificar se existe uma instância "whatsapp-bot" ou se o Super Admin usa as credenciais globais (Z_API_URL, Z_API_TOKEN).

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-webhook/index.ts` | 1. Remover `is_from_me` 2. Detectar instância Super Admin |
| `supabase/functions/whatsapp-send-message/index.ts` | Remover `is_from_me` |

## Alterações Detalhadas

### 1. `whatsapp-webhook/index.ts` - Função `saveOutgoingMessage`

```typescript
// ANTES (linha 45):
is_from_me: true,

// DEPOIS:
// Removido - campo não existe na tabela
```

### 2. `whatsapp-webhook/index.ts` - Função `handleIncomingMessage`

```typescript
// ANTES (linhas 147-148):
user_id: instance.user_id,
tenant_id: instance.tenant_id,

// DEPOIS:
user_id: instance.user_id,
// Se instância for do Super Admin (whatsapp-bot ou credenciais globais), tenant_id = null
tenant_id: instance.instance_name === 'whatsapp-bot' || !instance.tenant_id 
  ? null 
  : instance.tenant_id,
```

### 3. `whatsapp-send-message/index.ts`

```typescript
// ANTES (linha 80):
is_from_me: true,

// DEPOIS:
// Removido - campo não existe na tabela
```

## Fluxo Visual Corrigido

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  SUPER ADMIN ENVIA MENSAGEM                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. Super Admin clica "Enviar"                                             │
│   2. whatsapp-send-message recebe mode: 'superadmin'                        │
│   3. Envia via Z-API (credenciais globais)                                  │
│   4. Salva no banco COM:                                                    │
│      - from_number: telefone do lead                                        │
│      - direction: 'outgoing'                                                │
│      - tenant_id: NULL                                                      │
│   5. Inbox do Super Admin atualiza (tenant_id IS NULL)                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  LEAD RESPONDE                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. Z-API envia webhook                                                    │
│   2. whatsapp-webhook verifica instanceId                                   │
│   3. Se instanceId usa credenciais globais ou whatsapp-bot:                 │
│      → tenant_id = NULL (Super Admin)                                       │
│   4. Salva mensagem COM tenant_id correto                                   │
│   5. Inbox correto atualiza (Tenant OU Super Admin)                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Problema Adicional: Instance ID

Nos logs, o `instanceId` é `3E8A7687638142678C80FA4754EC29F2` - esse é o ID da Z-API, não o nome da instância no banco.

Preciso verificar como a instância do Super Admin está configurada para garantir que o webhook identifique corretamente.

## Resumo das Correções

1. **Remover `is_from_me`** de ambas as Edge Functions (campo não existe)
2. **Detectar instância Super Admin** no webhook e manter `tenant_id: null`
3. **Garantir consistência** entre envio e recebimento de mensagens

## Resultado Esperado

Após as correções:
- Mensagens enviadas pelo Super Admin serão salvas com `tenant_id: null`
- Mensagens recebidas de leads (via instância global) terão `tenant_id: null`
- O inbox do Super Admin vai exibir todas as mensagens corretamente
- A conversa vai atualizar em tempo real

