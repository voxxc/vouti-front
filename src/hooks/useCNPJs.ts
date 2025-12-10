import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CNPJCadastrado {
  id: string;
  cnpj: string;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  totalProcessos: number;
  ultimaSincronizacao: string | null;
  ultimoRequestId: string | null;
  requestIdData: string | null;
}

export interface ProcessoCNPJ {
  id: string;
  cnpjId: string;
  numeroCnj: string;
  parteTipo: string | null;
  parteAtiva: string | null;
  partePassiva: string | null;
  partesCompletas: any;
  tribunal: string | null;
  tribunalSigla: string | null;
  estado: string | null;
  cidade: string | null;
  juizo: string | null;
  instancia: string | null;
  statusProcessual: string | null;
  faseProcessual: string | null;
  valorCausa: number | null;
  dataDistribuicao: string | null;
  areaDireito: string | null;
  assunto: string | null;
  classificacao: string | null;
  linkTribunal: string | null;
  ultimoAndamento: string | null;
  ultimoAndamentoData: string | null;
  capaCompleta: any;
  detalhesRequestId: string | null;
  monitoramentoAtivo: boolean;
  trackingId: string | null;
  importadoManualmente: boolean;
  ordem: number | null;
  andamentosNaoLidos?: number;
}

export const useCNPJs = () => {
  const { user, userRole, tenantId } = useAuth();
  const [cnpjs, setCnpjs] = useState<CNPJCadastrado[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCNPJs = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('cnpjs_cadastrados')
        .select('*')
        .order('ordem', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      // Admins e controllers veem todos os CNPJs do tenant
      if ((userRole === 'admin' || userRole === 'controller') && tenantId) {
        query = query.eq('tenant_id', tenantId);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted: CNPJCadastrado[] = (data || []).map((item: any) => ({
        id: item.id,
        cnpj: item.cnpj,
        razaoSocial: item.razao_social,
        nomeFantasia: item.nome_fantasia,
        totalProcessos: item.total_processos || 0,
        ultimaSincronizacao: item.ultima_sincronizacao,
        ultimoRequestId: item.ultimo_request_id,
        requestIdData: item.request_id_data,
      }));

      setCnpjs(formatted);
    } catch (error: any) {
      console.error('Erro ao buscar CNPJs:', error);
      toast.error('Erro ao carregar CNPJs');
    } finally {
      setLoading(false);
    }
  }, [user, userRole, tenantId]);

  useEffect(() => {
    fetchCNPJs();
  }, [fetchCNPJs]);

  const cadastrarCNPJ = async (cnpj: string, razaoSocial?: string, nomeFantasia?: string) => {
    if (!user) return;

    try {
      const cnpjLimpo = cnpj.replace(/\D/g, '');

      const { error } = await supabase.from('cnpjs_cadastrados').insert({
        cnpj: cnpjLimpo,
        razao_social: razaoSocial || null,
        nome_fantasia: nomeFantasia || null,
        user_id: user.id,
        tenant_id: tenantId,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('Este CNPJ ja esta cadastrado');
        } else {
          throw error;
        }
        return;
      }

      toast.success('CNPJ cadastrado com sucesso');
      await fetchCNPJs();
    } catch (error: any) {
      console.error('Erro ao cadastrar CNPJ:', error);
      toast.error('Erro ao cadastrar CNPJ');
    }
  };

  const sincronizarCNPJ = async (cnpjId: string, cnpj: string) => {
    try {
      toast.info('Iniciando sincronizacao...');

      const { data, error } = await supabase.functions.invoke('judit-sincronizar-cnpj', {
        body: { cnpjId, cnpj },
      });

      if (error) throw error;

      if (data.processosEncontrados > 0) {
        toast.success(`Encontrados ${data.processosEncontrados} processos`);
      } else {
        toast.info('Busca iniciada, aguarde processamento');
      }

      await fetchCNPJs();
      return data;
    } catch (error: any) {
      console.error('Erro ao sincronizar CNPJ:', error);
      toast.error('Erro ao sincronizar CNPJ');
      throw error;
    }
  };

  const removerCNPJ = async (cnpjId: string) => {
    try {
      const { error } = await supabase
        .from('cnpjs_cadastrados')
        .delete()
        .eq('id', cnpjId);

      if (error) throw error;

      toast.success('CNPJ removido com sucesso');
      await fetchCNPJs();
    } catch (error: any) {
      console.error('Erro ao remover CNPJ:', error);
      toast.error('Erro ao remover CNPJ');
    }
  };

  const consultarRequest = async (cnpjId: string, requestId: string) => {
    try {
      toast.info('Consultando processos...');

      const { data, error } = await supabase.functions.invoke('judit-consultar-request-cnpj', {
        body: { cnpjId, requestId },
      });

      if (error) throw error;

      if (data.processosEncontrados > 0) {
        toast.success(`Encontrados ${data.processosEncontrados} processos`);
      } else {
        toast.info('Nenhum processo encontrado');
      }

      await fetchCNPJs();
      return data;
    } catch (error: any) {
      console.error('Erro ao consultar request:', error);
      toast.error('Erro ao consultar request');
      throw error;
    }
  };

  const salvarRequestId = async (cnpjId: string, requestId: string) => {
    try {
      const { error } = await supabase
        .from('cnpjs_cadastrados')
        .update({
          ultimo_request_id: requestId,
          request_id_data: new Date().toISOString(),
        })
        .eq('id', cnpjId);

      if (error) throw error;

      toast.success('Request ID salvo com sucesso');
      await fetchCNPJs();
    } catch (error: any) {
      console.error('Erro ao salvar request ID:', error);
      toast.error('Erro ao salvar request ID');
    }
  };

  return {
    cnpjs,
    loading,
    fetchCNPJs,
    cadastrarCNPJ,
    sincronizarCNPJ,
    removerCNPJ,
    consultarRequest,
    salvarRequestId,
  };
};

export const useProcessosCNPJ = (cnpjId: string | null) => {
  const [processos, setProcessos] = useState<ProcessoCNPJ[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProcessos = useCallback(async () => {
    if (!cnpjId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('processos_cnpj')
        .select('*')
        .eq('cnpj_id', cnpjId)
        .order('ordem', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar contagem de andamentos nao lidos
      const processosIds = (data || []).map((p: any) => p.id);
      
      let andamentosNaoLidosMap: Record<string, number> = {};
      
      if (processosIds.length > 0) {
        const { data: andamentosData } = await supabase
          .from('processos_cnpj_andamentos')
          .select('processo_cnpj_id')
          .in('processo_cnpj_id', processosIds)
          .eq('lida', false);

        if (andamentosData) {
          andamentosData.forEach((a: any) => {
            andamentosNaoLidosMap[a.processo_cnpj_id] = 
              (andamentosNaoLidosMap[a.processo_cnpj_id] || 0) + 1;
          });
        }
      }

      const formatted: ProcessoCNPJ[] = (data || []).map((item: any) => ({
        id: item.id,
        cnpjId: item.cnpj_id,
        numeroCnj: item.numero_cnj,
        parteTipo: item.parte_tipo,
        parteAtiva: item.parte_ativa,
        partePassiva: item.parte_passiva,
        partesCompletas: item.partes_completas,
        tribunal: item.tribunal,
        tribunalSigla: item.tribunal_sigla,
        estado: item.estado,
        cidade: item.cidade,
        juizo: item.juizo,
        instancia: item.instancia,
        statusProcessual: item.status_processual,
        faseProcessual: item.fase_processual,
        valorCausa: item.valor_causa,
        dataDistribuicao: item.data_distribuicao,
        areaDireito: item.area_direito,
        assunto: item.assunto,
        classificacao: item.classificacao,
        linkTribunal: item.link_tribunal,
        ultimoAndamento: item.ultimo_andamento,
        ultimoAndamentoData: item.ultimo_andamento_data,
        capaCompleta: item.capa_completa,
        detalhesRequestId: item.detalhes_request_id,
        monitoramentoAtivo: item.monitoramento_ativo || false,
        trackingId: item.tracking_id,
        importadoManualmente: item.importado_manualmente || false,
        ordem: item.ordem,
        andamentosNaoLidos: andamentosNaoLidosMap[item.id] || 0,
      }));

      setProcessos(formatted);
    } catch (error: any) {
      console.error('Erro ao buscar processos CNPJ:', error);
      toast.error('Erro ao carregar processos');
    } finally {
      setLoading(false);
    }
  }, [cnpjId]);

  useEffect(() => {
    fetchProcessos();
  }, [fetchProcessos]);

  return {
    processos,
    loading,
    fetchProcessos,
  };
};
