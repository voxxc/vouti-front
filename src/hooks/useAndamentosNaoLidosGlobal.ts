import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { readAndamentosSnapshot } from "@/hooks/usePrefetchPages";

export interface ProcessoComNaoLidos {
  id: string;
  numero_cnj: string;
  parte_ativa: string | null;
  parte_passiva: string | null;
  tribunal_sigla: string | null;
  monitoramento_ativo: boolean;
  oab_id: string;
  capa_completa: any;
  andamentos_nao_lidos: number;
  ultima_movimentacao: string | null;
  oab: {
    id: string;
    oab_numero: string;
    oab_uf: string;
    nome_advogado: string | null;
  };
}

interface OABOption {
  id: string;
  label: string;
}

export const useAndamentosNaoLidosGlobal = () => {
  const { tenantId } = useTenantId();
  const [processos, setProcessos] = useState<ProcessoComNaoLidos[]>([]);
  const [loading, setLoading] = useState(true);
  const [oabs, setOabs] = useState<OABOption[]>([]);
  const [totalNaoLidos, setTotalNaoLidos] = useState(0);
  const processosRef = useRef<ProcessoComNaoLidos[]>([]);
  const hydratedRef = useRef(false);

  // Hidratação instantânea via snapshot do BackgroundPrefetcher
  useEffect(() => {
    if (!tenantId || hydratedRef.current) return;
    const snap = readAndamentosSnapshot(tenantId);
    if (snap) {
      setProcessos(snap.processos as ProcessoComNaoLidos[]);
      setOabs(snap.oabs);
      setTotalNaoLidos(snap.totalNaoLidos);
      setLoading(false);
      hydratedRef.current = true;
      console.log('[Andamentos] Hidratado do snapshot:', snap.processos.length, 'processos');
    }
  }, [tenantId]);

  // Keep ref in sync
  useEffect(() => {
    processosRef.current = processos;
  }, [processos]);

  const fetchProcessos = useCallback(async () => {
    if (!tenantId) return;

    if (!hydratedRef.current) {
      setLoading(true);
    }
    try {
      // Uma única RPC traz apenas processos com andamentos não lidos,
      // já com dados da OAB embutidos e ordenados por última movimentação.
      const { data, error } = await supabase
        .rpc('get_central_andamentos_nao_lidos', { p_tenant_id: tenantId });

      if (error) {
        console.error('Error fetching central andamentos:', error);
        return;
      }

      const oabsMap = new Map<string, OABOption>();
      const processosComNaoLidos: ProcessoComNaoLidos[] = (data || []).map((row: any) => {
        if (row.oab_id && !oabsMap.has(row.oab_id)) {
          oabsMap.set(row.oab_id, {
            id: row.oab_id,
            label: `${row.nome_advogado || 'Advogado'} (${row.oab_numero}/${row.oab_uf})`
          });
        }
        return {
          id: row.id,
          numero_cnj: row.numero_cnj,
          parte_ativa: row.parte_ativa,
          parte_passiva: row.parte_passiva,
          tribunal_sigla: row.tribunal_sigla,
          monitoramento_ativo: row.monitoramento_ativo,
          oab_id: row.oab_id,
          capa_completa: null,
          andamentos_nao_lidos: Number(row.andamentos_nao_lidos) || 0,
          ultima_movimentacao: row.ultima_movimentacao,
          oab: {
            id: row.oab_id,
            oab_numero: row.oab_numero,
            oab_uf: row.oab_uf,
            nome_advogado: row.nome_advogado,
          },
        };
      });

      setProcessos(processosComNaoLidos);
      setOabs(Array.from(oabsMap.values()));
      setTotalNaoLidos(processosComNaoLidos.reduce((acc, p) => acc + p.andamentos_nao_lidos, 0));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Initial fetch
  useEffect(() => {
    fetchProcessos();
  }, [fetchProcessos]);

  // Real-time subscription for andamentos changes
  useEffect(() => {
    if (!tenantId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchProcessos();
      }, 800);
    };

    const channel = supabase
      .channel('andamentos-nao-lidos-global')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processos_oab_andamentos'
        },
        () => scheduleRefetch()
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [tenantId, fetchProcessos]);

  const marcarTodosComoLidos = async (processoId: string) => {
    const { error } = await supabase
      .from('processos_oab_andamentos')
      .update({ lida: true })
      .eq('processo_oab_id', processoId)
      .eq('lida', false);

    if (!error) {
      setProcessos(prev => 
        prev.filter(p => p.id !== processoId)
      );
      setTotalNaoLidos(prev => {
        const processo = processosRef.current.find(p => p.id === processoId);
        return prev - (processo?.andamentos_nao_lidos || 0);
      });
    }

    return { error };
  };

  const marcarTodosGlobalComoLidos = async () => {
    const ids = processosRef.current.map(p => p.id);
    if (ids.length === 0) return { error: null };

    const { error } = await supabase
      .from('processos_oab_andamentos')
      .update({ lida: true })
      .in('processo_oab_id', ids)
      .eq('lida', false);

    if (!error) {
      setProcessos([]);
      setTotalNaoLidos(0);
    }

    return { error };
  };

  return {
    processos,
    loading,
    oabs,
    totalNaoLidos,
    refetch: fetchProcessos,
    marcarTodosComoLidos,
    marcarTodosGlobalComoLidos
  };
};
