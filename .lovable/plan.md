

## Plano: Aplicar estética da Central (tabela) nas abas OABs

### Problema
A **Central** usa um layout de **tabela limpa** com colunas (Processo, Partes, Advogado/OAB, Tribunal, Não Lidos, Ações), enquanto as abas **Geral** e **OABTab** usam **cards empilhados** com collapsibles. O usuário quer a mesma estética de tabela em ambas.

### O que muda

Substituir os componentes de card (`GeralProcessoCard`, `GeralInstanciaSection`, `ProcessoCard`, `InstanciaSection`) por **tabelas** idênticas à `CentralAndamentosNaoLidos.tsx`, mantendo toda a lógica existente (filtros, busca, paginação, drag-and-drop removido do OABTab pois tabelas não suportam DnD, detalhes drawer, exclusão).

### Arquivos editados

1. **`GeralTab.tsx`** -- Remover `GeralProcessoCard` e `GeralInstanciaSection`. Renderizar uma `<Table>` com colunas: Processo, Partes, Advogado (OAB), Tribunal, Não Lidos, Ações (eye + trash). Manter filtros, busca debounced, paginação server-side, e drawer de detalhes. Sem agrupamento por instância (tabela flat, como a Central).

2. **`OABTab.tsx`** -- Remover `ProcessoCard`, `InstanciaSection`, e o `DragDropContext`/`Droppable`/`Draggable`. Renderizar a mesma `<Table>` com colunas: Processo, Partes, Tribunal, Não Lidos, Ações (eye + trash + badges compartilhado/intimação). Manter filtros, busca, paginação client-side, e drawer de detalhes. Sem agrupamento por instância.

### Layout da tabela (ambas)

```text
| Processo (mono)  | Partes (truncated)       | Advogado (OAB)*  | Tribunal | Não Lidos | Ações (👁 🗑) |
|------------------|--------------------------|------------------|----------|-----------|---------------|
```

*A coluna "Advogado (OAB)" aparece na Geral (mostra qual OAB) e no OABTab mostra badges de compartilhado/monitorado.

### Detalhes
- Colunas da Geral: Processo, Partes, Advogado (OAB), Tribunal, Não Lidos, Ações
- Colunas do OABTab: Processo, Partes, Tribunal, Não Lidos, Ações (sem coluna advogado, já que é filtrado por OAB)
- Badges de monitoramento, compartilhado e intimação ficam inline na célula do Processo ou como ícones na célula de Ações
- Clique na row abre o drawer de detalhes (mesmo comportamento da Central)
- Remover dependência de `@hello-pangea/dnd` do OABTab (drag-and-drop incompatível com tabela)

