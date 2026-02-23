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

      const { data, error } = await supabase
        .from('processos_oab')
        .select(`
          *,
          processos_oab_andamentos!left(id, lida)
        `)
        .eq('tenant_id', tid)
        .order('ordem_lista', { ascending: true });

      if (error) throw error;

      const processosComContagem = (data || []).map((p: any) => {
        const andamentos = p.processos_oab_andamentos || [];
        const naoLidos = andamentos.filter((a: any) => a.lida === false).length;
        const { processos_oab_andamentos, ...processo } = p;
        return { ...processo, andamentos_nao_lidos: naoLidos } as ProcessoOAB;
      });

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
