import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from './useTenantId';
import { ProcessoOAB, OABCadastrada } from './useOABs';
import { formatCnjFromDigits } from '@/utils/processoHelpers';
import { cnjUFFromRow, buildUFOrFilter } from '@/utils/cnjUFMap';

export interface ProcessoOABComOAB extends ProcessoOAB {
  oab_numero: string;
  oab_uf: string;
  nome_advogado: string | null;
  oab_data?: OABCadastrada;
  ultima_movimentacao?: string | null;
}

const PAGE_SIZE = 20;

export type FiltroPrincipal =
  | 'todos'
  | 'monitorados'
  | 'sigilosos'
  | 'nao-lidos'
  | { tipo: 'uf'; uf: string }
  | { tipo: 'oab'; numero: string; uf: string };

export type FiltroApartado = 'todos' | 'apartados' | 'nao_apartados';

export interface GlobalCounts {
  total: number;
  monitorados: number;
  sigilosos: number;
  naoLidos: number;
  ufs: { uf: string; count: number }[];
  oabs: { oab: string; count: number }[];
}

export const useAllProcessosOAB = (
  filtroPrincipal: FiltroPrincipal = 'todos',
  filtroApartado: FiltroApartado = 'todos',
) => {
  const [processos, setProcessos] = useState<ProcessoOABComOAB[]>([]);
  const [loading, setLoading] = useState(false);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalCounts, setGlobalCounts] = useState<GlobalCounts>({
    total: 0, monitorados: 0, sigilosos: 0, naoLidos: 0, ufs: [], oabs: [],
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenantId } = useTenantId();

  // ---------- Global counters (independent of pagination/filter) ----------
  const fetchGlobalCounts = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [totalRes, monRes, sigRes, naoLidosRes, listaRes] = await Promise.all([
        supabase
          .from('processos_oab')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
        supabase
          .from('processos_oab')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('monitoramento_ativo', true),
        supabase
          .from('processos_oab')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .or('capa_completa->>secrecy_level.gt.0,capa_completa->>secrecy_level.is.null,capa_completa.is.null'),
        supabase.rpc('get_andamentos_nao_lidos_por_processo', { p_tenant_id: tenantId }),
        // Lista global enxuta para alimentar selects de UF/OAB
        (async () => {
          const { fetchAllPaginated } = await import('@/lib/supabasePagination');
          return await fetchAllPaginated<any>(() =>
            supabase
              .from('processos_oab')
              .select('numero_cnj, tribunal_sigla, oabs_cadastradas!inner(oab_numero, oab_uf)')
              .eq('tenant_id', tenantId)
              .order('id')
          );
        })(),
      ]);

      const naoLidos = (naoLidosRes.data || []).filter((r: any) => (r.nao_lidos || 0) > 0).length;

      const ufMap = new Map<string, number>();
      const oabMap = new Map<string, number>();
      (listaRes.data || []).forEach((p: any) => {
        const uf = cnjUFFromRow(p.tribunal_sigla, p.numero_cnj);
        if (uf) ufMap.set(uf, (ufMap.get(uf) || 0) + 1);
        const oc = p.oabs_cadastradas;
        if (oc?.oab_numero && oc?.oab_uf) {
          const k = `${oc.oab_numero}/${oc.oab_uf}`;
          oabMap.set(k, (oabMap.get(k) || 0) + 1);
        }
      });

      setGlobalCounts({
        total: totalRes.count || 0,
        monitorados: monRes.count || 0,
        sigilosos: sigRes.count || 0,
        naoLidos,
        ufs: Array.from(ufMap.entries()).sort((a, b) => b[1] - a[1]).map(([uf, count]) => ({ uf, count })),
        oabs: Array.from(oabMap.entries()).sort((a, b) => b[1] - a[1]).map(([oab, count]) => ({ oab, count })),
      });
    } catch (err) {
      console.error('[useAllProcessosOAB] globalCounts erro:', err);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchGlobalCounts();
  }, [fetchGlobalCounts]);

  const fetchProcessos = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Pré-carrega lista de IDs com andamentos não lidos quando filtro 'nao-lidos'
      let idsNaoLidos: string[] | null = null;
      if (filtroPrincipal === 'nao-lidos') {
        const { data: rpcData } = await supabase
          .rpc('get_andamentos_nao_lidos_por_processo', { p_tenant_id: tenantId });
        idsNaoLidos = (rpcData || [])
          .filter((r: any) => (r.nao_lidos || 0) > 0)
          .map((r: any) => r.processo_oab_id);
        if (idsNaoLidos.length === 0) {
          setProcessos([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }
      }

      // Main query WITHOUT heavy andamentos join, with pagination
      let query = supabase
        .from('processos_oab')
        .select(`
          *,
          oabs_cadastradas!inner(id, oab_numero, oab_uf, nome_advogado, email_advogado, telefone_advogado, endereco_advogado, cidade_advogado, cep_advogado, logo_url, ordem, ultima_sincronizacao, total_processos, ultimo_request_id, request_id_data, created_at)
        `, { count: 'exact' })
        .eq('tenant_id', tenantId);

      // Filtros principais (server-side)
      if (filtroPrincipal === 'monitorados') {
        query = query.eq('monitoramento_ativo', true);
      } else if (filtroPrincipal === 'sigilosos') {
        query = query.or('capa_completa->>secrecy_level.gt.0,capa_completa->>secrecy_level.is.null,capa_completa.is.null');
      } else if (filtroPrincipal === 'nao-lidos' && idsNaoLidos) {
        query = query.in('id', idsNaoLidos);
      } else if (typeof filtroPrincipal === 'object' && filtroPrincipal.tipo === 'uf') {
        const orClause = buildUFOrFilter(filtroPrincipal.uf);
        if (orClause) query = query.or(orClause);
      } else if (typeof filtroPrincipal === 'object' && filtroPrincipal.tipo === 'oab') {
        query = query
          .eq('oabs_cadastradas.oab_numero', filtroPrincipal.numero)
          .eq('oabs_cadastradas.oab_uf', filtroPrincipal.uf);
      }

      if (filtroApartado === 'apartados') {
        query = query.eq('apartado', true);
      } else if (filtroApartado === 'nao_apartados') {
        query = query.or('apartado.is.null,apartado.eq.false');
      }

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
    // Atualiza contagens globais em paralelo para refletir mudanças (delete/toggle).
    fetchGlobalCounts();
  }, [tenantId, toast, page, searchTerm, JSON.stringify(filtroPrincipal), filtroApartado, fetchGlobalCounts]);

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
    oabId?: string,
    _onProcessoCompartilhadoAtualizado?: (cnj: string, oabsAfetadas: string[]) => void,
    sigiloso?: boolean
  ) => {
    try {
      if (sigiloso) {
        const { error: updErr } = await supabase
          .from('processos_oab')
          .update({ monitoramento_ativo: ativar })
          .eq('id', processoId)
          .eq('tenant_id', tenantId);
        if (updErr) throw updErr;
        toast({
          title: ativar ? 'Monitoramento ativado' : 'Monitoramento desativado',
          description: ativar
            ? 'Processo sigiloso — atualizações serão registradas manualmente.'
            : 'Histórico de andamentos mantido.',
        });
        await fetchProcessos();
        return { success: true };
      } else if (ativar) {
        const { data, error } = await supabase.functions.invoke(
          'escavador-ativar-monitoramento-oab',
          { body: { processoOabId: processoId, numeroCnj, tenantId } },
        );
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Erro ao ativar monitoramento');

        toast({
          title: 'Monitoramento ativado',
          description: data?.processoEncontrado
            ? `${data?.totalAndamentos ?? 0} andamento(s) sincronizado(s).`
            : 'Processo registrado para monitoramento.',
        });

        await fetchProcessos();
        return data;
      } else {
        const { error: errEsc } = await supabase.functions.invoke(
          'escavador-desativar-monitoramento-oab',
          { body: { processoOabId: processoId } },
        );
        if (errEsc) throw errEsc;

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
    atualizarProcesso,
    globalCounts,
    refetchGlobalCounts: fetchGlobalCounts,
  };
};
