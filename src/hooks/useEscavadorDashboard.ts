import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EscavadorStats {
  totalProcessos: number;
  processosMonitorados: number;
  processosNaoMonitorados: number;
  atualizacoesRecentes24h: number;
  atualizacoesRecentes7d: number;
  atualizacoesRecentes30d: number;
  ultimaConsultaRecorrente: string | null;
  proximaConsultaRecorrente: Date;
}

interface ProcessoMonitorado {
  id: string;
  processo_id: string;
  numero_processo: string;
  monitoramento_ativo: boolean;
  ultima_consulta: string | null;
  total_atualizacoes: number;
  atualizacoes_nao_lidas: number;
}

export const useEscavadorDashboard = () => {
  const [stats, setStats] = useState<EscavadorStats>({
    totalProcessos: 0,
    processosMonitorados: 0,
    processosNaoMonitorados: 0,
    atualizacoesRecentes24h: 0,
    atualizacoesRecentes7d: 0,
    atualizacoesRecentes30d: 0,
    ultimaConsultaRecorrente: null,
    proximaConsultaRecorrente: getProximaConsultaRecorrente()
  });
  const [processosMonitorados, setProcessosMonitorados] = useState<ProcessoMonitorado[]>([]);
  const [loading, setLoading] = useState(true);

  function getProximaConsultaRecorrente(): Date {
    const hoje = new Date();
    const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1, 3, 0, 0);
    return proximoMes;
  }

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Stats gerais
      const { data: processosData } = await supabase
        .from('processos')
        .select('id');

      const { data: monitoramentoData } = await supabase
        .from('processo_monitoramento_escavador')
        .select('monitoramento_ativo, total_atualizacoes');

      // Atualizações recentes
      const now = new Date();
      const ontem = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const semanaPassada = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const mesPassado = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const { count: count24h } = await supabase
        .from('processo_atualizacoes_escavador')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', ontem.toISOString())
        .eq('lida', false);

      const { count: count7d } = await supabase
        .from('processo_atualizacoes_escavador')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', semanaPassada.toISOString())
        .eq('lida', false);

      const { count: count30d } = await supabase
        .from('processo_atualizacoes_escavador')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', mesPassado.toISOString())
        .eq('lida', false);

      const totalProcessos = processosData?.length || 0;
      const processosMonitorados = monitoramentoData?.filter(m => m.monitoramento_ativo).length || 0;

      setStats({
        totalProcessos,
        processosMonitorados,
        processosNaoMonitorados: totalProcessos - processosMonitorados,
        atualizacoesRecentes24h: count24h || 0,
        atualizacoesRecentes7d: count7d || 0,
        atualizacoesRecentes30d: count30d || 0,
        ultimaConsultaRecorrente: null,
        proximaConsultaRecorrente: getProximaConsultaRecorrente()
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProcessosMonitorados = async () => {
    try {
      const { data, error } = await supabase
        .from('processo_monitoramento_escavador')
        .select(`
          id,
          processo_id,
          monitoramento_ativo,
          ultima_consulta,
          total_atualizacoes,
          processos!inner(numero_processo)
        `)
        .order('ultima_consulta', { ascending: false });

      if (error) throw error;

      // Buscar contagem de não lidas para cada processo
      const processosComNaoLidas = await Promise.all(
        (data || []).map(async (m: any) => {
          const { count } = await supabase
            .from('processo_atualizacoes_escavador')
            .select('*', { count: 'exact', head: true })
            .eq('processo_id', m.processo_id)
            .eq('lida', false);

          return {
            id: m.id,
            processo_id: m.processo_id,
            numero_processo: m.processos.numero_processo,
            monitoramento_ativo: m.monitoramento_ativo,
            ultima_consulta: m.ultima_consulta,
            total_atualizacoes: m.total_atualizacoes,
            atualizacoes_nao_lidas: count || 0
          };
        })
      );

      setProcessosMonitorados(processosComNaoLidas);
    } catch (error) {
      console.error('Erro ao carregar processos monitorados:', error);
    }
  };

  const ativarMonitoramento = async (processoId: string) => {
    try {
      const { error } = await supabase.functions.invoke('escavador-ativar-monitoramento', {
        body: { processoId }
      });

      if (error) throw error;

      toast.success('Monitoramento ativado com sucesso!');
      fetchStats();
      fetchProcessosMonitorados();
    } catch (error: any) {
      console.error('Erro ao ativar monitoramento:', error);
      toast.error('Erro ao ativar monitoramento');
    }
  };

  const desativarMonitoramento = async (processoId: string) => {
    try {
      const { error } = await supabase
        .from('processo_monitoramento_escavador')
        .update({ monitoramento_ativo: false })
        .eq('processo_id', processoId);

      if (error) throw error;

      toast.success('Monitoramento desativado');
      fetchStats();
      fetchProcessosMonitorados();
    } catch (error: any) {
      console.error('Erro ao desativar monitoramento:', error);
      toast.error('Erro ao desativar monitoramento');
    }
  };

  useEffect(() => {
    fetchStats();
    fetchProcessosMonitorados();

    // Realtime para atualizações
    const channel = supabase
      .channel('escavador_dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processo_monitoramento_escavador'
        },
        () => {
          fetchStats();
          fetchProcessosMonitorados();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    stats,
    processosMonitorados,
    loading,
    ativarMonitoramento,
    desativarMonitoramento,
    refetch: () => {
      fetchStats();
      fetchProcessosMonitorados();
    }
  };
};
