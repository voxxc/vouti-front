

## Diagnóstico Real

O problema **não é o refetch** — o `isActive` + `useEffect` está correto e dispara o fetch. O problema é que **o deadline criado não é encontrado pela query**.

A `CreateDeadlineDialog` insere o deadline **sem `processo_oab_id`** (linha 91-102). A `PrazosCasoTab` busca por:
1. **Query direta**: `.eq('processo_oab_id', processoOabId)` → **não encontra** (campo não preenchido)
2. **Query via etapas**: busca etapas do protocolo com `.eq('protocolo.processo_oab_id', processoOabId)` → só funciona se o protocolo tiver `processo_oab_id` preenchido

### Solução

Incluir `processo_oab_id` no insert do deadline, buscando-o do protocolo.

### Alterações

**`src/components/Project/CreateDeadlineDialog.tsx`**
- Na query do protocolo, buscar também `processo_oab_id`: `.select('project_id, processo_oab_id')`
- No insert do deadline, adicionar: `processo_oab_id: protocolo.processo_oab_id`

São 2 linhas de mudança. Isso garante que a query direta da aba Prazos encontre o deadline imediatamente.

