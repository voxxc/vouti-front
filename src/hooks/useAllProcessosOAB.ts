import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from './useTenantId';
import { ProcessoOAB, OABCadastrada } from './useOABs';

export interface ProcessoOABComOAB extends ProcessoOAB {
  oab_numero: string;
  oab_uf: string;
  nome_advogado: string | null;
  oab_data?: OABCadastrada;
}

export const useAllProcessosOAB = () => {
  const [processos, setProcessos] = useState<ProcessoOABComOAB[]>([]);
  const [loading, setLoading] = useState(false);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenantId } = useTenantId();

  const fetchProcessos = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('processos_oab')
        .select(`
          *,
          processos_oab_andamentos!left(id, lida),
          oabs_cadastradas!inner(id, oab_numero, oab_uf, nome_advogado, email_advogado, telefone_advogado, endereco_advogado, cidade_advogado, cep_advogado, logo_url, ordem, ultima_sincronizacao, total_processos, ultimo_request_id, request_id_data, created_at)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process and deduplicate by numero_cnj
      const cnjMap = new Map<string, ProcessoOABComOAB>();

      (data || []).forEach((p: any) => {
        const andamentos = p.processos_oab_andamentos || [];
        const naoLidos = andamentos.filter((a: any) => a.lida === false).length;
        const { processos_oab_andamentos, oabs_cadastradas, ...processo } = p;

        const processoComOAB: ProcessoOABComOAB = {
          ...processo,
          andamentos_nao_lidos: naoLidos,
          oab_numero: oabs_cadastradas?.oab_numero || '',
          oab_uf: oabs_cadastradas?.oab_uf || '',
          nome_advogado: oabs_cadastradas?.nome_advogado || null,
          oab_data: oabs_cadastradas as OABCadastrada,
        };

        const existing = cnjMap.get(processo.numero_cnj);
        if (!existing) {
          cnjMap.set(processo.numero_cnj, processoComOAB);
        } else {
          // Prioritize monitored
          if (processoComOAB.monitoramento_ativo && !existing.monitoramento_ativo) {
            cnjMap.set(processo.numero_cnj, processoComOAB);
          }
        }
      });

      setProcessos(Array.from(cnjMap.values()));
    } catch (error: any) {
      console.error('[useAllProcessosOAB] Erro:', error);
      toast({
        title: 'Erro ao carregar processos',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  useEffect(() => {
    fetchProcessos();
  }, [fetchProcessos]);

  // Real-time for unread counts
  const processosRef = useRef<ProcessoOABComOAB[]>([]);
  processosRef.current = processos;

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`all-processos-andamentos-${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'processos_oab_andamentos' },
        async (payload) => {
          const processoId = (payload.new as any)?.processo_oab_id || (payload.old as any)?.processo_oab_id;
          if (!processoId) return;

          const processoExiste = processosRef.current.some(p => p.id === processoId);
          if (!processoExiste) return;

          const { count } = await supabase
            .from('processos_oab_andamentos')
            .select('*', { count: 'exact', head: true })
            .eq('processo_oab_id', processoId)
            .eq('lida', false);

          setProcessos(prev =>
            prev.map(p => p.id === processoId
              ? { ...p, andamentos_nao_lidos: count || 0 }
              : p
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  const carregarDetalhes = async (processoId: string, _numeroCnj: string, _oabId?: string) => {
    setProcessos(prev =>
      prev.map(p => p.id === processoId ? { ...p, detalhes_carregados: true } : p)
    );
    return { success: true };
  };

  const toggleMonitoramento = async (
    processoId: string,
    numeroCnj: string,
    ativar: boolean,
    oabId?: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('judit-ativar-monitoramento-oab', {
        body: { processoOabId: processoId, numeroCnj, ativar, tenantId, userId: user?.id, oabId }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao alterar monitoramento');

      toast({
        title: ativar ? 'Monitoramento ativado' : 'Monitoramento desativado',
        description: ativar ? 'Você receberá atualizações diárias' : 'Histórico de andamentos mantido'
      });

      await fetchProcessos();
      return data;
    } catch (error: any) {
      console.error('[useAllProcessosOAB] Erro toggle:', error);
      toast({ title: 'Erro ao alterar monitoramento', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const consultarDetalhesRequest = async (_processoId: string, _requestId: string) => {
    return { success: true };
  };

  const excluirProcesso = async (processoId: string, numeroCnj: string) => {
    try {
      const { data: processoCheck } = await supabase
        .from('processos_oab')
        .select('monitoramento_ativo')
        .eq('id', processoId)
        .single();

      if (processoCheck?.monitoramento_ativo) {
        toast({
          title: 'Exclusão bloqueada',
          description: 'Desative o monitoramento primeiro.',
          variant: 'destructive'
        });
        return false;
      }

      await supabase.from('processos_oab_andamentos').delete().eq('processo_oab_id', processoId);
      const { error } = await supabase.from('processos_oab').delete().eq('id', processoId);
      if (error) throw error;

      setProcessos(prev => prev.filter(p => p.id !== processoId));
      toast({ title: 'Processo excluído', description: `O processo ${numeroCnj} foi removido` });
      return true;
    } catch (error: any) {
      console.error('[useAllProcessosOAB] Erro excluir:', error);
      toast({ title: 'Erro ao excluir processo', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const atualizarProcesso = async (
    processoId: string,
    dados: Partial<Omit<ProcessoOAB, 'id' | 'created_at'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('processos_oab')
        .update({ ...dados, updated_at: new Date().toISOString() })
        .eq('id', processoId);

      if (error) throw error;

      setProcessos(prev => prev.map(p => p.id === processoId ? { ...p, ...dados } : p));
      toast({ title: 'Processo atualizado', description: 'Informações salvas com sucesso' });
      return true;
    } catch (error: any) {
      console.error('[useAllProcessosOAB] Erro atualizar:', error);
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  return {
    processos,
    loading,
    carregandoDetalhes,
    fetchProcessos,
    carregarDetalhes,
    toggleMonitoramento,
    consultarDetalhesRequest,
    excluirProcesso,
    atualizarProcesso
  };
};
