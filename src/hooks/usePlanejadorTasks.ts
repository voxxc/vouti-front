import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, addWeeks, isBefore, isAfter, isToday } from "date-fns";

export interface PlanejadorTask {
  id: string;
  tenant_id: string | null;
  titulo: string;
  descricao: string | null;
  status: string;
  prazo: string | null;
  proprietario_id: string;
  responsavel_id: string | null;
  prioridade: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type KanbanColumn = 
  | 'vencido'
  | 'hoje'
  | 'esta_semana'
  | 'proxima_semana'
  | 'duas_semanas'
  | 'sem_prazo'
  | 'concluido';

export const KANBAN_COLUMNS: { id: KanbanColumn; label: string; color: string }[] = [
  { id: 'vencido', label: 'Vencido', color: '#ef4444' },
  { id: 'hoje', label: 'Vencimento hoje', color: '#a3e635' },
  { id: 'esta_semana', label: 'Vencimento esta semana', color: '#22d3ee' },
  { id: 'proxima_semana', label: 'Vencimento na próxima semana', color: '#60a5fa' },
  { id: 'duas_semanas', label: 'Vencimento em duas semanas', color: '#3b82f6' },
  { id: 'sem_prazo', label: 'Sem prazo', color: '#9ca3af' },
  { id: 'concluido', label: 'Concluído', color: '#4b5563' },
];

export function categorizeTask(task: PlanejadorTask): KanbanColumn {
  if (task.status === 'completed') return 'concluido';
  if (!task.prazo) return 'sem_prazo';

  const now = new Date();
  const prazo = new Date(task.prazo);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
  const twoWeeksEnd = endOfWeek(addWeeks(now, 2), { weekStartsOn: 1 });

  if (isBefore(prazo, todayStart)) return 'vencido';
  if (prazo >= todayStart && prazo <= todayEnd) return 'hoje';
  if (prazo <= thisWeekEnd) return 'esta_semana';
  if (prazo <= nextWeekEnd) return 'proxima_semana';
  if (prazo <= twoWeeksEnd) return 'duas_semanas';
  return 'sem_prazo'; // future beyond 2 weeks goes to sem_prazo
}

export function usePlanejadorTasks() {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ['planejador-tasks', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('planejador_tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PlanejadorTask[];
    },
    enabled: !!tenantId,
  });

  const createTask = useMutation({
    mutationFn: async (task: { titulo: string; descricao?: string; prazo?: string; responsavel_id?: string; prioridade?: string }) => {
      if (!tenantId || !user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('planejador_tasks')
        .insert({
          ...task,
          tenant_id: tenantId,
          proprietario_id: user.id,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planejador-tasks'] }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlanejadorTask> & { id: string }) => {
      const { data, error } = await supabase
        .from('planejador_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planejador-tasks'] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('planejador_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planejador-tasks'] }),
  });

  // Categorize tasks into columns
  const tasksByColumn = (tasksQuery.data || []).reduce<Record<KanbanColumn, PlanejadorTask[]>>(
    (acc, task) => {
      const col = categorizeTask(task);
      acc[col].push(task);
      return acc;
    },
    {
      vencido: [],
      hoje: [],
      esta_semana: [],
      proxima_semana: [],
      duas_semanas: [],
      sem_prazo: [],
      concluido: [],
    }
  );

  return {
    tasks: tasksQuery.data || [],
    tasksByColumn,
    isLoading: tasksQuery.isLoading,
    createTask,
    updateTask,
    deleteTask,
  };
}
