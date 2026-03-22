import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";

export interface PlanejadorEtapa {
  id: string;
  task_id: string;
  titulo: string;
  ordem: number;
  concluida: boolean;
  tenant_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function usePlanejadorEtapas(taskId: string) {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['planejador-etapas', taskId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('planejador_task_etapas')
        .select('*')
        .eq('task_id', taskId)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data as PlanejadorEtapa[];
    },
  });

  const create = useMutation({
    mutationFn: async (titulo: string) => {
      if (!user || !tenantId) throw new Error('Not authenticated');
      const etapas = query.data || [];
      const maxOrdem = etapas.length > 0 ? Math.max(...etapas.map(e => e.ordem)) + 1 : 0;
      const { error } = await (supabase as any).from('planejador_task_etapas').insert({
        task_id: taskId,
        titulo,
        ordem: maxOrdem,
        tenant_id: tenantId,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planejador-etapas', taskId] }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, concluida }: { id: string; concluida: boolean }) => {
      const { error } = await (supabase as any)
        .from('planejador_task_etapas')
        .update({ concluida, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planejador-etapas', taskId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('planejador_task_etapas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planejador-etapas', taskId] }),
  });

  const etapas = query.data || [];
  const completedCount = etapas.filter(e => e.concluida).length;

  return { etapas, completedCount, totalCount: etapas.length, isLoading: query.isLoading, create, toggle, remove };
}
