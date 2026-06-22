## Causa raiz

O drawer "Movimentos manuais" do super-admin (`SuperAdminMovimentosManuaisDrawer`) lista processos do tenant sem indicar a qual OAB cadastrada cada processo pertence. A tabela `processos_oab` tem o campo `oab_id`, mas a edge function `super-admin-listar-processos-oab` não o devolve no payload, e a UI não tem nem coluna nem filtro por OAB.

## Correção

### A) Edge function `super-admin-listar-processos-oab`
- Incluir `oab_id` no `select` de `processos_oab`.
- Após a paginação, fazer um único `select` em `oabs_cadastradas` (`id, oab_numero, oab_uf, nome_advogado`) com `.in('id', oabIdsUnicos)` filtrado por `tenant_id` e mapear cada processo com `oab_numero`, `oab_uf`, `nome_advogado`.
- Devolver também um array `oabs` (deduplicado, ordenado por `nome_advogado`/`oab_numero`) para alimentar o select da UI sem reprocessar no cliente.

### B) `SuperAdminMovimentosManuaisDrawer.tsx`
- Adicionar `oab_id`, `oab_numero`, `oab_uf`, `nome_advogado` ao tipo `ProcessoLite`.
- Novo estado `filtroOab: string` (default `'todas'`).
- Novo `Select` ao lado do filtro existente, populado com a lista `oabs` retornada pela função (label: `OAB nº/UF — Nome` quando houver, fallback `OAB nº/UF`; opção "Todas as OABs" + "Sem OAB"). Mostra contagem por OAB calculada localmente em `useMemo`.
- Filtro combinado: `filtrados` aplica `filtroOab` antes do filtro existente e da busca textual (filtros se acumulam).
- Nova coluna **OAB** na tabela (após "Tribunal"), exibindo `nº/UF` em badge; tooltip com nome do advogado. Quando `oab_id` for `null`, mostra `—`.

## Arquivos afetados

- `supabase/functions/super-admin-listar-processos-oab/index.ts` — adicionar `oab_id` no select, enriquecer resposta com dados de `oabs_cadastradas` e devolver lista `oabs`.
- `src/components/SuperAdmin/SuperAdminMovimentosManuaisDrawer.tsx` — novo filtro Select de OAB, nova coluna na tabela, novo estado e tipo.

## Impacto

- **Usuário final (super-admin):** ganha ao lado do filtro atual um segundo Select "OAB" listando todas as OABs cadastradas que têm processo no tenant, com contagem; pode combinar com o filtro de monitoramento/UF/sigilosos e com a busca. Nova coluna na tabela mostra a OAB de cada processo.
- **Dados:** sem migration. Apenas mais um JOIN leve em `oabs_cadastradas` (já indexada por `id`) por chamada da função. Payload da função cresce em ~3 campos por processo + array de OABs (pequeno).
- **Riscos colaterais:** processos antigos com `oab_id` nulo continuam aparecendo (tratados como "Sem OAB"). Se um processo tem `oab_id` apontando para uma OAB removida, mostra `—` e cai em "Sem OAB". Nenhum impacto em outros tenants/telas.
- **Quem é afetado:** apenas super-admins, dentro do drawer "Movimentos manuais".

## Validação

- Abrir o drawer em um tenant com várias OABs (ex.: `27492091-...`) e conferir que o select lista cada OAB com contagem.
- Selecionar uma OAB → tabela mostra apenas processos daquela OAB; combinar com filtro "Monitorados" e busca CNJ — todos devem se aplicar simultaneamente.
- Selecionar "Sem OAB" → só processos com `oab_id` nulo.
- Conferir que a coluna OAB renderiza `nº/UF` correto e o tooltip traz o nome do advogado.