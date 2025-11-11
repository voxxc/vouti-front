import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProcessoMonitoramentoEscavador, ProcessoAtualizacaoEscavador } from '@/types/escavador';

export const useEscavadorMonitoramento = (processoId: string) => {
  const [monitoramento, setMonitoramento] = useState<ProcessoMonitoramentoEscavador | null>(null);
  const [atualizacoes, setAtualizacoes] = useState<ProcessoAtualizacaoEscavador[]>([]);
  const [loading, setLoading] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [ativando, setAtivando] = useState(false);

  const fetchMonitoramento = async () => {
    if (!processoId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('processo_monitoramento_escavador')
        .select('*')
        .eq('processo_id', processoId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setMonitoramento(data);
    } catch (error: any) {
      console.error('Erro ao carregar monitoramento:', error);
      toast.error('Erro ao carregar dados do monitoramento');
    } finally {
      setLoading(false);
    }
  };

  const fetchAtualizacoes = async () => {
    if (!processoId) return;
    
    try {
      const { data, error } = await supabase
        .from('processo_atualizacoes_escavador')
        .select('*')
        .eq('processo_id', processoId)
        .order('data_evento', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAtualizacoes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar atualizações:', error);
    }
  };

  const consultarProcesso = async (numeroProcesso: string) => {
    try {
      setConsultando(true);
      const { data, error } = await supabase.functions.invoke('escavador-consulta', {
        body: { processoId, numeroProcesso }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Processo consultado com sucesso!');
        await fetchMonitoramento();
        await fetchAtualizacoes(); // Buscar atualizações também
        return data.data;
      } else {
        toast.error(data.message || 'Erro ao consultar processo', {
          description: data.details?.sugestao || 'Verifique se o processo existe no Escavador',
          duration: 6000
        });
        return null;
      }
    } catch (error: any) {
      console.error('Erro ao consultar processo:', error);
      toast.error('Erro ao consultar processo no Escavador');
      throw error;
    } finally {
      setConsultando(false);
    }
  };

  const ativarMonitoramento = async () => {
    if (!monitoramento?.escavador_id) {
      toast.error('Consulte o processo primeiro');
      return;
    }

    try {
      setAtivando(true);
      const { data, error } = await supabase.functions.invoke('escavador-ativar-monitoramento', {
        body: { 
          processoId, 
          escavadorId: monitoramento.escavador_id 
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Monitoramento ativado! Você receberá notificações de atualizações.');
        await fetchMonitoramento();
      } else {
        toast.error(data.error || 'Erro ao ativar monitoramento');
      }
    } catch (error: any) {
      console.error('Erro ao ativar monitoramento:', error);
      toast.error('Erro ao ativar monitoramento');
      throw error;
    } finally {
      setAtivando(false);
    }
  };

  const marcarAtualizacaoLida = async (atualizacaoId: string) => {
    try {
      const { error } = await supabase
        .from('processo_atualizacoes_escavador')
        .update({ lida: true })
        .eq('id', atualizacaoId);

      if (error) throw error;
      await fetchAtualizacoes();
    } catch (error: any) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  useEffect(() => {
    fetchMonitoramento();
    fetchAtualizacoes();

    // Realtime para atualizações
    const channel = supabase
      .channel(`processo_atualizacoes_${processoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processo_atualizacoes_escavador',
          filter: `processo_id=eq.${processoId}`
        },
        () => {
          fetchAtualizacoes();
          fetchMonitoramento();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [processoId]);

  return {
    monitoramento,
    atualizacoes,
    loading,
    consultando,
    ativando,
    consultarProcesso,
    ativarMonitoramento,
    marcarAtualizacaoLida,
    refetch: () => {
      fetchMonitoramento();
      fetchAtualizacoes();
    }
  };
};
