
# Plano: Fazer a IA Responder nas Conversas do WhatsApp

## Problema Atual

O fluxo da IA **já está implementado**, mas não funciona porque há uma inconsistência de `tenant_id`:

| Componente | tenant_id |
|------------|-----------|
| Config IA (whatsapp_ai_config) | `NULL` (Super Admin) |
| Instância Z-API (whatsapp_instances) | `d395b3a1-...` (Solvenza) |
| Webhook verifica IA com | `instance.tenant_id` (Solvenza) |
| Resultado | ❌ "IA não habilitada para este tenant" |

**Causa raiz:** O webhook passa `instance.tenant_id` para `handleAIResponse()`, mas a IA está configurada com `tenant_id: NULL`.

## Fluxo Atual vs Corrigido

```text
FLUXO ATUAL (Problema):

   Lead envia mensagem
          ↓
   Webhook busca instance → tenant_id = "d395b3a1..." (Solvenza)
          ↓
   handleAIResponse(tenant_id = "d395b3a1...")
          ↓
   Busca whatsapp_ai_config WHERE tenant_id = "d395b3a1..."
          ↓
   NÃO ENCONTRA (config tem tenant_id = NULL)
          ↓
   "IA não habilitada" ❌


FLUXO CORRIGIDO:

   Lead envia mensagem
          ↓
   Webhook busca instance
          ↓
   effectiveTenantId = instance.tenant_id || null
          ↓
   handleAIResponse(tenant_id = effectiveTenantId)
          ↓
   Busca whatsapp_ai_config WHERE tenant_id IS NULL (ou = effectiveTenantId)
          ↓
   ENCONTRA config IA ✅
          ↓
   Gera resposta via Lovable AI
          ↓
   Envia via Z-API
          ↓
   Salva no banco (aparece na conversa)
```

## Solução

Modificar a linha 164-170 do `whatsapp-webhook/index.ts` para passar `effectiveTenantId` em vez de `instance.tenant_id`:

| Antes | Depois |
|-------|--------|
| `handleAIResponse(..., instance.tenant_id, ...)` | `handleAIResponse(..., effectiveTenantId, ...)` |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-webhook/index.ts` | Usar `effectiveTenantId` na chamada de `handleAIResponse` |

## Detalhes Técnicos

### Linha 163-170 (webhook atual):
```typescript
// 🤖 PRIMEIRO: Verificar se IA está habilitada para este tenant
const aiHandled = await handleAIResponse(
  phone, 
  text?.message || '', 
  instance.tenant_id,  // ← PROBLEMA: usa tenant_id da instância
  instance.zapi_url, 
  instance.zapi_token
);
```

### Linha 163-170 (corrigido):
```typescript
// 🤖 PRIMEIRO: Verificar se IA está habilitada para este tenant
const aiHandled = await handleAIResponse(
  phone, 
  text?.message || '', 
  effectiveTenantId,  // ← CORRIGIDO: usa effectiveTenantId (pode ser NULL)
  instance.zapi_url, 
  instance.zapi_token
);
```

## Fluxo Completo Após Correção

1. **Lead envia mensagem** → Z-API recebe e envia webhook
2. **Webhook processa**:
   - Busca instância pelo `instanceId`
   - Calcula `effectiveTenantId = instance.tenant_id || null`
   - Salva mensagem com `effectiveTenantId`
3. **Verifica IA**:
   - Chama `handleAIResponse(phone, message, effectiveTenantId, ...)`
   - Busca config IA onde `tenant_id IS NULL` (Super Admin)
   - ENCONTRA config ✅
4. **Processa IA**:
   - Chama `whatsapp-ai-chat` Edge Function
   - Busca histórico de mensagens do telefone
   - Monta contexto com system_prompt do Daniel
   - Chama Lovable AI Gateway (google/gemini-3-flash-preview)
   - Retorna resposta
5. **Envia resposta**:
   - Envia via Z-API com `Client-Token`
   - Salva resposta no banco (`direction: 'outgoing'`)
6. **UI atualiza**:
   - Polling de 2 segundos detecta nova mensagem
   - Conversa mostra mensagem do lead E resposta do bot

## Resultado Esperado

Após a correção:
- Lead envia "Olá, preciso de ajuda com dívidas"
- IA (Daniel) responde automaticamente com base no system_prompt
- Resposta aparece na conversa em tempo real
- Super Admin pode ver toda a conversa (mensagens do lead + respostas do bot)
