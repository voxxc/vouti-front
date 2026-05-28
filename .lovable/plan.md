# Processos sigilosos por tenant (super-admin)

## Causa raiz
Hoje não há visão dedicada para processos com `secrecy_level > 0` por tenant. O campo existe dentro do JSON `processos_oab.capa_completa` (`secrecy_level`: 0 público, 1 segredo de justiça, 5 sigilo absoluto). No painel super-admin já existem pills tipo "Processos parados" / "Processos incompletos", mas não há equivalente para sigilosos.

## Correção
1. **RPC `get_tenant_processos_sigilosos(p_tenant_id uuid)`** (SECURITY DEFINER, restrita a super-admin via `is_super_admin(auth.uid())` no início) — retorna, para o tenant informado, todos os `processos_oab` onde `(capa_completa->>'secrecy_level')::int > 0`:
   - `id`, `numero_cnj`, `oab_id`, `tribunal_sigla`, `parte_ativa`, `parte_passiva`, `secrecy_level`, `monitoramento_ativo`, `ultima_atualizacao_detalhes`, `created_at`.
   - Ordena por `secrecy_level desc, ultima_atualizacao_detalhes desc nulls last`.

2. **Hook** `src/hooks/useTenantProcessosSigilosos.ts` no mesmo padrão de `useTenantProcessosParados`: query habilitada quando o dialog abre.

3. **Dialog** `src/components/SuperAdmin/TenantProcessosSigilososDialog.tsx`:
   - Cabeçalho com nome do tenant e contagem total.
   - Tabela: CNJ (mono), Partes (ativa x passiva), Tribunal, OAB vinculada, Nível de sigilo (badge: 1 = "Segredo de justiça" amarelo, 5 = "Sigilo absoluto" vermelho), Monitoramento (badge on/off), Última atualização (`formatRelativeDate`).
   - Filtro local por nível (Todos / 1 / 5) e busca por CNJ/parte.
   - Estado vazio amigável.

4. **`src/components/SuperAdmin/TenantRow.tsx`** — adicionar pill `Processos sigilosos` (ícone `Lock` ou `ShieldAlert` do lucide) no `ActionGroup label="Auditoria"`, abrindo o novo dialog. Reaproveitar o estado `showSigilosos`.
   - Replicar a mesma pill no `TenantRowMobile.tsx` e `TenantCard.tsx` para manter paridade visual (mesmos botões em mobile/desktop).

## Arquivos afetados
- novo: `supabase/migrations/<timestamp>_get_tenant_processos_sigilosos.sql`
- novo: `src/hooks/useTenantProcessosSigilosos.ts`
- novo: `src/components/SuperAdmin/TenantProcessosSigilososDialog.tsx`
- edit: `src/components/SuperAdmin/TenantRow.tsx`
- edit: `src/components/SuperAdmin/TenantRowMobile.tsx`
- edit: `src/components/SuperAdmin/TenantCard.tsx`

## Impacto
1. **Usuário final (super-admin)**: nova pill na linha "Auditoria" de cada tenant; ao abrir, lista todos os processos sigilosos daquele cliente com nível, partes, OAB, status de monitoramento e última atualização. Nenhum tenant comum vê nada — é UI exclusiva do painel super-admin.
2. **Dados**: nenhuma alteração estrutural. Apenas uma nova função RPC `SECURITY DEFINER` de leitura sobre `processos_oab` filtrando por `tenant_id` e por `secrecy_level > 0` lido do JSON `capa_completa`. Sem migrations destrutivas, sem mudança em RLS de tabelas existentes.
3. **Riscos colaterais**: baixos. A RPC precisa do guard `is_super_admin` para não virar vazamento cross-tenant; sem o guard, qualquer usuário autenticado conseguiria ler processos sigilosos de outros tenants. Performance: o filtro depende de cast JSON; com volume atual (~700 processos no tenant testado) é trivial, mas para tenants grandes pode-se adicionar índice `((capa_completa->>'secrecy_level'))` em iteração futura se necessário.
4. **Afetados**: somente super-admins. Advogados, admins de tenant, estagiários etc. não veem mudança nenhuma.

## Validação
- Executar a RPC para o tenant Solvenza e conferir que retorna ~44 processos (39 nível 1 + 5 nível 5) batendo com a contagem atual do banco.
- Conferir que usuário não super-admin recebe erro/array vazio ao chamar a RPC.
- Abrir o dialog no card da Solvenza e validar contagem, filtro por nível e busca.
- Smoke test em mobile (`TenantRowMobile`) e no `TenantCard`.
