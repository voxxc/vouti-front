import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProcessoOAB, OABCadastrada } from '@/hooks/useOABs';
import { useAuth } from '@/contexts/AuthContext';

interface ProcessoVinculado extends ProcessoOAB {
  oab?: OABCadastrada;
}

export const useProtocoloVinculo = (protocoloId: string | null, processoOabId: string | null | undefined) => {
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
    if (!protocoloId) return false;

    try {
      const { error } = await supabase
        .from('project_protocolos')
        .update({ processo_oab_id: novoProcessoOabId })
        .eq('id', protocoloId);

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
      }

      return true;
    } catch (error) {
      console.error('Erro ao vincular processo:', error);
      return false;
    }
  };

  const desvincularProcesso = async () => {
    if (!protocoloId) return false;

    try {
      const { error } = await supabase
        .from('project_protocolos')
        .update({ processo_oab_id: null })
        .eq('id', protocoloId);

      if (error) throw error;

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
    refetch: fetchProcessoVinculado,
  };
};
