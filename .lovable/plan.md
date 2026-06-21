## Causa raiz

As alterações feitas pelo super-admin nos andamentos (`processos_oab_andamentos`) já gravam no banco, mas o painel da controladoria do tenant (`ProcessoOABDetalhes.tsx`) ignora os campos:

- `super_admin_ordem` — a lista é ordenada apenas por `data_movimentacao DESC`, então o reorder manual nunca aparece.
- `dados_completos.sigiloso` e `dados_completos.tribunal_tag` — não são renderizados como badges.
- O Realtime UPDATE substitui o objeto na lista, mas não re-ordena, então ao salvar a ordem o tenant continua vendo a ordem antiga até dar refresh.

## Correção

1. **Hook `useAndamentosOAB` (`src/hooks/useOABs.ts`)**
   - `select('*')` continua, mas `.order('super_admin_ordem', { ascending: true, nullsFirst: false }).order('data_movimentacao', { ascending: false })`.
   - Extrair função `sortAndamentos(list)` que aplica a mesma regra (super_admin_ordem primeiro, depois data desc). Usar:
     - no `INSERT` realtime (substitui o sort por data atual);
     - no `UPDATE` realtime, re-sortar a lista após o `map`, garantindo que mudanças em `super_admin_ordem` reposicionem o card sem reload.
   - Incluir `super_admin_ordem` no tipo `AndamentoOAB`.

2. **Painel do tenant (`src/components/Controladoria/ProcessoOABDetalhes.tsx`)**
   - Carregar tribunais via `supabase.functions.invoke('super-admin-listar-tribunais-andamento')` uma vez quando o painel abre (a Edge Function já permite leitura para qualquer autenticado; tabela tem `tribunais_andamento_select_authenticated`). Guardar `Map<slug, {nome, cor}>`.
   - No card de cada andamento (loop em `andamentos.map`), renderizar:
     - Badge "Sigiloso" (estilo destaque) quando `andamento.dados_completos?.sigiloso === true`.
     - Badge do tribunal usando `dados_completos?.tribunal_tag`: nome e cor vindos do mapa; fallback exibe o slug.
   - Posicionar as badges junto às já existentes (`tipo_movimentacao`, `Manual`, anexos).

3. **Sem mudanças em Edge Functions ou migrations.** A Edge Function `super-admin-reordenar-andamentos` e `super-admin-atualizar-andamento` já gravam corretamente; basta o frontend tenant ler/ordenar/exibir.

## Arquivos afetados

- `src/hooks/useOABs.ts` — ordenação na query e nos handlers de Realtime; tipo `AndamentoOAB` ganha `super_admin_ordem` e campos opcionais relevantes do `dados_completos`.
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — fetch dos tribunais + renderização das badges (Sigiloso e Tribunal).
- (opcional) `src/components/Project/ProjectProcessos.tsx` — se também listar andamentos, aplicar a mesma ordenação. A listagem atual lá só conta `id, lida`, então não precisa.

## Impacto

1. **UX (usuário final do tenant)**: na aba "Andamentos" da controladoria, os movimentos passam a respeitar a ordem definida pelo super-admin; movimentos confidenciais ganham badge "Sigiloso" e movimentos com tag de tribunal (eproc, projudi, pje, esaj, tjgo-antigo, etc.) mostram a badge colorida correspondente. Exclusões já refletem via Realtime DELETE existente.
2. **Dados**: nenhuma migration, nenhuma RLS nova. Apenas leitura adicional em `super_admin_tribunais_andamento` (já liberada para autenticados). Performance: a ordenação dupla é barata (lista pequena por processo) e ambos os campos já existem.
3. **Riscos colaterais**: andamentos antigos sem `super_admin_ordem` (NULL) ficam ao final por causa de `nullsFirst:false`; comportamento antigo (somente data) é preservado quando nenhum reorder foi feito — desde que a ordem definida pelo super-admin contemple todos os itens (a Edge Function `super-admin-reordenar-andamentos` salva o índice de cada id na payload, então itens fora dela ficam NULL e caem para o sort por data). Se isso causar mistura, a Edge Function pode ser ajustada depois para preencher todos os ids; nesta entrega mantemos o comportamento atual.
4. **Quem é afetado**: todos os usuários do tenant que abrem o detalhe de um processo OAB na controladoria (advogado, agenda, financeiro, controller, admin). Super-admin não é afetado — continua usando o painel próprio.

## Validação

- Reordenar movimentos no painel super-admin, travar o cadeado, reabrir o processo no tenant → ordem nova aparece.
- Marcar um movimento como sigiloso e definir tribunal `pje` no super-admin → badges aparecem em tempo real (via Realtime UPDATE) no card do tenant, sem reload.
- Excluir um movimento no super-admin → some imediatamente do tenant (Realtime DELETE).
- Andamento manual sem `tribunal_tag`/`sigiloso` continua igual (sem badges novas).
