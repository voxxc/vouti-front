import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from './useTenantId';
import { fetchAllPaginated } from '@/lib/supabasePagination';

export interface OABCadastrada {
  id: string;
  oab_numero: string;
  oab_uf: string;
  nome_advogado: string | null;
  ordem: number;
  ultima_sincronizacao: string | null;
  total_processos: number;
  ultimo_request_id: string | null;
  request_id_data: string | null;
  created_at: string;
  // Campos do perfil do advogado
  email_advogado: string | null;
  telefone_advogado: string | null;
  endereco_advogado: string | null;
  cidade_advogado: string | null;
  cep_advogado: string | null;
  logo_url: string | null;
}

export interface ProcessoOAB {
  id: string;
  oab_id: string;
  numero_cnj: string;
  tribunal: string | null;
  tribunal_sigla: string | null;
  parte_ativa: string | null;
  parte_passiva: string | null;
  partes_completas: any;
  status_processual: string | null;
  fase_processual: string | null;
  data_distribuicao: string | null;
  valor_causa: number | null;
  juizo: string | null;
  link_tribunal: string | null;
  capa_completa: any;
  detalhes_completos: any;
  detalhes_carregados: boolean;
  detalhes_request_id: string | null;
  detalhes_request_data: string | null;
  ordem_lista: number;
  monitoramento_ativo: boolean;
  tracking_id: string | null;
  ultima_atualizacao_detalhes: string | null;
  created_at: string;
  andamentos_nao_lidos?: number;
  // Campos de automação de prazos
  prazo_automatico_ativo?: boolean;
  prazo_advogado_responsavel_id?: string | null;
  prazo_usuarios_marcados?: string[];
  // Vínculo com credencial Judit (definido na importação, editável no drawer)
  judit_system_name?: string | null;
  judit_customer_key?: string | null;
}

export interface AndamentoOAB {
  id: string;
  processo_oab_id: string;
  data_movimentacao: string | null;
  tipo_movimentacao: string | null;
  descricao: string;
  dados_completos: any;
  lida: boolean;
  created_at: string;
  super_admin_ordem?: number | null;
}

function sortAndamentos<T extends { super_admin_ordem?: number | null; data_movimentacao: string | null }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const ao = a.super_admin_ordem;
    const bo = b.super_admin_ordem;
    const aHas = ao !== null && ao !== undefined;
    const bHas = bo !== null && bo !== undefined;
    if (aHas && bHas) return (bo as number) - (ao as number);
    if (aHas) return -1;
    if (bHas) return 1;
    const da = a.data_movimentacao ? new Date(a.data_movimentacao).getTime() : 0;
    const db = b.data_movimentacao ? new Date(b.data_movimentacao).getTime() : 0;
    return db - da;
  });
}

export const useOABs = () => {
  const [oabs, setOabs] = useState<OABCadastrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, userRoles } = useAuth();
  const { tenantId } = useTenantId();

  const isAdminOrController = userRoles.some(r => r === 'admin' || r === 'controller');

  const fetchOABs = useCallback(async () => {
    try {
      if (!user) return;

      let query = supabase
        .from('oabs_cadastradas')
        .select('*')
        .order('ordem', { ascending: true });

      if (isAdminOrController && tenantId) {
        query = query.eq('tenant_id', tenantId);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOabs((data as OABCadastrada[]) || []);
    } catch (error: any) {
      console.error('[useOABs] Erro ao buscar OABs:', error);
      toast({
        title: 'Erro ao carregar OABs',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user, tenantId, isAdminOrController]);

  useEffect(() => {
    fetchOABs();
  }, [fetchOABs]);

  const cadastrarOAB = async (oabNumero: string, oabUf: string, nomeAdvogado?: string) => {
    try {
      if (!user) throw new Error('Usuario nao autenticado');

      const { data, error } = await supabase
        .from('oabs_cadastradas')
        .insert({
          oab_numero: oabNumero,
          oab_uf: oabUf,
          nome_advogado: nomeAdvogado || null,
          user_id: user.id,
          tenant_id: tenantId,
          ordem: oabs.length
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Esta OAB ja esta cadastrada');
        }
        throw error;
      }

      setOabs(prev => [...prev, data as OABCadastrada]);
      
      toast({
        title: 'OAB cadastrada',
        description: `OAB ${oabNumero}/${oabUf} adicionada. Sincronizando processos...`
      });

      // Sincronizar automaticamente apos cadastro
      sincronizarOAB(data.id, oabNumero, oabUf);

      return data;
    } catch (error: any) {
      console.error('[useOABs] Erro ao cadastrar OAB:', error);
      toast({
        title: 'Erro ao cadastrar OAB',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }
  };

  const sincronizarOAB = async (oabId: string, oabNumero: string, oabUf: string) => {
    setSincronizando(oabId);
    try {

      const { data, error } = await supabase.functions.invoke('judit-sincronizar-oab', {
        body: { oabId, oabNumero, oabUf, tenantId, userId: user?.id }
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao sincronizar');
      }

      toast({
        title: 'Sincronizacao concluida',
        description: `${data.totalProcessos} processos encontrados`
      });

      // Atualizar lista de OABs
      await fetchOABs();
      
      return data;
    } catch (error: any) {
      console.error('[useOABs] Erro ao sincronizar OAB:', error);
      toast({
        title: 'Erro na sincronizacao',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setSincronizando(null);
    }
  };

  const removerOAB = async (oabId: string) => {
    try {
      const { error } = await supabase
        .from('oabs_cadastradas')
        .delete()
        .eq('id', oabId);

      if (error) throw error;

      setOabs(prev => prev.filter(o => o.id !== oabId));
      
      toast({
        title: 'OAB removida',
        description: 'A OAB e seus processos foram removidos'
      });
    } catch (error: any) {
      console.error('[useOABs] Erro ao remover OAB:', error);
      toast({
        title: 'Erro ao remover OAB',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Consultar request existente (GRATUITO - apenas GET)
  const consultarRequest = async (oabId: string, requestId: string) => {
    setSincronizando(oabId);
    try {
      const { data, error } = await supabase.functions.invoke('judit-consultar-request', {
        body: { oabId, requestId }
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.message || data?.error || 'Nenhum resultado encontrado');
      }

      toast({
        title: 'Consulta concluida (GRATUITO)',
        description: `${data.totalProcessos} processos carregados`
      });

      await fetchOABs();
      return data;
    } catch (error: any) {
      console.error('[useOABs] Erro ao consultar request:', error);
      toast({
        title: 'Erro na consulta',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setSincronizando(null);
    }
  };

  // Salvar request_id manualmente
  const salvarRequestId = async (oabId: string, requestId: string) => {
    try {
      const { error } = await supabase
        .from('oabs_cadastradas')
        .update({
          ultimo_request_id: requestId,
          request_id_data: new Date().toISOString()
        })
        .eq('id', oabId);

      if (error) throw error;

      setOabs(prev => prev.map(o => 
        o.id === oabId 
          ? { ...o, ultimo_request_id: requestId, request_id_data: new Date().toISOString() }
          : o
      ));

      toast({
        title: 'Request ID salvo',
        description: 'Agora voce pode consultar o resultado gratuitamente'
      });

      return true;
    } catch (error: any) {
      console.error('[useOABs] Erro ao salvar request ID:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    oabs,
    loading,
    sincronizando,
    fetchOABs,
    cadastrarOAB,
    sincronizarOAB,
    removerOAB,
    consultarRequest,
    salvarRequestId
  };
};

export const useProcessosOAB = (oabId: string | null) => {
  const [processos, setProcessos] = useState<ProcessoOAB[]>([]);
  const [loading, setLoading] = useState(false);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenantId } = useTenantId();

  const fetchProcessos = useCallback(async () => {
    if (!oabId) {
      setProcessos([]);
      return;
    }

    setLoading(true);
    try {
      // Evita timeout: duas queries leves em paralelo, sem JOIN pesado em andamentos.
      const processosPromise = fetchAllPaginated<any>(() =>
        supabase
          .from('processos_oab')
          .select('*')
          .eq('oab_id', oabId)
          .order('ordem_lista', { ascending: true }) as any
      );

      const naoLidosPromise = tenantId
        ? supabase.rpc('get_andamentos_nao_lidos_por_processo', { p_tenant_id: tenantId })
        : Promise.resolve({ data: [], error: null } as any);

      const [processosResult, naoLidosResult] = await Promise.all([
        processosPromise,
        naoLidosPromise,
      ]);

      if (processosResult.error) throw processosResult.error;

      const naoLidosMap = new Map<string, number>();
      if (!naoLidosResult.error && Array.isArray(naoLidosResult.data)) {
        naoLidosResult.data.forEach((r: any) => {
          naoLidosMap.set(r.processo_oab_id, Number(r.nao_lidos) || 0);
        });
      }

      const processosComContagem = (processosResult.data || []).map((p: any) => ({
        ...p,
        andamentos_nao_lidos: naoLidosMap.get(p.id) || 0,
      })) as ProcessoOAB[];

      setProcessos(processosComContagem);
    } catch (error: any) {
      console.error('[useProcessosOAB] Erro:', error);
      // Fallback sutil: não mostra toast vermelho para não assustar o usuário.
      // Mostra apenas um aviso discreto e mantém a lista vazia para nova tentativa.
      toast({
        title: 'Carregando…',
        description: 'A lista demorou para responder. Tente novamente em instantes.',
      });
    } finally {
      setLoading(false);
    }
  }, [oabId, tenantId, toast]);

  useEffect(() => {
    fetchProcessos();
  }, [fetchProcessos]);

  // Real-time subscription para atualizar contagem de andamentos nao lidos
  // Usar ref para evitar stale closure
  const processosRef = useRef<ProcessoOAB[]>([]);
  processosRef.current = processos;

  useEffect(() => {
    if (!oabId) return;

    const channel = supabase
      .channel(`processos-andamentos-count-${oabId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'processos_oab_andamentos'
        },
        async (payload) => {
          const processoId = (payload.new as any)?.processo_oab_id || (payload.old as any)?.processo_oab_id;
          if (!processoId) return;

          // Usar ref para verificar se processo pertence a esta OAB (evita stale closure)
          const processoExiste = processosRef.current.some(p => p.id === processoId);
          if (!processoExiste) return;

          // Atualizar contagem do processo afetado
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [oabId]);

  const atualizarOrdem = async (processosOrdenados: ProcessoOAB[]) => {
    try {
      const updates = processosOrdenados.map((p, index) => ({
        id: p.id,
        ordem_lista: index
      }));

      for (const update of updates) {
        await supabase
          .from('processos_oab')
          .update({ ordem_lista: update.ordem_lista })
          .eq('id', update.id);
      }

      setProcessos(processosOrdenados.map((p, index) => ({ ...p, ordem_lista: index })));
    } catch (error: any) {
      console.error('[useProcessosOAB] Erro ao atualizar ordem:', error);
    }
  };

  const toggleMonitoramento = async (
    processoId: string, 
    numeroCnj: string, 
    ativar: boolean, 
    oabId?: string,
    onProcessoCompartilhadoAtualizado?: (cnj: string, oabsAfetadas: string[]) => void,
    sigiloso?: boolean
  ) => {
    try {
      let data: any;
      if (sigiloso) {
        // Processos sigilosos: monitoramento "visual" — apenas atualiza o flag,
        // sem chamar Escavador. Atualizações são alimentadas manualmente.
        const { error: updErr } = await supabase
          .from('processos_oab')
          .update({ monitoramento_ativo: ativar })
          .eq('id', processoId)
          .eq('tenant_id', tenantId);
        if (updErr) throw updErr;
        data = { success: true };
        toast({
          title: ativar ? 'Monitoramento ativado' : 'Monitoramento desativado',
          description: ativar
            ? 'Processo sigiloso — atualizações serão registradas manualmente.'
            : 'Histórico de andamentos mantido.',
        });
      } else if (ativar) {
        const res = await supabase.functions.invoke('escavador-ativar-monitoramento-oab', {
          body: { processoOabId: processoId, numeroCnj, tenantId },
        });
        if (res.error) throw res.error;
        data = res.data;
        if (!data?.success) throw new Error(data?.error || 'Erro ao ativar monitoramento');

        toast({
          title: 'Monitoramento ativado',
          description: data?.processoEncontrado
            ? `${data?.totalAndamentos ?? 0} andamento(s) sincronizado(s). Atualizações semanais via Escavador.`
            : 'Processo registrado para monitoramento semanal via Escavador.',
        });
      } else {
        const resEsc = await supabase.functions.invoke('escavador-desativar-monitoramento-oab', {
          body: { processoOabId: processoId },
        });
        if (resEsc.error) throw resEsc.error;
        data = { success: true };
        toast({
          title: 'Monitoramento desativado',
          description: 'Histórico de andamentos mantido.',
        });
      }

      await fetchProcessos();

      // Notificar sobre processos compartilhados atualizados
      if (data.processosSincronizados > 1 && onProcessoCompartilhadoAtualizado) {
        // Buscar OABs afetadas
        const { data: oabsAfetadas } = await supabase
          .from('processos_oab')
          .select('oab_id')
          .eq('numero_cnj', numeroCnj)
          .eq('tenant_id', tenantId)
          .neq('oab_id', oabId);
        
        const oabIds = oabsAfetadas?.map(o => o.oab_id).filter(Boolean) as string[] || [];
        onProcessoCompartilhadoAtualizado(numeroCnj, oabIds);
      }

      return data;
    } catch (error: any) {
      console.error('[useProcessosOAB] Erro ao alterar monitoramento:', error);
      toast({
        title: 'Erro ao alterar monitoramento',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }
  };

  // Simplificado: dados já estão no banco via sincronização + monitoramento
  const consultarDetalhesRequest = async (_processoId: string, _requestId: string) => {
    // Não precisa chamar Edge Function — andamentos já estão no banco
    return { success: true };
  };

  const excluirProcesso = async (processoId: string, numeroCnj: string) => {
    try {
      // VALIDAÇÃO: Verificar se o processo está em monitoramento ativo
      const { data: processoCheck } = await supabase
        .from('processos_oab')
        .select('monitoramento_ativo')
        .eq('id', processoId)
        .single();
      
      if (processoCheck?.monitoramento_ativo) {
        toast({
          title: 'Exclusão bloqueada',
          description: 'Não é possível excluir processos com monitoramento ativo. Desative o monitoramento primeiro.',
          variant: 'destructive'
        });
        return false;
      }

      // Primeiro excluir os andamentos do processo
      const { error: andamentosError } = await supabase
        .from('processos_oab_andamentos')
        .delete()
        .eq('processo_oab_id', processoId);

      if (andamentosError) {
        console.error('[useProcessosOAB] Erro ao excluir andamentos:', andamentosError);
      }

      // Depois excluir o processo
      const { error } = await supabase
        .from('processos_oab')
        .delete()
        .eq('id', processoId);

      if (error) throw error;

      // Atualizar state local
      setProcessos(prev => prev.filter(p => p.id !== processoId));

      toast({
        title: 'Processo excluído',
        description: `O processo ${numeroCnj} foi removido da lista`
      });

      return true;
    } catch (error: any) {
      console.error('[useProcessosOAB] Erro ao excluir processo:', error);
      toast({
        title: 'Erro ao excluir processo',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  // Atualizar dados do processo manualmente
  const atualizarProcesso = async (
    processoId: string, 
    dados: Partial<Omit<ProcessoOAB, 'id' | 'created_at'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('processos_oab')
        .update({
          ...dados,
          updated_at: new Date().toISOString()
        })
        .eq('id', processoId);

      if (error) throw error;

      // Atualizar state local
      setProcessos(prev => 
        prev.map(p => p.id === processoId 
          ? { ...p, ...dados } 
          : p
        )
      );

      toast({
        title: 'Processo atualizado',
        description: 'As informações foram salvas com sucesso'
      });

      return true;
    } catch (error: any) {
      console.error('[useProcessosOAB] Erro ao atualizar processo:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    processos,
    loading,
    carregandoDetalhes,
    fetchProcessos,
    atualizarOrdem,
    toggleMonitoramento,
    consultarDetalhesRequest,
    excluirProcesso,
    atualizarProcesso
  };
};

export const useAndamentosOAB = (processoOabId: string | null) => {
  const [andamentos, setAndamentos] = useState<AndamentoOAB[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAndamentos = useCallback(async () => {
    if (!processoOabId) {
      setAndamentos([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('processos_oab_andamentos')
        .select('*')
        .eq('processo_oab_id', processoOabId)
        .order('super_admin_ordem', { ascending: false, nullsFirst: false })
        .order('data_movimentacao', { ascending: false });

      if (error) throw error;
      setAndamentos(sortAndamentos((data as AndamentoOAB[]) || []));
    } catch (error: any) {
      console.error('[useAndamentosOAB] Erro:', error);
    } finally {
      setLoading(false);
    }
  }, [processoOabId]);

  useEffect(() => {
    fetchAndamentos();
  }, [fetchAndamentos]);

  // Real-time subscription para andamentos
  useEffect(() => {
    if (!processoOabId) return;

    const channel = supabase
      .channel(`andamentos-oab-${processoOabId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'processos_oab_andamentos',
          filter: `processo_oab_id=eq.${processoOabId}`
        },
        (payload) => {
          const newAndamento = payload.new as AndamentoOAB;
          setAndamentos(prev => {
            // Evitar duplicatas
            if (prev.some(a => a.id === newAndamento.id)) return prev;
            return sortAndamentos([newAndamento, ...prev]);
          });
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'processos_oab_andamentos',
          filter: `processo_oab_id=eq.${processoOabId}`
        },
        (payload) => {
          const updatedAndamento = payload.new as AndamentoOAB;
          setAndamentos(prev =>
            sortAndamentos(prev.map(a => a.id === updatedAndamento.id ? updatedAndamento : a))
          );
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'processos_oab_andamentos',
          filter: `processo_oab_id=eq.${processoOabId}`
        },
        (payload) => {
          const deletedId = (payload.old as any)?.id;
          if (deletedId) {
            setAndamentos(prev => prev.filter(a => a.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [processoOabId]);

  const marcarComoLida = async (andamentoId: string) => {
    try {
      await supabase
        .from('processos_oab_andamentos')
        .update({ lida: true })
        .eq('id', andamentoId);

      // O real-time subscription ja vai atualizar o state
    } catch (error: any) {
      console.error('[useAndamentosOAB] Erro ao marcar como lida:', error);
    }
  };

  const marcarTodasComoLidas = async () => {
    if (!processoOabId) return;

    try {
      await supabase
        .from('processos_oab_andamentos')
        .update({ lida: true })
        .eq('processo_oab_id', processoOabId)
        .eq('lida', false);

      // O real-time subscription ja vai atualizar o state
      toast({
        title: 'Andamentos marcados como lidos'
      });
    } catch (error: any) {
      console.error('[useAndamentosOAB] Erro:', error);
    }
  };

  return {
    andamentos,
    loading,
    fetchAndamentos,
    marcarComoLida,
    marcarTodasComoLidas
  };
};
