import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantId } from '@/hooks/useTenantId';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAllPaginated, fetchAllPaginatedIn } from '@/lib/supabasePagination';

export interface ProtocoloMarcador {
  id: string;
  project_id: string;
  tenant_id: string;
  nome: string;
  cor: string;
  created_by: string;
  created_at: string;
}

export interface ProtocoloMarcadorAssignment {
  id: string;
  protocolo_id: string;
  marcador_id: string;
  tenant_id: string;
  created_at: string;
}

export function useProjectProtocoloMarcadores(projectId: string, protocoloIds: string[]) {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const { toast } = useToast();
  const [marcadores, setMarcadores] = useState<ProtocoloMarcador[]>([]);
  const [assignments, setAssignments] = useState<ProtocoloMarcadorAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMarcadores = useCallback(async () => {
    if (!projectId || !tenantId) return;
    setLoading(true);
    try {
      const { data: marcs } = await fetchAllPaginated<ProtocoloMarcador>(() =>
        supabase
          .from('project_protocolo_marcadores' as any)
          .select('*')
          .eq('project_id', projectId)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: true }) as any
      );
      setMarcadores(marcs || []);

      if (protocoloIds.length) {
        const { data: assigns } = await fetchAllPaginatedIn<ProtocoloMarcadorAssignment>(
          protocoloIds,
          (chunk) =>
            supabase
              .from('project_protocolo_marcador_assignments' as any)
              .select('*')
              .in('protocolo_id', chunk) as any
        );
        setAssignments(assigns || []);
      } else {
        setAssignments([]);
      }
    } catch (e) {
      console.error('Erro ao carregar marcadores:', e);
    } finally {
      setLoading(false);
    }
  }, [projectId, tenantId, protocoloIds.join(',')]);

  useEffect(() => {
    fetchMarcadores();
  }, [fetchMarcadores]);

  const createMarcador = async (nome: string, cor: string) => {
    if (!tenantId || !user) return;
    const { error } = await supabase.from('project_protocolo_marcadores' as any).insert({
      project_id: projectId,
      tenant_id: tenantId,
      nome: nome.trim(),
      cor,
      created_by: user.id,
    });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Marcador criado' });
    await fetchMarcadores();
  };

  const updateMarcador = async (id: string, nome: string, cor: string) => {
    const { error } = await supabase
      .from('project_protocolo_marcadores' as any)
      .update({ nome: nome.trim(), cor, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Marcador atualizado' });
    await fetchMarcadores();
  };

  const deleteMarcador = async (id: string) => {
    const { error } = await supabase.from('project_protocolo_marcadores' as any).delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Marcador removido' });
    await fetchMarcadores();
  };

  const toggleAssignment = async (protocoloId: string, marcadorId: string) => {
    if (!tenantId) return;
    const existing = assignments.find(
      (a) => a.protocolo_id === protocoloId && a.marcador_id === marcadorId
    );
    if (existing) {
      const { error } = await supabase
        .from('project_protocolo_marcador_assignments' as any)
        .delete()
        .eq('id', existing.id);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        return;
      }
      setAssignments((prev) => prev.filter((a) => a.id !== existing.id));
    } else {
      const { data, error } = await supabase
        .from('project_protocolo_marcador_assignments' as any)
        .insert({ protocolo_id: protocoloId, marcador_id: marcadorId, tenant_id: tenantId })
        .select()
        .single();
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        return;
      }
      setAssignments((prev) => [...prev, data as unknown as ProtocoloMarcadorAssignment]);
    }
  };

  const getMarcadoresByProtocolo = useCallback(
    (protocoloId: string): ProtocoloMarcador[] => {
      const ids = assignments.filter((a) => a.protocolo_id === protocoloId).map((a) => a.marcador_id);
      return marcadores.filter((m) => ids.includes(m.id));
    },
    [assignments, marcadores]
  );

  return {
    marcadores,
    assignments,
    loading,
    createMarcador,
    updateMarcador,
    deleteMarcador,
    toggleAssignment,
    getMarcadoresByProtocolo,
    refetch: fetchMarcadores,
  };
}