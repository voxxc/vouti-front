import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";

export interface PlanejadorSubtask {
  id: string;
  task_id: string;
  titulo: string;
  prazo: string | null;
  concluida: boolean;
  user_id: string;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export function usePlanejadorSubtasks(taskId: string) {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['planejador-subtasks', taskId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('planejador_task_subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as PlanejadorSubtask[];
    },
  });

  const create = useMutation({
    mutationFn: async (params: { titulo: string; prazo?: string }) => {
      if (!user || !tenantId) throw new Error('Not authenticated');
      const { error } = await (supabase as any).from('planejador_task_subtasks').insert({
        task_id: taskId,
        titulo: params.titulo,
        prazo: params.prazo || null,
        user_id: user.id,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planejador-subtasks', taskId] }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, concluida }: { id: string; concluida: boolean }) => {
      const { error } = await (supabase as any)
        .from('planejador_task_subtasks')
        .update({ concluida })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planejador-subtasks', taskId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('planejador_task_subtasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planejador-subtasks', taskId] }),
  });

  const subtasks = query.data || [];
  const completedCount = subtasks.filter(s => s.concluida).length;

  return { subtasks, completedCount, totalCount: subtasks.length, isLoading: query.isLoading, create, toggle, remove };
}
