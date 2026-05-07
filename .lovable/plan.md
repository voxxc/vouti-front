## Problema

Quando outro usuário edita uma tarefa no Planejador (anexa arquivo, muda título, adiciona subtarefa, comentário, etapa, participante, label, etc.), as alterações **não aparecem em tempo real** no PC de quem está com a tarefa aberta. Só aparece com refresh manual.

Causa: nenhum hook do Planejador escuta `postgres_changes`, e as tabelas envolvidas não estão na publication `supabase_realtime` (exceto `task_history`).

## Solução

Adicionar Realtime nas tabelas do Planejador + subscriptions nos hooks que alimentam a UI.

### 1. Migration — habilitar Realtime

```sql
ALTER TABLE planejador_tasks REPLICA IDENTITY FULL;
ALTER TABLE planejador_task_files REPLICA IDENTITY FULL;
ALTER TABLE planejador_task_subtasks REPLICA IDENTITY FULL;
ALTER TABLE planejador_task_etapas REPLICA IDENTITY FULL;
ALTER TABLE planejador_task_participants REPLICA IDENTITY FULL;
ALTER TABLE planejador_task_labels REPLICA IDENTITY FULL;
ALTER TABLE planejador_task_label_assignments REPLICA IDENTITY FULL;
ALTER TABLE planejador_task_activity_log REPLICA IDENTITY FULL;
ALTER TABLE task_comentarios REPLICA IDENTITY FULL;
ALTER TABLE task_tarefas REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE
  planejador_tasks,
  planejador_task_files,
  planejador_task_subtasks,
  planejador_task_etapas,
  planejador_task_participants,
  planejador_task_labels,
  planejador_task_label_assignments,
  planejador_task_activity_log,
  task_comentarios,
  task_tarefas;
```

### 2. Subscriptions nos hooks

Em cada hook abaixo, adicionar um `useEffect` que cria um channel filtrado por `task_id`/`tenant_id` e invalida a queryKey correspondente em qualquer evento (`*`):

| Hook | Tabela | Filter | Invalida |
|------|--------|--------|----------|
| `usePlanejadorTasks` | `planejador_tasks` + `planejador_task_subtasks` | `tenant_id=eq.{tenantId}` | `['planejador-tasks', tenantId]` |
| `usePlanejadorFiles` | `planejador_task_files` | `task_id=eq.{taskId}` | `['planejador-files', taskId]` |
| `usePlanejadorSubtasks` | `planejador_task_subtasks` | `task_id=eq.{taskId}` | `['planejador-subtasks', taskId]` + tasks |
| `usePlanejadorEtapas` | `planejador_task_etapas` | `task_id=eq.{taskId}` | `['planejador-etapas', taskId]` |
| `usePlanejadorParticipants` | `planejador_task_participants` | `task_id=eq.{taskId}` | `['planejador-participants', taskId]` |
| `usePlanejadorLabels` (assignments) | `planejador_task_label_assignments` | `task_id=eq.{taskId}` | label-assignments |
| `usePlanejadorActivityLog` | `planejador_task_activity_log` | `task_id=eq.{taskId}` | activity log |
| `useTaskComentarios` | `task_comentarios` | `task_id=eq.{taskId}` | comentários |

Padrão usado:

```ts
useEffect(() => {
  if (!taskId) return;
  const channel = supabase
    .channel(`planejador-files-${taskId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'planejador_task_files', filter: `task_id=eq.${taskId}` },
      () => queryClient.invalidateQueries({ queryKey: ['planejador-files', taskId] })
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [taskId, queryClient]);
```

Nomes de channel únicos por hook + id evitam conflito.

### 3. Resultado

- Alterações de qualquer usuário (título, descrição, status, prazo, anexos, subtarefas, etapas, participantes, labels, comentários, log) aparecem instantaneamente para quem está com a tarefa aberta, sem refresh.
- Como já usamos React Query, basta invalidar a queryKey — o refetch acontece automático e a UI atualiza.

Posso aplicar?