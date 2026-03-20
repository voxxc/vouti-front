import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";

export interface PlanejadorParticipant {
  id: string;
  task_id: string;
  user_id: string;
  added_by: string;
  tenant_id: string | null;
  created_at: string;
}

export function usePlanejadorParticipants(taskId: string) {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['planejador-participants', taskId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('planejador_task_participants')
        .select('*')
        .eq('task_id', taskId);
      if (error) throw error;
      return data as PlanejadorParticipant[];
    },
  });

  const add = useMutation({
    mutationFn: async (userId: string) => {
      if (!user || !tenantId) throw new Error('Not authenticated');
      const { error } = await (supabase as any).from('planejador_task_participants').insert({
        task_id: taskId,
        user_id: userId,
        added_by: user.id,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planejador-participants', taskId] }),
  });

  const remove = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase as any)
        .from('planejador_task_participants')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planejador-participants', taskId] }),
  });

  return { participants: query.data || [], isLoading: query.isLoading, add, remove };
}
