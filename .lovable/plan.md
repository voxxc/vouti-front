

# Adicionar filtros e ordenação na Lista do Planejador

## O que será feito

Adicionar ao header da tabela da ListView:

1. **Filtro de status** (Concluído / Em aberto / Todos) — um toggle ou dropdown acima da tabela
2. **Setas de ordenação** nos cabeçalhos das colunas: Nome, Atividade, Prazo final, Criado por, Responsável, Marcadores — clicável para alternar entre ascendente/descendente

## Alterações em `src/components/Planejador/PlanejadorListView.tsx`

### Novos estados
- `statusFilter`: `'all' | 'open' | 'completed'` (padrão: `'all'`)
- `sortColumn`: `'nome' | 'atividade' | 'prazo' | 'criador' | 'responsavel' | 'marcadores' | null`
- `sortDirection`: `'asc' | 'desc'`

### Filtro de status
- Barra segmentada acima da tabela com 3 botões: **Todos**, **Em aberto**, **Concluídos** (estilo glass, consistente com o TopBar)
- Filtra pelo `task.status === 'completed'` para concluídos, `!== 'completed'` para em aberto

### Ordenação por coluna
- Cada `<th>` clicável com ícone `ArrowUpDown` / `ArrowUp` / `ArrowDown` do lucide
- Ao clicar, alterna: sem ordenação → asc → desc → sem ordenação
- Lógica de sort no `useMemo` de `filteredTasks`:
  - **Nome**: `localeCompare` no título
  - **Atividade**: ordem pela posição da coluna kanban
  - **Prazo final**: comparação de datas (nulos por último)
  - **Criado por / Responsável**: `localeCompare` no nome do profile
  - **Marcadores**: quantidade de marcadores ou nome do primeiro

### Visual
- Cabeçalho com cursor pointer e ícone de seta ao lado do texto
- Coluna ativa de sort com destaque sutil (opacidade maior na seta)
- Filtro de status com contador entre parênteses: ex. "Em aberto (12)"

