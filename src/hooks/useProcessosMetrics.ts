import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessosMetrics {
  totalProcessos: number;
  processosPorStatus: {
    em_andamento: number;
    suspenso: number;
    arquivado: number;
    finalizado: number;
  };
  processosPorPrioridade: {
    urgente: number;
    alta: number;
    media: number;
    baixa: number;
  };
  proximosPrazos: number;
  processosAtrasados: number;
}

export const useProcessosMetrics = () => {
  const [metrics, setMetrics] = useState<ProcessosMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const [processosRes, prazosRes] = await Promise.all([
        supabase
          .from('controladoria_processos')
          .select('status'),
        supabase
          .from('deadlines')
          .select('date, completed')
      ]);

      if (processosRes.error) throw processosRes.error;

      const processos = processosRes.data || [];
      const prazos = prazosRes.data || [];
      const totalProcessos = processos.length;

      // Contar por status
      const statusMap = new Map<string, number>();
      ['em_andamento', 'suspenso', 'arquivado', 'finalizado'].forEach(s => statusMap.set(s, 0));

      processos.forEach(processo => {
        if (processo.status) {
          statusMap.set(processo.status, (statusMap.get(processo.status) || 0) + 1);
        }
      });

      // Analisar prazos
      let proximosPrazos = 0;
      let processosAtrasados = 0;
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      prazos.forEach(prazo => {
        if (!prazo.completed && prazo.date) {
          const dueDate = new Date(prazo.date);
          dueDate.setHours(0, 0, 0, 0);
          
          const diffDias = Math.ceil((dueDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDias < 0) {
            processosAtrasados++;
          } else if (diffDias <= 7) {
            proximosPrazos++;
          }
        }
      });

      setMetrics({
        totalProcessos,
        processosPorStatus: {
          em_andamento: statusMap.get('em_andamento') || 0,
          suspenso: statusMap.get('suspenso') || 0,
          arquivado: statusMap.get('arquivado') || 0,
          finalizado: statusMap.get('finalizado') || 0,
        },
        processosPorPrioridade: {
          urgente: 0,
          alta: 0,
          media: 0,
          baixa: 0,
        },
        proximosPrazos,
        processosAtrasados,
      });
    } catch (error) {
      console.error('Erro ao buscar métricas de processos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return {
    metrics,
    loading,
    refreshMetrics: fetchMetrics,
  };
};
