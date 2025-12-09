import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getTenantIdForUser } from './useTenantId';

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
}

export const useOABs = () => {
  const [oabs, setOabs] = useState<OABCadastrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchOABs = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar tenant_id do usuario
      const tenantId = await getTenantIdForUser(user.id);
      
      // Verificar se usuario e admin ou controller
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      const isAdminOrController = roleData?.some(r => 
        r.role === 'admin' || r.role === 'controller'
      );

      let query = supabase
        .from('oabs_cadastradas')
        .select('*')
        .order('ordem', { ascending: true });

      if (isAdminOrController && tenantId) {
        // Admin/Controller ve TODAS as OABs do tenant
        query = query.eq('tenant_id', tenantId);
      } else {
        // Usuarios normais veem apenas suas proprias OABs
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
  }, [toast]);

  useEffect(() => {
    fetchOABs();
  }, [fetchOABs]);

  const cadastrarOAB = async (oabNumero: string, oabUf: string, nomeAdvogado?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      // Get tenant_id for the user
      const tenantId = await getTenantIdForUser(user.id);

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
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user ? await getTenantIdForUser(user.id) : null;

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

  const fetchProcessos = useCallback(async () => {
    if (!oabId) {
      setProcessos([]);
      return;
    }

    setLoading(true);
    try {
      // Buscar processos
      const { data: processosData, error } = await supabase
        .from('processos_oab')
        .select('*')
        .eq('oab_id', oabId)
        .order('ordem_lista', { ascending: true });

      if (error) throw error;

      // Buscar contagem de andamentos nao lidos para cada processo
      const processosComContagem = await Promise.all(
        (processosData || []).map(async (p) => {
          const { count } = await supabase
            .from('processos_oab_andamentos')
            .select('*', { count: 'exact', head: true })
            .eq('processo_oab_id', p.id)
            .eq('lida', false);

          return {
            ...p,
            andamentos_nao_lidos: count || 0
          } as ProcessoOAB;
        })
      );

      setProcessos(processosComContagem);
    } catch (error: any) {
      console.error('[useProcessosOAB] Erro:', error);
      toast({
        title: 'Erro ao carregar processos',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [oabId, toast]);

  useEffect(() => {
    fetchProcessos();
  }, [fetchProcessos]);

  const carregarDetalhes = async (processoId: string, numeroCnj: string, oabId?: string) => {
    setCarregandoDetalhes(processoId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user ? await getTenantIdForUser(user.id) : null;

      const { data, error } = await supabase.functions.invoke('judit-buscar-detalhes-processo', {
        body: { processoOabId: processoId, numeroCnj, tenantId, userId: user?.id, oabId }
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao carregar detalhes');
      }

      toast({
        title: 'Detalhes carregados',
        description: `${data.andamentosInseridos} novos andamentos`
      });

      await fetchProcessos();
      return data;
    } catch (error: any) {
      console.error('[useProcessosOAB] Erro ao carregar detalhes:', error);
      toast({
        title: 'Erro ao carregar detalhes',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setCarregandoDetalhes(null);
    }
  };

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

  const toggleMonitoramento = async (processoId: string, numeroCnj: string, ativar: boolean, oabId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user ? await getTenantIdForUser(user.id) : null;

      const { data, error } = await supabase.functions.invoke('judit-ativar-monitoramento-oab', {
        body: { processoOabId: processoId, numeroCnj, ativar, tenantId, userId: user?.id, oabId }
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao alterar monitoramento');
      }

      toast({
        title: ativar ? 'Monitoramento ativado' : 'Monitoramento desativado',
        description: ativar 
          ? 'Voce recebera atualizacoes diarias' 
          : 'Historico de andamentos mantido'
      });

      await fetchProcessos();
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

  // Consultar request existente de detalhes (GRATUITO - apenas GET)
  const consultarDetalhesRequest = async (processoId: string, requestId: string) => {
    setCarregandoDetalhes(processoId);
    try {
      // Buscar tenantId para log de auditoria
      const { data: { user } } = await supabase.auth.getUser();
      const userTenantId = user ? await getTenantIdForUser(user.id) : null;
      
      const { data, error } = await supabase.functions.invoke('judit-consultar-detalhes-request', {
        body: { processoOabId: processoId, requestId, tenantId: userTenantId, userId: user?.id }
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao consultar');
      }

      toast({
        title: 'Andamentos atualizados',
        description: `${data.andamentosInseridos} novos andamentos`
      });

      await fetchProcessos();
      return data;
    } catch (error: any) {
      console.error('[useProcessosOAB] Erro ao consultar detalhes:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setCarregandoDetalhes(null);
    }
  };

  return {
    processos,
    loading,
    carregandoDetalhes,
    fetchProcessos,
    carregarDetalhes,
    atualizarOrdem,
    toggleMonitoramento,
    consultarDetalhesRequest
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
        .order('data_movimentacao', { ascending: false });

      if (error) throw error;
      setAndamentos((data as AndamentoOAB[]) || []);
    } catch (error: any) {
      console.error('[useAndamentosOAB] Erro:', error);
    } finally {
      setLoading(false);
    }
  }, [processoOabId]);

  useEffect(() => {
    fetchAndamentos();
  }, [fetchAndamentos]);

  const marcarComoLida = async (andamentoId: string) => {
    try {
      await supabase
        .from('processos_oab_andamentos')
        .update({ lida: true })
        .eq('id', andamentoId);

      setAndamentos(prev => 
        prev.map(a => a.id === andamentoId ? { ...a, lida: true } : a)
      );
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

      setAndamentos(prev => prev.map(a => ({ ...a, lida: true })));
      
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
