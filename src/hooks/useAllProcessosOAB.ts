import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from './useTenantId';
import { ProcessoOAB, OABCadastrada } from './useOABs';
import { formatCnjFromDigits } from '@/utils/processoHelpers';

export interface ProcessoOABComOAB extends ProcessoOAB {
  oab_numero: string;
  oab_uf: string;
  nome_advogado: string | null;
  oab_data?: OABCadastrada;
  ultima_movimentacao?: string | null;
}

const PAGE_SIZE = 20;

export const useAllProcessosOAB = () => {
  const [processos, setProcessos] = useState<ProcessoOABComOAB[]>([]);
  const [loading, setLoading] = useState(false);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenantId } = useTenantId();

  const fetchProcessos = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Main query WITHOUT heavy andamentos join, with pagination
      let query = supabase
        .from('processos_oab')
        .select(`
          *,
          oabs_cadastradas!inner(id, oab_numero, oab_uf, nome_advogado, email_advogado, telefone_advogado, endereco_advogado, cidade_advogado, cep_advogado, logo_url, ordem, ultima_sincronizacao, total_processos, ultimo_request_id, request_id_data, created_at)
        `, { count: 'exact' })
        .eq('tenant_id', tenantId);

      // Server-side search
      if (searchTerm.trim()) {
        const raw = searchTerm.trim();
        const cnjFormatted = formatCnjFromDigits(raw);
        const termoRaw = `%${raw}%`;
        const termoCnj = `%${cnjFormatted}%`;
        const orParts = [
          `numero_cnj.ilike.${termoRaw}`,
          `parte_ativa.ilike.${termoRaw}`,
          `parte_passiva.ilike.${termoRaw}`,
          `tribunal_sigla.ilike.${termoRaw}`,
        ];
        // Se o usuário digitou os 20 dígitos sem pontuação, também procura pelo CNJ formatado
        if (cnjFormatted !== raw) {
          orParts.unshift(`numero_cnj.ilike.${termoCnj}`);
        }
        query = query.or(orParts.join(','));
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Efficient unread counts via RPC
      const { data: naoLidosData } = await supabase
        .rpc('get_andamentos_nao_lidos_por_processo', { p_tenant_id: tenantId });

      const naoLidosMap = new Map<string, { nao_lidos: number; ultima_movimentacao: string | null }>();
      (naoLidosData || []).forEach((r: any) => {
        naoLidosMap.set(r.processo_oab_id, {
          nao_lidos: r.nao_lidos,
          ultima_movimentacao: r.ultima_movimentacao
        });
      });

      // Deduplicate by numero_cnj
      const cnjMap = new Map<string, ProcessoOABComOAB>();

      (data || []).forEach((p: any) => {
        const { oabs_cadastradas, ...processo } = p;

        const info = naoLidosMap.get(processo.id);
        const processoComOAB: ProcessoOABComOAB = {
          ...processo,
          andamentos_nao_lidos: info?.nao_lidos || 0,
          ultima_movimentacao: info?.ultima_movimentacao || null,
          oab_numero: oabs_cadastradas?.oab_numero || '',
          oab_uf: oabs_cadastradas?.oab_uf || '',
          nome_advogado: oabs_cadastradas?.nome_advogado || null,
          oab_data: oabs_cadastradas as OABCadastrada,
        };

        const existing = cnjMap.get(processo.numero_cnj);
        if (!existing) {
          cnjMap.set(processo.numero_cnj, processoComOAB);
        } else {
          if (processoComOAB.monitoramento_ativo && !existing.monitoramento_ativo) {
            cnjMap.set(processo.numero_cnj, processoComOAB);
          }
        }
      });

      setProcessos(Array.from(cnjMap.values()));
      setTotalCount(count || 0);
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
  }, [tenantId, toast, page, searchTerm]);

  useEffect(() => {
    fetchProcessos();
  }, [fetchProcessos]);

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
      if (ativar) {
        const { data, error } = await supabase.functions.invoke(
          'escavador-ativar-monitoramento-oab',
          { body: { processoOabId: processoId, numeroCnj, tenantId } },
        );
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Erro ao ativar monitoramento');

        toast({
          title: 'Monitoramento ativado',
          description: data?.processoEncontrado
            ? `${data?.totalAndamentos ?? 0} andamento(s) sincronizado(s). Atualizações semanais via Escavador.`
            : 'Processo registrado para monitoramento semanal via Escavador.',
        });

        await fetchProcessos();
        return data;
      } else {
        // Desativar Escavador (principal) + cleanup Judit (best-effort)
        const [resEsc, resJudit] = await Promise.allSettled([
          supabase.functions.invoke('escavador-desativar-monitoramento-oab', {
            body: { processoOabId: processoId },
          }),
          supabase.functions.invoke('judit-desativar-monitoramento', {
            body: { processoId },
          }),
        ]);

        if (resEsc.status === 'rejected' || (resEsc.value as any)?.error) {
          throw new Error(
            (resEsc.status === 'rejected' ? resEsc.reason?.message : (resEsc.value as any)?.error?.message)
              || 'Erro ao desativar monitoramento',
          );
        }
        if (resJudit.status === 'rejected') {
          console.warn('[toggleMonitoramento] cleanup Judit falhou (ignorado):', resJudit.reason);
        }

        toast({
          title: 'Monitoramento desativado',
          description: 'Histórico de andamentos mantido.',
        });

        await fetchProcessos();
        return { success: true };
      }
    } catch (error: any) {
      console.error('[useAllProcessosOAB] Erro toggle:', error);
      toast({ title: 'Erro ao alterar monitoramento', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const consultarDetalhesRequest = async (_processoId: string, _requestId: string) => {
    return { success: true };
  };

  const resetarProcesso = async (
    processoId: string,
    numeroCnj: string,
    opts?: { juditCustomerKey?: string | null; juditSystemName?: string | null }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('judit-resetar-processo', {
        body: {
          processoOabId: processoId,
          userId: user?.id,
          juditCustomerKey: opts?.juditCustomerKey ?? null,
          juditSystemName: opts?.juditSystemName ?? null,
        }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao resetar processo');

      const novos = data.andamentosNovos ?? 0;
      if (data.motivo === 'credencial_sem_acesso') {
        toast({
          title: 'Credencial não destravou',
          description: `${numeroCnj} — a credencial enviada não tem acesso a este processo sigiloso. Tente outra credencial.`,
          variant: 'destructive',
        });
      } else if (data.motivo === 'sem_credencial' && novos === 0) {
        toast({
          title: 'Processo em sigilo',
          description: `${numeroCnj} — sem credencial selecionada. Escolha uma credencial em "Atualizar com…" para destravar.`,
        });
      } else {
        toast({
          title: novos > 0 ? `${novos} novo(s) andamento(s)` : 'Atualizado',
          description: data.destravou
            ? `${numeroCnj} — processo destravado com sucesso.`
            : `${numeroCnj} — atualização concluída.`,
        });
      }

      await fetchProcessos();
      return data;
    } catch (error: any) {
      console.error('[useAllProcessosOAB] Erro reset:', error);
      toast({ title: 'Erro ao atualizar processo', description: error.message, variant: 'destructive' });
      return null;
    }
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
    page,
    setPage,
    totalCount,
    pageSize: PAGE_SIZE,
    searchTerm,
    setSearchTerm,
    fetchProcessos,
    carregarDetalhes,
    toggleMonitoramento,
    consultarDetalhesRequest,
    resetarProcesso,
    excluirProcesso,
    atualizarProcesso
  };
};
