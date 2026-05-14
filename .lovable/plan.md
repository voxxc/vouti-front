## Causa raiz

O limite implícito de 1.000 linhas do Supabase ainda atinge consultas de `deadlines` em hooks/painéis que listam "todos os prazos visíveis". Quando o tenant ultrapassa esse volume, prazos somem silenciosamente de métricas e listas (mesmo sintoma do bug original do Alan).

Já foram corrigidos: `useProcessosMetrics`, `useAgendaData` (paginação manual), `PrazosDistributionChart`, `CentralSubtarefas`, `CentralPrazosConcluidos`, `PrazosOrfaosTab`.

Faltam telas que ainda fazem `.from('deadlines').select(...)` sem `fetchAllPaginated`/`.limit` justificado.

## Correção

Aplicar `fetchAllPaginated` / `fetchAllPaginatedIn` (de `@/lib/supabasePagination`) onde a intenção é "todos os registros". Manter `.limit(N)` apenas onde é uma janela explícita (top-N, prefetch, busca global).

### Trocar para paginação completa
1. **`src/components/Controladoria/PrazosCasoTab.tsx`** — 2 selects (`.eq('processo_oab_id', ...)` e `.in('protocolo_etapa_id', etapaIds)`) sem limite. Envolver com `fetchAllPaginated` / `fetchAllPaginatedIn`.
2. **`src/components/Project/ProjectProtocoloContent.tsx`** — `fetchPrazosVinculados` faz `.in('protocolo_etapa_id', etapaIds)` sem limite. Trocar por `fetchAllPaginatedIn`.
3. **`src/hooks/useAgendaData.ts`** — já pagina manualmente (loop de 20 páginas) mas duplica lógica. Refatorar para usar `fetchAllPaginated` (mesmo comportamento, menos código, hardCap unificado em 50).

### Manter como está (janelas intencionais, documentar com comentário)
- `PrazosAbertosPanel.tsx` — `.limit(maxItems)` é top-N por design.
- `Dashboard/Metrics/FinanceiroMetrics.tsx` — `.limit(5)` widget de "próximos 5".
- `Search/GlobalSearch.tsx` — `.limit(5)` por categoria.
- `usePrefetchPages.ts` — `.limit(50/100)` warm-up de cache.
- `Controladoria/IntimacaoCard.tsx` — `.limit(1)` lookup pontual.
- `AdvogadoMetrics.tsx` — usa `count: 'exact', head: true` (sem baixar linhas).

Adicionar comentário curto `// janela explícita: top-N` para sinalizar que não é candidato a sweep.

## Arquivos afetados

- `src/components/Controladoria/PrazosCasoTab.tsx` (refatorar 2 selects)
- `src/components/Project/ProjectProtocoloContent.tsx` (refatorar `fetchPrazosVinculados`)
- `src/hooks/useAgendaData.ts` (substituir loop manual por `fetchAllPaginated`)
- `src/components/Dashboard/PrazosAbertosPanel.tsx`, `FinanceiroMetrics.tsx`, `Search/GlobalSearch.tsx`, `usePrefetchPages.ts`, `IntimacaoCard.tsx` — apenas comentário justificando o `.limit()`.

## Impacto

1. **Usuário final:** Aba **Prazos** dentro do caso e aba **Vinculados** do protocolo passam a mostrar 100% dos prazos mesmo em tenants com >1k registros. Agenda continua igual (já paginava manualmente), mas o código fica mais simples e com hardCap consistente. Nenhuma mudança visual.
2. **Dados:** Nenhuma migration, nenhuma alteração de RLS. Mais requisições paginadas no carregamento dessas telas (1 request a cada 1.000 linhas; hardCap 50 = 50k). Em tenants pequenos, imperceptível; em Solvenza/Mercado Galvão, +1 ou +2 requests por tela.
3. **Riscos colaterais:** Tempo de carregamento das abas de prazos do caso/protocolo aumenta levemente quando há muitos prazos (esperado — antes truncava). Nenhum risco de quebra de tipos: assinatura de retorno do `fetchAllPaginated` é `{ data, error }`, igual ao supabase-js.
4. **Quem é afetado:** Todos os tenants. Maior benefício para Solvenza (que já sofreu sumiço de prazos) e qualquer tenant que cresça além de 1k deadlines.

## Validação

- Build TS limpo (sem mudanças de tipos).
- Abrir aba **Prazos** dentro de um caso em Solvenza e conferir contagem ≥ a antes.
- Abrir **Protocolo → Prazos vinculados** em um protocolo com muitas etapas.
- Conferir que Agenda continua funcionando normalmente (queryKey/refetch inalterados).
- Rodar `node scripts/check-pagination.mjs` — deve continuar passando.