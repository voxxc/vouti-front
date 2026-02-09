

## Corrigir Debounce: Unique Constraint com NULL tenant_id

### Problema Identificado

A constraint `UNIQUE (phone, tenant_id)` nao funciona quando `tenant_id` e NULL no PostgreSQL. O comportamento padrao do PostgreSQL trata cada NULL como valor distinto, entao:

- O upsert com `onConflict: 'phone,tenant_id'` **nunca detecta conflito** quando `tenant_id = NULL`
- Cada mensagem cria um **novo registro** em vez de atualizar o existente
- Resultado: registros duplicados acumulam (ja existem 2 no banco para o mesmo telefone)
- O debounce nao consegue comparar `scheduled_at` corretamente porque ha multiplos registros

### Evidencia no banco

Dois registros com status `pending` para o mesmo telefone:
- `id: 0d84a40d...` | phone: 5545988282387 | tenant_id: NULL | scheduled_at: 14:14:35
- `id: 5fb945d8...` | phone: 5545988282387 | tenant_id: NULL | scheduled_at: 14:12:11

O segundo deveria ter sido atualizado (upsert), mas foi inserido como novo por causa do bug com NULL.

### Solucao

**1. Migracao SQL**

- Remover a constraint `unique_pending_phone_tenant` atual
- Criar um indice unico parcial para tenant_id NULL: `CREATE UNIQUE INDEX ON whatsapp_ai_pending_responses (phone) WHERE tenant_id IS NULL`
- Criar um indice unico parcial para tenant_id NOT NULL: `CREATE UNIQUE INDEX ON whatsapp_ai_pending_responses (phone, tenant_id) WHERE tenant_id IS NOT NULL`
- Limpar registros duplicados existentes

**2. Edge Function `whatsapp-webhook/index.ts`**

Alterar a logica de upsert no `handleAIResponse` para nao usar `onConflict` (que nao funciona com NULL). Em vez disso, fazer manualmente:

```text
1. Buscar registro pendente existente (phone + tenant_id, com .is() para NULL)
2. Se existe: UPDATE scheduled_at e status = 'pending'
3. Se nao existe: INSERT novo registro
```

**3. Edge Function `whatsapp-ai-debounce/index.ts`**

Sem alteracoes necessarias -- a logica de verificacao ja usa `.eq()` e `.is()` corretamente para queries. O problema era apenas no upsert do webhook.

**4. UI (WhatsAppAISettings.tsx)**

Sem alteracoes -- o componente ja esta funcional com o slider de 0 a 30 segundos e salva corretamente o `response_delay_seconds`.

### Detalhes tecnicos

A raiz do problema e que PostgreSQL trata `NULL != NULL` em unique constraints. A solucao com indices parciais e o padrao recomendado pelo PostgreSQL para lidar com colunas nullable em constraints de unicidade.

A logica no webhook passara de:
```text
supabase.from('whatsapp_ai_pending_responses')
  .upsert({...}, { onConflict: 'phone,tenant_id' })  // NAO FUNCIONA com NULL
```

Para:
```text
1. SELECT WHERE phone = X AND tenant_id IS NULL (ou = Y)
2. Se existe: UPDATE SET scheduled_at = novo_valor, status = 'pending'
3. Se nao existe: INSERT
```

Isso garante que apenas 1 timer ativo exista por contato, independente do tenant_id ser NULL ou nao.

