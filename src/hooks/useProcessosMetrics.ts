import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';

export interface ProcessosMetrics {
  totalProcessos: number;
  processosMonitorando: number;
  processosComDetalhes: number;
  totalAndamentos: number;
  andamentosRecentes: number;
  totalOABs: number;
  proximosPrazos: number;
  processosAtrasados: number;
}

export const useProcessosMetrics = () => {
  const [metrics, setMetrics] = useState<ProcessosMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const { tenantId } = useTenantId();

  const fetchMetrics = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const [processosRes, andamentosRes, prazosRes, oabsRes] = await Promise.all([
        supabase
          .from('processos_oab')
          .select('id, monitoramento_ativo, detalhes_request_id')
          .eq('tenant_id', tenantId),
        supabase
          .from('processos_oab_andamentos')
          .select('id, created_at, processo_oab_id'),
        supabase
          .from('deadlines')
          .select('date, completed')
          .eq('tenant_id', tenantId),
        supabase
          .from('oabs_cadastradas')
          .select('id')
          .eq('tenant_id', tenantId)
      ]);

      const processos = processosRes.data || [];
      const andamentos = andamentosRes.data || [];
      const prazos = prazosRes.data || [];
      const oabs = oabsRes.data || [];

      // Filtrar andamentos apenas dos processos do tenant
      const processoIds = new Set(processos.map(p => p.id));
      const andamentosTenant = andamentos.filter(a => processoIds.has(a.processo_oab_id));

      // Calcular andamentos recentes (ultimos 7 dias)
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      const andamentosRecentes = andamentosTenant.filter(a => 
        a.created_at && new Date(a.created_at) >= seteDiasAtras
      ).length;

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
          if (diffDias < 0) processosAtrasados++;
          else if (diffDias <= 7) proximosPrazos++;
        }
      });

      setMetrics({
        totalProcessos: processos.length,
        processosMonitorando: processos.filter(p => p.monitoramento_ativo).length,
        processosComDetalhes: processos.filter(p => p.detalhes_request_id).length,
        totalAndamentos: andamentosTenant.length,
        andamentosRecentes,
        totalOABs: oabs.length,
        proximosPrazos,
        processosAtrasados,
      });
    } catch (error) {
      console.error('Erro ao buscar metricas de processos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [tenantId]);

  return {
    metrics,
    loading,
    refreshMetrics: fetchMetrics,
  };
};
