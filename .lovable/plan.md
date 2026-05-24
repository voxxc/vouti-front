## Trackings ON/OFF vazios no Banco de IDs

### Causa raiz

Na última mudança, troquei a fonte das abas Trackings ON/OFF de `tenant_banco_ids` (que tem policy `is_super_admin(auth.uid())`) para leitura direta em `processos_oab` e `cnpjs_cadastrados`.

Essas duas tabelas **não têm policy de super-admin**. As policies de SELECT existentes filtram por `tenant_id = get_user_tenant_id()`, ou seja, só retornam linhas do tenant do próprio usuário logado. Quando o super-admin (que pertence ao tenant `vouti` interno) abre o Banco de IDs de outro tenant (ex.: Solvenza), as duas queries retornam **0 linhas** → as abas aparecem vazias e os contadores zeram.

`tenant_banco_ids` continuava funcionando antes porque tinha a policy `Super admins podem ver todos os IDs`.

### Correção

Criar uma RPC security-definer `get_tenant_trackings_live(p_tenant_id uuid)` que:
- valida `is_super_admin(auth.uid())` (ou usuário do próprio tenant);
- retorna os trackings vivos de `processos_oab` + `cnpjs_cadastrados` daquele tenant, com colunas `processo_id, numero_cnj, tribunal, tracking_id, monitoramento_ativo, updated_at, source`.

Trocar as duas chamadas paginadas em `TenantBancoIdsDialog.tsx` por uma única chamada `supabase.rpc('get_tenant_trackings_live', { p_tenant_id: tenantId })`.

### Arquivos afetados

- Nova migration: criar função `get_tenant_trackings_live`.
- `src/components/SuperAdmin/TenantBancoIdsDialog.tsx`: substituir os dois `fetchAllPaginated` de `processos_oab`/`cnpjs_cadastrados` por `supabase.rpc(...)`; manter o mapeamento para `TrackingLive[]`.

### Impacto

1. **Usuário (Super-Admin):** Trackings ON volta a mostrar os 311+ trackings únicos do Solvenza (e equivalente para outros tenants). Trackings OFF idem.
2. **Dados:** Sem mudança de schema, sem mudança em RLS de tabelas. Apenas nova função com `SECURITY DEFINER` + `SET search_path = public`, gate por `is_super_admin`.
3. **Riscos colaterais:** Baixos. A RPC só lê e exige super-admin; não abre acesso novo a clientes. Nenhuma alteração para tenants comuns.
4. **Quem é afetado:** Apenas o Super-Admin (Vouti). Nenhum cliente final.

### Validação

- Abrir Banco de IDs do Solvenza → Trackings ON mostra ~311 únicos / ~334 linhas, batendo com o painel de Migração.
- Tenant pequeno (Daniel Pereira de Morais) → Trackings ON exibe 2.
- Trackings OFF popula para tenants com migração já desativada.
- Outras abas (Requests CNJ, OABs, Push-docs, Atividade) seguem funcionando.
