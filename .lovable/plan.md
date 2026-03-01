

## Plano: Paginação server-side + otimização da aba Geral

### Problema
A query carrega todos os andamentos via join pesado, causando timeout e toast vermelho.

### Mudanças

#### 1. `src/hooks/useAllProcessosOAB.ts`
- **Remover** o join `processos_oab_andamentos!left(id, lida)` da query
- **Adicionar** chamada à RPC `get_andamentos_nao_lidos_por_processo(p_tenant_id)` para contagem eficiente
- **Paginação server-side**: adicionar estados `page` (default 0) e `pageSize` (20), usar `.range()` com `{ count: 'exact' }` para obter total
- **Expor** `page`, `setPage`, `totalCount`, `pageSize` no retorno do hook
- Remover canal realtime de andamentos (desnecessário na listagem)

#### 2. `src/components/Controladoria/GeralTab.tsx`
- **Topo**: adicionar controle de paginação acima dos filtros — indicador "Página X de Y" com botões Anterior/Próximo
- **Rodapé**: adicionar o mesmo controle de paginação abaixo da lista de processos
- Usar os componentes `Pagination` existentes do shadcn (`Pagination`, `PaginationContent`, `PaginationItem`, `PaginationPrevious`, `PaginationNext`)
- Resetar `page` para 0 quando filtro ou busca mudar
- Mostrar total de processos no indicador

