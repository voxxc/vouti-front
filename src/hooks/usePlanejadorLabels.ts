import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";

export interface PlanejadorLabel {
  id: string;
  tenant_id: string | null;
  name: string;
  color: string;
  created_by: string;
  created_at: string;
}

export interface PlanejadorLabelAssignment {
  id: string;
  task_id: string;
  label_id: string;
  tenant_id: string | null;
  created_at: string;
}

export function usePlanejadorLabels() {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const labelsQuery = useQuery({
    queryKey: ['planejador-labels', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase as any)
        .from('planejador_task_labels')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as PlanejadorLabel[];
    },
    enabled: !!tenantId,
  });

  const createLabel = useMutation({
    mutationFn: async (params: { name: string; color: string }) => {
      if (!user || !tenantId) throw new Error('Not authenticated');
      const { error } = await (supabase as any).from('planejador_task_labels').insert({
        name: params.name,
        color: params.color,
        created_by: user.id,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planejador-labels'] }),
  });

  return { labels: labelsQuery.data || [], isLoading: labelsQuery.isLoading, createLabel };
}

export function usePlanejadorLabelAssignments(taskId: string) {
  const { tenantId } = useTenantId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['planejador-label-assignments', taskId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('planejador_task_label_assignments')
        .select('*')
        .eq('task_id', taskId);
      if (error) throw error;
      return data as PlanejadorLabelAssignment[];
    },
  });

  const assign = useMutation({
    mutationFn: async (labelId: string) => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await (supabase as any).from('planejador_task_label_assignments').insert({
        task_id: taskId,
        label_id: labelId,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planejador-label-assignments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['planejador-all-label-assignments'] });
    },
  });

  const unassign = useMutation({
    mutationFn: async (labelId: string) => {
      const { error } = await (supabase as any)
        .from('planejador_task_label_assignments')
        .delete()
        .eq('task_id', taskId)
        .eq('label_id', labelId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planejador-label-assignments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['planejador-all-label-assignments'] });
    },
  });

  return { assignments: query.data || [], isLoading: query.isLoading, assign, unassign };
}

// Fetch ALL label assignments for the tenant (used in kanban filtering)
export function useAllLabelAssignments() {
  const { tenantId } = useTenantId();

  return useQuery({
    queryKey: ['planejador-all-label-assignments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase as any)
        .from('planejador_task_label_assignments')
        .select('*')
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return data as PlanejadorLabelAssignment[];
    },
    enabled: !!tenantId,
  });
}
