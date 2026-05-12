import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseLocalDate } from '@/lib/dateUtils';
import { useTenantId } from '@/hooks/useTenantId';
import { fetchAllPaginated } from '@/lib/supabasePagination';

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

const fetchProcessosMetrics = async (tenantId: string): Promise<ProcessosMetrics> => {
  const [processosRes, prazosRes, oabsRes] = await Promise.all([
    fetchAllPaginated<{ id: string; monitoramento_ativo: boolean | null; detalhes_request_id: string | null }>(
      () => supabase
        .from('processos_oab')
        .select('id, monitoramento_ativo, detalhes_request_id')
        .eq('tenant_id', tenantId)
        .order('id', { ascending: true })
    ),
    fetchAllPaginated<{ date: string | null; completed: boolean | null }>(
      () => supabase
        .from('deadlines')
        .select('date, completed')
        .eq('tenant_id', tenantId)
        .order('id', { ascending: true })
    ),
    fetchAllPaginated<{ id: string }>(
      () => supabase
        .from('oabs_cadastradas')
        .select('id')
        .eq('tenant_id', tenantId)
        .order('id', { ascending: true })
    ),
  ]);

  const processos = processosRes.data || [];
  const prazos = prazosRes.data || [];
  const oabs = oabsRes.data || [];

  const processoIds = processos.map(p => p.id);

  // Total andamentos: contagem rápida sem baixar linhas (evita limite de 1000).
  let totalAndamentos = 0;
  let andamentosRecentes = 0;
  if (processoIds.length > 0) {
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    // Quebrar em chunks para evitar URL muito longa no .in()
    const CHUNK = 200;
    for (let i = 0; i < processoIds.length; i += CHUNK) {
      const chunk = processoIds.slice(i, i + CHUNK);
      const [totalRes, recentesRes] = await Promise.all([
        supabase
          .from('processos_oab_andamentos')
          .select('id', { count: 'exact', head: true })
          .in('processo_oab_id', chunk),
        supabase
          .from('processos_oab_andamentos')
          .select('id', { count: 'exact', head: true })
          .in('processo_oab_id', chunk)
          .gte('created_at', seteDiasAtras.toISOString()),
      ]);
      totalAndamentos += totalRes.count ?? 0;
      andamentosRecentes += recentesRes.count ?? 0;
    }
  }

  // Analisar prazos
  let proximosPrazos = 0;
  let processosAtrasados = 0;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  prazos.forEach(prazo => {
    if (!prazo.completed && prazo.date) {
      const dueDate = parseLocalDate(prazo.date);
      dueDate.setHours(0, 0, 0, 0);
      const diffDias = Math.ceil((dueDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDias < 0) processosAtrasados++;
      else if (diffDias <= 7) proximosPrazos++;
    }
  });

  return {
    totalProcessos: processos.length,
    processosMonitorando: processos.filter(p => p.monitoramento_ativo).length,
    processosComDetalhes: processos.filter(p => p.detalhes_request_id).length,
    totalAndamentos,
    andamentosRecentes,
    totalOABs: oabs.length,
    proximosPrazos,
    processosAtrasados,
  };
};

export const useProcessosMetrics = () => {
  const { tenantId } = useTenantId();

  const { data: metrics, isLoading: loading, refetch } = useQuery({
    queryKey: ['processos-metrics', tenantId],
    queryFn: () => fetchProcessosMetrics(tenantId!),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
    gcTime: 10 * 60 * 1000, // 10 minutos no garbage collector
  });

  return {
    metrics: metrics ?? null,
    loading,
    refreshMetrics: refetch,
  };
};
