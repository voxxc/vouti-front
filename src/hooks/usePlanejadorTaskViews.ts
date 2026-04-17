import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantId } from "@/hooks/useTenantId";
import { startOfDay } from "date-fns";
import { useMemo } from "react";

interface TaskView {
  task_id: string;
  last_viewed_at: string;
}

/**
 * Tracks which Planejador tasks each user has opened today.
 * Tasks NOT in `viewedTodayIds` should be highlighted (orange) to alert the user.
 */
export function usePlanejadorTaskViews() {
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const queryClient = useQueryClient();

  const { data: views = [] } = useQuery({
    queryKey: ["planejador-task-views", user?.id, tenantId],
    queryFn: async () => {
      if (!user?.id || !tenantId) return [];
      const { data, error } = await (supabase as any)
        .from("planejador_task_views")
        .select("task_id, last_viewed_at")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return (data || []) as TaskView[];
    },
    enabled: !!user?.id && !!tenantId,
    staleTime: 60_000,
  });

  const viewedTodayIds = useMemo(() => {
    const startToday = startOfDay(new Date()).getTime();
    const set = new Set<string>();
    for (const v of views) {
      if (new Date(v.last_viewed_at).getTime() >= startToday) {
        set.add(v.task_id);
      }
    }
    return set;
  }, [views]);

  const markTaskAsViewed = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user?.id || !tenantId) return;
      const { error } = await (supabase as any)
        .from("planejador_task_views")
        .upsert(
          {
            task_id: taskId,
            user_id: user.id,
            tenant_id: tenantId,
            last_viewed_at: new Date().toISOString(),
          },
          { onConflict: "task_id,user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planejador-task-views", user?.id, tenantId] });
    },
  });

  return {
    viewedTodayIds,
    markTaskAsViewed: (taskId: string) => markTaskAsViewed.mutate(taskId),
  };
}
