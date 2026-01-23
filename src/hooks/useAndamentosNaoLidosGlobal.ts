import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";

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

  // Keep ref in sync
  useEffect(() => {
    processosRef.current = processos;
  }, [processos]);

  const fetchProcessos = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      // Fetch all processes with their andamentos
      const { data, error } = await supabase
        .from('processos_oab')
        .select(`
          id,
          numero_cnj,
          parte_ativa,
          parte_passiva,
          tribunal_sigla,
          monitoramento_ativo,
          oab_id,
          capa_completa,
          oabs_cadastradas!inner(
            id,
            oab_numero,
            oab_uf,
            nome_advogado
          ),
          processos_oab_andamentos!left(
            id,
            lida
          )
        `)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching processos:', error);
        return;
      }

      // Extract unique OABs for filter dropdown
      const oabsMap = new Map<string, OABOption>();
      
      // Process data and calculate unread counts
      const processosComNaoLidos = (data || [])
        .map((p: any) => {
          const oabData = p.oabs_cadastradas;
          
          // Add to OABs map
          if (oabData && !oabsMap.has(oabData.id)) {
            oabsMap.set(oabData.id, {
              id: oabData.id,
              label: `${oabData.nome_advogado || 'Advogado'} (${oabData.oab_numero}/${oabData.oab_uf})`
            });
          }

          const naoLidos = (p.processos_oab_andamentos || [])
            .filter((a: any) => a.lida === false).length;

          return {
            id: p.id,
            numero_cnj: p.numero_cnj,
            parte_ativa: p.parte_ativa,
            parte_passiva: p.parte_passiva,
            tribunal_sigla: p.tribunal_sigla,
            monitoramento_ativo: p.monitoramento_ativo,
            oab_id: p.oab_id,
            capa_completa: p.capa_completa,
            andamentos_nao_lidos: naoLidos,
            oab: oabData ? {
              id: oabData.id,
              oab_numero: oabData.oab_numero,
              oab_uf: oabData.oab_uf,
              nome_advogado: oabData.nome_advogado
            } : null
          } as ProcessoComNaoLidos;
        })
        .filter((p: ProcessoComNaoLidos) => p.andamentos_nao_lidos > 0 && p.oab)
        .sort((a: ProcessoComNaoLidos, b: ProcessoComNaoLidos) => b.andamentos_nao_lidos - a.andamentos_nao_lidos);

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

    const channel = supabase
      .channel('andamentos-nao-lidos-global')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'processos_oab_andamentos'
        },
        async (payload) => {
          const processoOabId = payload.new.processo_oab_id;
          
          // Recalculate unread count for this processo
          const { data, error } = await supabase
            .from('processos_oab_andamentos')
            .select('id')
            .eq('processo_oab_id', processoOabId)
            .eq('lida', false);

          if (!error) {
            const newCount = data?.length || 0;
            
            setProcessos(prev => {
              const updated = prev.map(p => 
                p.id === processoOabId 
                  ? { ...p, andamentos_nao_lidos: newCount }
                  : p
              ).filter(p => p.andamentos_nao_lidos > 0)
                .sort((a, b) => b.andamentos_nao_lidos - a.andamentos_nao_lidos);
              
              // Update total
              setTotalNaoLidos(updated.reduce((acc, p) => acc + p.andamentos_nao_lidos, 0));
              
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

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

  return {
    processos,
    loading,
    oabs,
    totalNaoLidos,
    refetch: fetchProcessos,
    marcarTodosComoLidos
  };
};
