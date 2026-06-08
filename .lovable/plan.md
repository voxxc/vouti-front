## Causa raiz

A aba "Por Tribunal" hoje só mostra barras estáticas por sigla, e a aba "Por Comarca" lista comarcas de todos os tribunais misturados. Precisamos transformar a aba "Por Tribunal" em um drill-down: Tribunal → Comarcas daquele tribunal → Processos da comarca.

## Correção

Refatorar `activeSubTab === 'tribunal'` em `ControladoriaIndicadores.tsx` para ter 3 níveis de navegação dentro do mesmo card:

1. **Nível 1 — Lista de tribunais** (estado atual): barras com sigla, contagem e %. Cada linha vira clicável. Mantém ordenação por contagem desc.

2. **Nível 2 — Comarcas do tribunal selecionado**: ao clicar em um tribunal (ex.: TJPR), filtra `allProcessos` por `tribunal_sigla === sigla` e agrupa por comarca usando a mesma lógica de `extractComarcaFromCounty` / `city` já existente. Mostra:
   - Header com botão "← Voltar aos tribunais" + nome do tribunal + total de processos.
   - Campo de busca de comarca (reaproveita `comarcaSearch`).
   - Cards/linhas de comarca com nome, contagem e barra de progresso. Cada comarca é clicável.

3. **Nível 3 — Processos da comarca**: ao clicar em uma comarca, mostra tabela com CNJ, partes (ativa × passiva), city/county originais. Header com breadcrumb "← Voltar às comarcas de TJPR" + nome da comarca + contagem. CNJ clicável abre o processo (mesmo padrão usado em outros pontos: `/controladoria/processo/:id` — verificar rota existente; senão apenas exibe).

Estados novos:
- `selectedTribunal: string | null`
- `selectedComarcaKey: string | null`

A aba "Por Comarca" (agregada geral) **é removida** — sua função fica embutida no drill-down do tribunal. O botão da subtab "Processos por Comarca" some.

## Arquivos afetados

- `src/components/Controladoria/ControladoriaIndicadores.tsx` — única alteração. Refatora bloco `activeSubTab === 'tribunal'`, remove bloco `activeSubTab === 'comarca'` e o botão da subtab correspondente. Reaproveita `comarcaData` extraindo a função de agrupamento para receber uma lista de processos como parâmetro (memoizada por tribunal selecionado).

## Impacto

1. **UX**: aba "Indicadores > Por Tribunal" passa a ser navegável em 3 níveis (tribunal → comarcas do tribunal → processos da comarca) com breadcrumb/voltar. Aba separada "Processos por Comarca" deixa de existir; quem usava a visão geral de comarcas agora precisa entrar via tribunal.
2. **Dados**: nenhuma alteração — sem migration, sem RLS, sem novas queries. Continua usando `fetchAllPaginated` em `processos_oab` já carregado.
3. **Riscos colaterais**: usuários que dependiam da lista global de comarcas (todos os tribunais juntos) perdem essa visão consolidada. Impressão "Processos por Comarca" do botão dedicado some — se precisar, podemos reimplementar imprimindo o nível atual do drill-down. Atualmente não está no escopo.
4. **Quem é afetado**: somente usuários com acesso a Controladoria > Indicadores no tenant atual. Multi-tenant intacto (filtro por `tenant_id` mantido).

## Validação

- Abrir Controladoria > Indicadores > Por Tribunal: lista mostra TJPR, TJSP, etc.
- Clicar em TJPR: mostra comarcas do PR com contagens; busca filtra; total bate com a contagem do TJPR no nível 1.
- Clicar em uma comarca: mostra processos com CNJ + partes; contagem bate com a comarca.
- Botão "Voltar" em cada nível retorna ao anterior preservando rolagem/busca.
- Subtab "Processos por Comarca" não aparece mais.
- Aba "Prazos" continua funcionando normal.
