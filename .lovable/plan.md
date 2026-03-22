

# Corrigir drag-and-drop entre colunas do Kanban

## Problema

Dois bugs distintos:

1. **Coluna "Vencido" não aceita drop corretamente**: `getDeadlineForColumn('vencido')` retorna `null`, e como não é `sem_prazo` nem `concluido`, a condição `else if (newDeadline)` falha — nenhum `prazo` é atualizado. O card volta para a posição original após o refetch.

2. **Nested scroll containers**: O container pai tem `overflow-x-auto` e cada coluna Droppable tem `overflow-y-auto`, criando scroll aninhado que o `@hello-pangea/dnd` não suporta. Isso pode causar falhas no cálculo de posição durante o drag.

## Solução

### 1. Corrigir lógica de `handleDragEnd` (`PlanejadorKanban.tsx`)

Reescrever para que **todas** as colunas apliquem o prazo corretamente:

- `vencido`: definir prazo para ontem (manter na coluna vencido)
- `hoje`: hoje às 18h
- `esta_semana` / `proxima_semana` / `duas_semanas`: fim da semana respectiva
- `sem_prazo`: prazo = null
- `concluido`: status = completed (manter prazo existente)

Simplificar a lógica removendo o `getDeadlineForColumn` e usando a deadline diretamente no `handleDragEnd`.

### 2. Eliminar nested scroll (`PlanejadorKanban.tsx`)

Remover `overflow-y-auto` das colunas Droppable (ou remover `overflow-x-auto` do pai e usar uma abordagem diferente para scroll horizontal). A solução mais simples: mover o `overflow-y-auto` para um wrapper **dentro** do Droppable mas **fora** da ref do Droppable, ou usar `overflow-y: visible` no Droppable.

## Arquivo modificado

| Arquivo | Mudança |
|---------|---------|
| `src/components/Planejador/PlanejadorKanban.tsx` | Corrigir lógica de prazo para coluna "vencido"; resolver nested scroll |

