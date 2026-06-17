import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";

export interface LinkedAcordo {
  link_id: string;
  acordo_task_id: string;
  planejador_task_id: string;
  title: string;
  arquivamento_status: 'ativa' | 'resolvida' | 'deletada';
  acordo_details: any;
  project_id: string;
  project_name?: string | null;
}

export interface LinkedPlanejadorTask {
  link_id: string;
  planejador_task_id: string;
  titulo: string;
  status: string;
  prazo: string | null;
}

// Acordos linked TO a given planejador task
export function useAcordosOfPlanejadorTask(planejadorTaskId: string | null | undefined) {
  const { tenantId } = useTenantId();
  const queryClient = useQueryClient();

  const q = useQuery({
    queryKey: ['planejador-task-acordos', planejadorTaskId],
    enabled: !!planejadorTaskId && !!tenantId,
    queryFn: async (): Promise<LinkedAcordo[]> => {
      if (!planejadorTaskId) return [];
      const { data: links, error } = await supabase
        .from('planejador_task_acordos')
        .select('id, planejador_task_id, acordo_task_id')
        .eq('planejador_task_id', planejadorTaskId);
      if (error) throw error;
      const acordoIds = (links || []).map(l => l.acordo_task_id);
      if (acordoIds.length === 0) return [];
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, arquivamento_status, acordo_details, project_id')
        .in('id', acordoIds);
      const projIds = Array.from(new Set((tasks || []).map(t => t.project_id))).filter(Boolean);
      let projMap = new Map<string, string>();
      if (projIds.length > 0) {
        const { data: projs } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projIds as string[]);
        projMap = new Map((projs || []).map(p => [p.id, p.name]));
      }
      return (links || []).map(l => {
        const t = (tasks || []).find(tt => tt.id === l.acordo_task_id);
        return {
          link_id: l.id,
          acordo_task_id: l.acordo_task_id,
          planejador_task_id: l.planejador_task_id,
          title: t?.title || 'Acordo removido',
          arquivamento_status: (t?.arquivamento_status as any) || 'ativa',
          acordo_details: t?.acordo_details || {},
          project_id: t?.project_id || '',
          project_name: t?.project_id ? projMap.get(t.project_id) : null,
        };
      });
    },
  });

  useEffect(() => {
    if (!planejadorTaskId || !tenantId) return;
    const channel = supabase
      .channel(`pta-${planejadorTaskId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'planejador_task_acordos', filter: `planejador_task_id=eq.${planejadorTaskId}` },
        () => queryClient.invalidateQueries({ queryKey: ['planejador-task-acordos', planejadorTaskId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [planejadorTaskId, tenantId, queryClient]);

  return q;
}

// Planejador tasks linked TO a given acordo task
export function usePlanejadorTasksOfAcordo(acordoTaskId: string | null | undefined) {
  const { tenantId } = useTenantId();
  const queryClient = useQueryClient();

  const q = useQuery({
    queryKey: ['acordo-planejador-tasks', acordoTaskId],
    enabled: !!acordoTaskId && !!tenantId,
    queryFn: async (): Promise<LinkedPlanejadorTask[]> => {
      if (!acordoTaskId) return [];
      const { data: links, error } = await supabase
        .from('planejador_task_acordos')
        .select('id, planejador_task_id')
        .eq('acordo_task_id', acordoTaskId);
      if (error) throw error;
      const ids = (links || []).map(l => l.planejador_task_id);
      if (ids.length === 0) return [];
      const { data: ptasks } = await (supabase as any)
        .from('planejador_tasks')
        .select('id, titulo, status, prazo')
        .in('id', ids);
      return (links || []).map(l => {
        const t = (ptasks || []).find((tt: any) => tt.id === l.planejador_task_id);
        return {
          link_id: l.id,
          planejador_task_id: l.planejador_task_id,
          titulo: t?.titulo || 'Tarefa removida',
          status: t?.status || 'pending',
          prazo: t?.prazo || null,
        };
      });
    },
  });

  useEffect(() => {
    if (!acordoTaskId || !tenantId) return;
    const channel = supabase
      .channel(`pta-acordo-${acordoTaskId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'planejador_task_acordos', filter: `acordo_task_id=eq.${acordoTaskId}` },
        () => queryClient.invalidateQueries({ queryKey: ['acordo-planejador-tasks', acordoTaskId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [acordoTaskId, tenantId, queryClient]);

  return q;
}

export function useLinkAcordoMutations() {
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const queryClient = useQueryClient();

  const link = useMutation({
    mutationFn: async ({ planejadorTaskId, acordoTaskId }: { planejadorTaskId: string; acordoTaskId: string }) => {
      if (!user || !tenantId) throw new Error('Sem sessão');
      const { error } = await supabase
        .from('planejador_task_acordos')
        .insert({
          tenant_id: tenantId,
          planejador_task_id: planejadorTaskId,
          acordo_task_id: acordoTaskId,
          created_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['planejador-task-acordos', vars.planejadorTaskId] });
      queryClient.invalidateQueries({ queryKey: ['acordo-planejador-tasks', vars.acordoTaskId] });
      toast.success('Tarefa vinculada ao acordo');
    },
    onError: (e: any) => {
      if (String(e?.message || '').includes('duplicate')) {
        toast.error('Esta tarefa já está vinculada a este acordo');
      } else {
        toast.error('Erro ao vincular tarefa');
      }
    },
  });

  const unlink = useMutation({
    mutationFn: async ({ linkId, planejadorTaskId, acordoTaskId }: { linkId: string; planejadorTaskId: string; acordoTaskId: string }) => {
      // Snapshot to history before deleting (manual safety net for "unlink" — preserves rastro)
      const { data: row } = await supabase
        .from('planejador_task_acordos')
        .select('tenant_id, planejador_task_id, acordo_task_id, created_by, created_at')
        .eq('id', linkId)
        .maybeSingle();
      if (row) {
        await supabase.from('planejador_task_acordos_historico').insert({
          tenant_id: row.tenant_id,
          planejador_task_id: row.planejador_task_id,
          acordo_task_id: row.acordo_task_id,
          created_by: row.created_by,
          created_at: row.created_at,
          removed_reason: 'unlinked_manual',
        });
      }
      const { error } = await supabase
        .from('planejador_task_acordos')
        .delete()
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['planejador-task-acordos', vars.planejadorTaskId] });
      queryClient.invalidateQueries({ queryKey: ['acordo-planejador-tasks', vars.acordoTaskId] });
      toast.success('Vínculo removido (histórico preservado)');
    },
    onError: () => toast.error('Erro ao desvincular'),
  });

  const setArquivamentoStatus = useMutation({
    mutationFn: async ({ acordoTaskId, status }: { acordoTaskId: string; status: 'ativa' | 'resolvida' | 'deletada' }) => {
      if (!user) throw new Error('Sem sessão');
      const { error } = await supabase
        .from('tasks')
        .update({
          arquivamento_status: status,
          arquivamento_at: new Date().toISOString(),
          arquivamento_por: user.id,
        } as any)
        .eq('id', acordoTaskId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['acordo-planejador-tasks', vars.acordoTaskId] });
      toast.success(
        vars.status === 'ativa' ? 'Acordo restaurado para Ativos'
        : vars.status === 'resolvida' ? 'Acordo movido para Resolvidos'
        : 'Acordo movido para Deletados'
      );
    },
    onError: () => toast.error('Erro ao alterar status do acordo'),
  });

  return { link, unlink, setArquivamentoStatus };
}