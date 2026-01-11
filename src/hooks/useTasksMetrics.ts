import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TasksMetrics {
  totalTasks: number;
  tasksPorStatus: {
    waiting: number;
    todo: number;
    progress: number;
    done: number;
  };
  tasksEmAberto: number;
  tasksAtrasadas: number;
  tasksConcluidas: number;
  taxaConclusao: number;
}

const fetchTasksMetrics = async (): Promise<TasksMetrics> => {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('status, updated_at, created_at');

  if (error) throw error;

  const totalTasks = tasks?.length || 0;

  const statusMap = new Map<string, number>();
  ['waiting', 'todo', 'progress', 'done'].forEach(s => statusMap.set(s, 0));

  let tasksAtrasadas = 0;
  const hoje = new Date();

  tasks?.forEach(task => {
    // Contar por status
    if (task.status) {
      statusMap.set(task.status, (statusMap.get(task.status) || 0) + 1);
    }

    // Identificar tarefas atrasadas (não concluídas há mais de 7 dias)
    if (task.status !== 'done') {
      const updatedAt = new Date(task.updated_at);
      const diffDias = Math.ceil((hoje.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDias > 7) {
        tasksAtrasadas++;
      }
    }
  });

  const waiting = statusMap.get('waiting') || 0;
  const todo = statusMap.get('todo') || 0;
  const progress = statusMap.get('progress') || 0;
  const done = statusMap.get('done') || 0;

  const tasksEmAberto = waiting + todo;
  const taxaConclusao = totalTasks > 0 ? Math.round((done / totalTasks) * 100) : 0;

  return {
    totalTasks,
    tasksPorStatus: {
      waiting,
      todo,
      progress,
      done,
    },
    tasksEmAberto,
    tasksAtrasadas,
    tasksConcluidas: done,
    taxaConclusao,
  };
};

export const useTasksMetrics = () => {
  const { data: metrics, isLoading: loading, refetch } = useQuery({
    queryKey: ['tasks-metrics'],
    queryFn: fetchTasksMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
    gcTime: 10 * 60 * 1000, // 10 minutos no garbage collector
  });

  return {
    metrics: metrics ?? null,
    loading,
    refreshMetrics: refetch,
  };
};
