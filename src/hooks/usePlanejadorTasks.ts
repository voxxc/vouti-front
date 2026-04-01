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
  cliente_id: string | null;
  processo_oab_id: string | null;
  // Subtask-as-card fields
  is_subtask?: boolean;
  parent_task_id?: string;
  parent_task_titulo?: string;
  // Protocolo-as-card fields
  is_protocolo?: boolean;
  protocolo_project_name?: string;
  protocolo_workspace_name?: string;
  protocolo_project_id?: string;
  protocolo_workspace_id?: string;
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

export function usePlanejadorTasks(options?: { includeProtocolos?: boolean }) {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const includeProtocolos = options?.includeProtocolos ?? false;

  const tasksQuery = useQuery({
    queryKey: ['planejador-tasks', tenantId, includeProtocolos],
    queryFn: async () => {
      if (!tenantId) return [];
      // Fetch regular tasks
      const { data: tasksData, error: tasksError } = await (supabase as any)
        .from('planejador_tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (tasksError) throw tasksError;
      const tasks = (tasksData || []) as PlanejadorTask[];

      // Fetch all subtasks for this tenant
      const { data: subtasksData, error: subtasksError } = await (supabase as any)
        .from('planejador_task_subtasks')
        .select('*')
        .eq('tenant_id', tenantId);
      if (subtasksError) throw subtasksError;

      // Build a lookup for parent task titles
      const taskTitleMap = new Map(tasks.map(t => [t.id, t.titulo]));

      // Convert subtasks to PlanejadorTask format
      const subtasksAsTasks: PlanejadorTask[] = (subtasksData || []).map((st: any) => ({
        id: st.id,
        tenant_id: st.tenant_id,
        titulo: st.titulo,
        descricao: null,
        status: st.concluida ? 'completed' : 'pending',
        prazo: st.prazo,
        proprietario_id: st.user_id,
        responsavel_id: null,
        prioridade: 'normal',
        created_by: st.user_id,
        created_at: st.created_at,
        updated_at: st.updated_at || st.created_at,
        cliente_id: null,
        processo_oab_id: null,
        is_subtask: true,
        parent_task_id: st.task_id,
        parent_task_titulo: taskTitleMap.get(st.task_id) || 'Tarefa removida',
      }));

      // Fetch protocolos if enabled
      let protocolosAsTasks: PlanejadorTask[] = [];
      if (includeProtocolos) {
        const { data: protocolosData, error: protocolosError } = await (supabase as any)
          .from('project_protocolos')
          .select('*, projects(name), project_workspaces(nome)')
          .eq('tenant_id', tenantId);
        if (!protocolosError && protocolosData) {
          protocolosAsTasks = (protocolosData as any[]).map((p: any) => ({
            id: p.id,
            tenant_id: p.tenant_id,
            titulo: p.nome,
            descricao: p.descricao,
            status: p.data_conclusao || p.status === 'concluido' ? 'completed' : 'pending',
            prazo: p.data_previsao,
            proprietario_id: p.created_by,
            responsavel_id: p.responsavel_id,
            prioridade: 'normal',
            created_by: p.created_by,
            created_at: p.created_at,
            updated_at: p.updated_at || p.created_at,
            cliente_id: null,
            processo_oab_id: p.processo_oab_id,
            is_protocolo: true,
            protocolo_project_name: p.projects?.name || 'Projeto',
            protocolo_workspace_name: p.project_workspaces?.nome || '',
            protocolo_project_id: p.project_id,
            protocolo_workspace_id: p.workspace_id,
          }));
        }
      }

      return [...tasks, ...subtasksAsTasks, ...protocolosAsTasks];
    },
    enabled: !!tenantId,
  });

  const createTask = useMutation({
    mutationFn: async (task: { titulo: string; descricao?: string; prazo?: string; responsavel_id?: string; prioridade?: string }) => {
      if (!tenantId || !user) throw new Error('Not authenticated');
      const { data, error } = await (supabase as any)
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
      const { data, error } = await (supabase as any)
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
      const { error } = await (supabase as any).from('planejador_tasks').delete().eq('id', id);
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
