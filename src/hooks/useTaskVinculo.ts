import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProcessoOAB, OABCadastrada } from '@/hooks/useOABs';
import { useAuth } from '@/contexts/AuthContext';

interface ProcessoVinculado extends ProcessoOAB {
  oab?: OABCadastrada;
}

export const useTaskVinculo = (taskId: string | null, processoOabId: string | null | undefined) => {
  const [processoVinculado, setProcessoVinculado] = useState<ProcessoVinculado | null>(null);
  const [processosDisponiveis, setProcessosDisponiveis] = useState<ProcessoVinculado[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProcessos, setLoadingProcessos] = useState(false);
  const { tenantId } = useAuth();

  const fetchProcessoVinculado = useCallback(async () => {
    if (!processoOabId) {
      setProcessoVinculado(null);
      return;
    }

    setLoading(true);
    try {
      const { data: processo, error } = await supabase
        .from('processos_oab')
        .select('*')
        .eq('id', processoOabId)
        .single();

      if (error) throw error;

      if (processo) {
        const { data: oab } = await supabase
          .from('oabs_cadastradas')
          .select('*')
          .eq('id', processo.oab_id)
          .single();

        setProcessoVinculado({ ...processo, oab: oab || undefined });
      }
    } catch (error) {
      console.error('Erro ao buscar processo vinculado:', error);
      setProcessoVinculado(null);
    } finally {
      setLoading(false);
    }
  }, [processoOabId]);

  const fetchProcessosDisponiveis = useCallback(async (busca?: string) => {
    setLoadingProcessos(true);
    try {
      let query = supabase
        .from('processos_oab')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      if (busca && busca.trim()) {
        query = query.or(`numero_cnj.ilike.%${busca}%,parte_ativa.ilike.%${busca}%,parte_passiva.ilike.%${busca}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProcessosDisponiveis(data || []);
    } catch (error) {
      console.error('Erro ao buscar processos:', error);
      setProcessosDisponiveis([]);
    } finally {
      setLoadingProcessos(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchProcessoVinculado();
  }, [fetchProcessoVinculado]);

  const vincularProcesso = async (novoProcessoOabId: string) => {
    if (!taskId) return false;

    try {
      // Buscar dados da task para o histórico
      const { data: taskData } = await supabase
        .from('tasks')
        .select('title, project_id')
        .eq('id', taskId)
        .single();

      const { error } = await supabase
        .from('tasks')
        .update({ processo_oab_id: novoProcessoOabId })
        .eq('id', taskId);

      if (error) throw error;

      const { data: processo } = await supabase
        .from('processos_oab')
        .select('*')
        .eq('id', novoProcessoOabId)
        .single();

      if (processo) {
        const { data: oab } = await supabase
          .from('oabs_cadastradas')
          .select('*')
          .eq('id', processo.oab_id)
          .single();

        setProcessoVinculado({ ...processo, oab: oab || undefined });

        // Registrar vínculo no histórico
        if (taskData?.project_id) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('task_history')
              .insert({
                task_id: taskId,
                project_id: taskData.project_id,
                task_title: taskData.title,
                user_id: user.id,
                action: 'vinculo_created',
                details: `Processo ${processo.numero_cnj} vinculado ao card "${taskData.title}"`,
                tenant_id: tenantId
              });
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao vincular processo:', error);
      return false;
    }
  };

  const desvincularProcesso = async () => {
    if (!taskId) return false;

    try {
      // Buscar dados da task e processo antes de desvincular
      const { data: taskData } = await supabase
        .from('tasks')
        .select('title, project_id, processo_oab_id')
        .eq('id', taskId)
        .single();

      const processoAnterior = processoVinculado;

      const { error } = await supabase
        .from('tasks')
        .update({ processo_oab_id: null })
        .eq('id', taskId);

      if (error) throw error;

      // Registrar desvínculo no histórico
      if (taskData?.project_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('task_history')
            .insert({
              task_id: taskId,
              project_id: taskData.project_id,
              task_title: taskData.title,
              user_id: user.id,
              action: 'vinculo_removed',
              details: `Processo ${processoAnterior?.numero_cnj || 'desconhecido'} desvinculado do card "${taskData.title}"`,
              tenant_id: tenantId
            });
        }
      }

      setProcessoVinculado(null);
      return true;
    } catch (error) {
      console.error('Erro ao desvincular processo:', error);
      return false;
    }
  };

  return {
    processoVinculado,
    processosDisponiveis,
    loading,
    loadingProcessos,
    fetchProcessosDisponiveis,
    vincularProcesso,
    desvincularProcesso,
  };
};
