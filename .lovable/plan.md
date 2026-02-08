

# Correção: Mensagens do WhatsApp Webhook Não Aparecem no Site

## Diagnóstico Detalhado

Analisando os logs e o banco de dados, identifiquei **3 problemas principais**:

### Problema 1: Falta de `tenant_id` nas Mensagens e Instâncias

Os dados no banco mostram:
```
whatsapp_messages:
  - tenant_id: NULL  ← Deveria ser o tenant do DEMORAIS
  - user_id: d4bcecc4-661a-430c-9b84-abdc3576a896

whatsapp_instances:
  - tenant_id: NULL  ← Deveria ter o tenant do DEMORAIS
  - user_id: d4bcecc4-661a-430c-9b84-abdc3576a896
```

O usuário `d4bcecc4-661a-430c-9b84-abdc3576a896` (danieldemorais.e@gmail.com) pertence ao tenant `27492091-e05d-46a8-9ee8-b3b47ec894e4`, **NÃO ao tenant DEMORAIS** (`d395b3a1-1ea1-4710-bcc1-ff5f6a279750`).

### Problema 2: RLS Bloqueia Visualização

As policies atuais de `whatsapp_messages`:
```sql
SELECT: auth.uid() = user_id  -- Só vê se for o user_id da mensagem
SELECT: has_role(auth.uid(), 'admin')  -- OU se for admin
```

Se o usuário do tenant DEMORAIS (ex: `contato@vouti.co` com `user_id = c3bdf9c8-...`) tenta ver as mensagens, a RLS bloqueia porque:
- O `user_id` das mensagens é `d4bcecc4-...` (outro usuário)
- Não há verificação por `tenant_id`

### Problema 3: Webhook Não Salva `tenant_id`

No arquivo `whatsapp-webhook/index.ts`, linha 106-119:
```typescript
const { error: insertError } = await supabase
  .from('whatsapp_messages')
  .insert({
    instance_name: instanceId,
    message_id: messageId,
    from_number: phone,
    message_text: text?.message || '',
    user_id: instance.user_id,
    // ❌ FALTA: tenant_id: instance.tenant_id
  });
```

O webhook busca apenas `user_id` da instância, mas não busca nem salva o `tenant_id`.

---

## Solução Proposta

### 1. Corrigir Edge Function `whatsapp-webhook`

**Arquivo**: `supabase/functions/whatsapp-webhook/index.ts`

Modificar para buscar e salvar `tenant_id`:
```typescript
// Buscar user_id E tenant_id da instância
const { data: instance } = await supabase
  .from('whatsapp_instances')
  .select('user_id, tenant_id')  // ← Adicionar tenant_id
  .eq('instance_name', instanceId)
  .single();

// Salvar mensagem COM tenant_id
const { error: insertError } = await supabase
  .from('whatsapp_messages')
  .insert({
    instance_name: instanceId,
    // ... outros campos
    user_id: instance.user_id,
    tenant_id: instance.tenant_id,  // ← NOVO
  });
```

### 2. Atualizar RLS de `whatsapp_messages`

Trocar policy de `user_id` para `tenant_id` para isolamento multi-tenant:
```sql
-- Remover policy antiga
DROP POLICY IF EXISTS "Users can view their own WhatsApp messages" ON whatsapp_messages;

-- Nova policy baseada em tenant
CREATE POLICY "tenant_select" ON whatsapp_messages
  FOR SELECT USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
  );

-- Manter policy de admin para super admins
CREATE POLICY "admin_select" ON whatsapp_messages
  FOR SELECT USING (is_super_admin(auth.uid()));
```

### 3. Corrigir Dados Existentes

Atualizar os registros existentes para associar ao tenant correto:
```sql
-- Atualizar instância com tenant_id do DEMORAIS
UPDATE whatsapp_instances 
SET tenant_id = 'd395b3a1-1ea1-4710-bcc1-ff5f6a279750'
WHERE instance_name = '3E8A7687638142678C80FA4754EC29F2';

-- Atualizar mensagens existentes
UPDATE whatsapp_messages 
SET tenant_id = 'd395b3a1-1ea1-4710-bcc1-ff5f6a279750'
WHERE instance_name = '3E8A7687638142678C80FA4754EC29F2';
```

### 4. Atualizar Frontend `WhatsAppBot.tsx`

Modificar para filtrar por `tenant_id` ao invés de `user_id`:
```typescript
// Buscar mensagens do tenant, não do user
const { data: messages } = await supabase
  .from('whatsapp_messages')
  .select('*')
  .eq('tenant_id', tenantId)  // ← Trocar user_id por tenant_id
  .order('timestamp', { ascending: false });
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/whatsapp-webhook/index.ts` | Buscar e salvar `tenant_id` nas mensagens |
| `src/components/CRM/WhatsAppBot.tsx` | Filtrar por `tenant_id` ao carregar mensagens |
| Migração SQL | Atualizar RLS + dados existentes |

---

## Fluxo Corrigido

```text
Z-API envia webhook
       │
       ▼
┌──────────────────────────────────────────────┐
│ whatsapp-webhook Edge Function               │
│ 1. Valida dados                              │
│ 2. Busca instância por instanceId            │
│ 3. Obtém user_id + tenant_id da instância    │
│ 4. Salva mensagem COM tenant_id              │
└──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ whatsapp_messages                            │
│ - tenant_id: d395b3a1-... (DEMORAIS)         │
│ - from_number: 554588083583                  │
│ - message_text: "Olá"                        │
└──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ RLS Policy: tenant_id = get_user_tenant_id() │
│ ✅ Usuário DEMORAIS consegue ver mensagens   │
└──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ WhatsAppBot.tsx                              │
│ .eq('tenant_id', tenantId)                   │
│ → Exibe conversas do tenant corretamente     │
└──────────────────────────────────────────────┘
```

---

## Resumo das Ações

1. **SQL Migration**: Corrigir RLS e dados existentes
2. **Edge Function**: Adicionar `tenant_id` no salvamento de mensagens
3. **Frontend**: Filtrar mensagens por `tenant_id`

Isso resolve o problema de mensagens não aparecerem para usuários do tenant correto.

