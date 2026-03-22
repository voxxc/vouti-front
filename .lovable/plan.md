

# Corrigir subtarefas no Kanban + Renomear aba "Prazo" para "Colunas"

## Problema: Subtarefas não aparecem no Kanban

A causa é simples: quando uma subtarefa é criada/alterada/removida via `usePlanejadorSubtasks`, o `onSuccess` invalida apenas `['planejador-subtasks', taskId]`, mas **não** invalida `['planejador-tasks']` — que é a query que busca subtarefas para montar os cards do Kanban.

## Correções

### 1. Invalidar query do Kanban ao criar/alterar/remover subtarefas (`usePlanejadorSubtasks.ts`)

Adicionar `queryClient.invalidateQueries({ queryKey: ['planejador-tasks'] })` no `onSuccess` das mutations `create`, `toggle` e `remove`.

### 2. Renomear aba "Prazo" para "Colunas" (`PlanejadorTopBar.tsx`)

Linha 39: `{ id: 'prazo', label: 'Prazo' }` → `{ id: 'prazo', label: 'Colunas' }`

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePlanejadorSubtasks.ts` | Adicionar invalidação de `['planejador-tasks']` em create/toggle/remove |
| `src/components/Planejador/PlanejadorTopBar.tsx` | Renomear label da aba |

