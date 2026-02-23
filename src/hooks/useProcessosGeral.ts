import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getTenantIdForUser } from './useTenantId';
import { ProcessoOAB } from './useOABs';

const deduplicar = (processos: ProcessoOAB[]): ProcessoOAB[] => {
  const mapa = new Map<string, ProcessoOAB>();
  processos.forEach(p => {
    const existente = mapa.get(p.numero_cnj);
    if (!existente || 
        (!existente.detalhes_carregados && p.detalhes_carregados) ||
        (!existente.monitoramento_ativo && p.monitoramento_ativo)) {
      mapa.set(p.numero_cnj, p);
    }
  });
  return Array.from(mapa.values());
};

export const useProcessosGeral = () => {
  const [processos, setProcessos] = useState<ProcessoOAB[]>([]);
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProcessos = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tid = await getTenantIdForUser(user.id);
      setTenantId(tid);
      if (!tid) return;

      // Query 1: buscar processos sem join (rápido)
      const { data: processosData, error } = await supabase
        .from('processos_oab')
        .select('*')
        .eq('tenant_id', tid)
        .order('ordem_lista', { ascending: true });

      if (error) throw error;

      // Query 2: buscar apenas andamentos não lidos (leve)
      const { data: naoLidosData } = await supabase
        .from('processos_oab_andamentos')
        .select('processo_oab_id')
        .eq('lida', false);

      // Montar mapa de contagens
      const naoLidosMap = new Map<string, number>();
      (naoLidosData || []).forEach((a: any) => {
        naoLidosMap.set(a.processo_oab_id, 
          (naoLidosMap.get(a.processo_oab_id) || 0) + 1);
      });

      const processosComContagem = (processosData || []).map((p: any) => ({
        ...p,
        andamentos_nao_lidos: naoLidosMap.get(p.id) || 0,
      })) as ProcessoOAB[];

      setProcessos(deduplicar(processosComContagem));
    } catch (error: any) {
      console.error('[useProcessosGeral] Erro:', error);
      toast({
        title: 'Erro ao carregar processos',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProcessos();
  }, [fetchProcessos]);

  // Real-time subscription
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`processos-geral-${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'processos_oab' },
        () => { fetchProcessos(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId, fetchProcessos]);

  return { processos, loading, fetchProcessos };
};
