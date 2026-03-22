import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";

export interface ActivityLogEntry {
  id: string;
  task_id: string;
  user_id: string | null;
  action: string;
  details: Record<string, any>;
  tenant_id: string | null;
  created_at: string;
}

export function usePlanejadorActivityLog(taskId: string) {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['planejador-activity-log', taskId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('planejador_task_activity_log')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ActivityLogEntry[];
    },
  });

  const log = useMutation({
    mutationFn: async (params: { action: string; details?: Record<string, any> }) => {
      if (!user || !tenantId) return;
      const { error } = await (supabase as any).from('planejador_task_activity_log').insert({
        task_id: taskId,
        user_id: user.id,
        action: params.action,
        details: params.details || {},
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planejador-activity-log', taskId] }),
  });

  return { entries: query.data || [], isLoading: query.isLoading, log };
}

// Standalone function to log activity without hooks (for use in callbacks)
export async function logPlanejadorActivity(params: {
  taskId: string;
  userId: string;
  tenantId: string;
  action: string;
  details?: Record<string, any>;
}) {
  await (supabase as any).from('planejador_task_activity_log').insert({
    task_id: params.taskId,
    user_id: params.userId,
    action: params.action,
    details: params.details || {},
    tenant_id: params.tenantId,
  });
}
