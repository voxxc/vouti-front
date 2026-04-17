

## Causa raiz

A RLS de `processos_oab` só permite SELECT onde `tenant_id = get_user_tenant_id()`. Como super admin Daniel está no tenant **vouti**, a query direta `supabase.from('processos_oab').select('tenant_id').is('detalhes_request_id', null)` retorna **zero linhas dos outros tenants** — por isso os badges aparecem vazios mesmo havendo 329 processos incompletos no banco (98 oliveira, 94 demorais, 74 harles, 44 vouti, 19 cordeiro).

O `TenantProcessosIncompletosDialog` tem o mesmo problema: lista vazia para qualquer tenant que não seja o do super admin.

## Correção

Criar 2 funções RPC `SECURITY DEFINER` que verificam super admin antes de retornar dados cross-tenant, e refatorar o hook + dialog para usar essas RPCs.

### Migration SQL

**`get_incomplete_processos_count_by_tenant()`** — retorna `tenant_id, count` agrupado.
- Verifica `is_super_admin(auth.uid())`; se falso, retorna apenas o próprio tenant.
- `SELECT tenant_id, COUNT(*) FROM processos_oab WHERE detalhes_request_id IS NULL AND numero_cnj IS NOT NULL GROUP BY tenant_id`.

**`get_incomplete_processos_by_tenant(p_tenant_id uuid)`** — retorna lista detalhada para o dialog.
- Verifica super admin OU se tenant_id bate com o do usuário.
- Retorna `id, numero_cnj, created_at, monitoramento_ativo, oab_id`.

### Refactor frontend

- `src/hooks/useIncompleteProcessosCount.ts` — trocar query direta por `supabase.rpc('get_incomplete_processos_count_by_tenant')`.
- `src/components/SuperAdmin/TenantProcessosIncompletosDialog.tsx` (linhas 46-62) — trocar query direta por `supabase.rpc('get_incomplete_processos_by_tenant', { p_tenant_id: tenant.id })`.

## Validação

Após deploy, abrir `/super-admin` → conferir badges:
- oliveira (`f04593b2`): **98**
- demorais (`27492091`): **94**
- harles (`f0c6c87a`): **74**
- vouti (`d395b3a1`): **44**
- cordeiro (`272d9707`): **19**

Clicar no badge da Solvenza/Cordeiro → ver lista preenchida com CNJs reais.

