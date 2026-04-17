

## Causa raiz

No `PlanejadorKanban.tsx`, o `handleDragEnd` só processa **mudança de coluna** (atualiza `status` e `prazo` baseado na `destination.droppableId`). Não há lógica para **reordenação dentro da mesma coluna** — quando você arrasta o último card para a 2ª posição da mesma coluna, ele chama `onMoveTask` aplicando os mesmos `status`/`prazo` que o card já tem, e como o backend reordena pelo critério padrão (provavelmente `created_at` ou `prazo`), o card volta para o lugar original no próximo render.

Falta:
1. Coluna `ordem` (ou `position`) na tabela `planejador_tasks` para persistir ordem manual por coluna.
2. Handler reconhecer `source.droppableId === destination.droppableId` e atualizar a ordem.
3. Query de tasks ordenar por essa coluna.

## Correção

### Migration SQL
- Adicionar `ordem INTEGER` em `planejador_tasks` (default null).
- Backfill: para cada tenant, numerar tasks existentes por `prazo NULLS LAST, created_at` (sequencial 0,1,2... globalmente — a coluna do Kanban é derivada, então ordem global basta).
- Index: `(tenant_id, ordem)`.

### RPC `reorder_planejador_task(p_task_id uuid, p_new_ordem integer)`
- `SECURITY DEFINER`, valida tenant do usuário.
- Reorganiza `ordem` deslocando outras tasks (estratégia: setar `ordem = p_new_ordem`, e nas demais com `ordem >= p_new_ordem` somar 1). Simples e suficiente para volume típico.

### Frontend

**`src/components/Planejador/PlanejadorKanban.tsx`**
- No `handleDragEnd`, detectar `source.droppableId === destination.droppableId`:
  - Calcular novo `ordem` baseado em `destination.index` e nas tasks atuais da coluna.
  - Chamar nova prop `onReorderTask(taskId, newOrdem)` em vez de `onMoveTask`.
- Para reorder cross-column: continuar com `onMoveTask` mas também passar `ordem` do destino.

**`src/components/Planejador/PlanejadorDrawer.tsx`**
- Adicionar `handleReorderTask` que chama `supabase.rpc('reorder_planejador_task', ...)` e invalida a query.
- Passar como prop pro `PlanejadorKanban` e pro `PlanejadorListView` (se aplicável).

**`src/hooks/usePlanejadorTasks.ts`**
- Ajustar `ORDER BY` da query para `ordem ASC NULLS LAST, prazo ASC NULLS LAST, created_at ASC` (mantém fallback para tasks sem ordem).

**Subtasks (edge case):** subtasks (`is_subtask: true`) vivem em `planejador_task_subtasks`, não na tabela principal. Para escopo desta correção, vou **bloquear reorder de subtasks** (skip se `task.is_subtask`) e tratar em iteração futura se você quiser.

## Arquivos afetados

- `supabase/migrations/{timestamp}_planejador_task_ordem.sql` (novo)
- `src/hooks/usePlanejadorTasks.ts` (ORDER BY)
- `src/components/Planejador/PlanejadorKanban.tsx` (handleDragEnd + nova prop)
- `src/components/Planejador/PlanejadorDrawer.tsx` (handler + passar prop)
- `src/integrations/supabase/types.ts` (regenerar types da nova RPC)

## Validação

1. Abrir Planejador → arrastar último card de "Hoje" para 2ª posição → deve fixar
2. Fechar e reabrir drawer → ordem mantida
3. Mover card entre colunas (ex: Hoje → Esta Semana) → continua funcionando como antes (status/prazo atualizam)
4. Recarregar navegador → ordem persistida

