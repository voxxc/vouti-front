

## Habilitar reordenacao de processos e colunas com o cadeado

### Contexto

O botao de cadeado (Lock/Unlock) ja existe no header do projeto e ja controla:
- Aba "Casos" (processos/project_processos): drag-and-drop de itens funciona via `isLocked`
- Aba "Colunas": drag-and-drop de colunas e cards funciona via `isColumnsLocked`

Porem, a aba "Processos" (protocolos/project_protocolos) nao tem suporte a drag-and-drop -- e uma lista estatica sem reordenacao. O usuario quer poder mover a posicao dos processos nessa aba tambem quando o cadeado estiver destravado.

### Mudancas necessarias

**1. Migration: adicionar coluna `ordem` na tabela `project_protocolos`**

```sql
ALTER TABLE project_protocolos ADD COLUMN ordem integer DEFAULT 0;
```

Inicializar valores existentes com base na data de criacao para manter a ordem atual.

**2. `src/hooks/useProjectProtocolos.ts`**

- Adicionar campo `ordem` na interface `ProjectProtocolo`
- No `fetchProtocolos`, ordenar por `ordem` ao inves de `created_at desc`
- Mapear o campo `ordem` do banco para o tipo
- Expor uma funcao `reorderProtocolos(orderedIds: string[])` que faz UPDATE em batch da coluna `ordem`

**3. `src/components/Project/ProjectProtocolosList.tsx`**

- Adicionar prop `isLocked`
- Importar `DragDropContext`, `Droppable`, `Draggable` do `@hello-pangea/dnd`
- Envolver a lista em `DragDropContext` + `Droppable`
- Cada item da lista vira um `Draggable` com `isDragDisabled={isLocked}`
- Adicionar icone `GripVertical` visivel quando desbloqueado
- No `onDragEnd`, chamar `reorderProtocolos` para persistir a nova ordem

**4. `src/pages/ProjectView.tsx`**

- Passar `isLocked={isColumnsLocked}` para `ProjectProtocolosList` (linha 1194)

### Resumo por arquivo

| Arquivo | Mudanca |
|---|---|
| Migration SQL | Adicionar coluna `ordem` em `project_protocolos` |
| `src/hooks/useProjectProtocolos.ts` | Campo `ordem` + funcao `reorderProtocolos` + ordenar por `ordem` |
| `src/components/Project/ProjectProtocolosList.tsx` | Drag-and-drop com `@hello-pangea/dnd` controlado por `isLocked` |
| `src/pages/ProjectView.tsx` | Passar `isLocked` para `ProjectProtocolosList` |

