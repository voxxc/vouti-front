import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { CentralPrazosConcluidos } from "./CentralPrazosConcluidos";
import { CentralAndamentosNaoLidos } from "./CentralAndamentosNaoLidos";
import { CentralSubtarefas } from "./CentralSubtarefas";
import { ControladoriaIndicadores } from "./ControladoriaIndicadores";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { cn } from "@/lib/utils";

type TabValue = 'andamentos' | 'prazos' | 'subtarefas' | 'indicadores';

export const CentralControladoria = () => {
  const { tenantId } = useTenantId();
  const { tenantSlug } = useTenantNavigation();
  const [activeTab, setActiveTab] = useState<TabValue>('andamentos');
  const [totalNaoLidos, setTotalNaoLidos] = useState(0);
  const [totalSubtarefasPendentes, setTotalSubtarefasPendentes] = useState(0);

  const isSolvenza = tenantSlug === 'solvenza';

  // Fetch total unread count for badge using RPC
  useEffect(() => {
    if (!tenantId) return;

    const fetchTotalNaoLidos = async () => {
      const { data, error } = await supabase
        .rpc('get_total_andamentos_nao_lidos', { p_tenant_id: tenantId });

      if (!error && data !== null) {
        setTotalNaoLidos(data);
      }
    };

    fetchTotalNaoLidos();

    // Subscribe to changes
    const channel = supabase
      .channel('central-badge-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processos_oab_andamentos'
        },
        () => {
          fetchTotalNaoLidos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  // Fetch subtarefas pendentes count (only for Solvenza)
  useEffect(() => {
    if (!tenantId || !isSolvenza) return;

    const fetchSubtarefasPendentes = async () => {
      const { count, error } = await supabase
        .from('deadline_subtarefas')
        .select('id, deadlines!inner(tenant_id, completed)', { count: 'exact', head: true })
        .eq('deadlines.tenant_id', tenantId)
        .eq('deadlines.completed', true)
        .eq('concluida', false);

      if (!error && count !== null) {
        setTotalSubtarefasPendentes(count);
      }
    };

    fetchSubtarefasPendentes();

    const channel = supabase
      .channel('central-subtarefas-badge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deadline_subtarefas'
        },
        () => {
          fetchSubtarefasPendentes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, isSolvenza]);

  return (
    <div className="flex-1 flex flex-col space-y-4">
      <div className="apple-tab-bar">
        <button
          onClick={() => setActiveTab('andamentos')}
          data-active={activeTab === 'andamentos'}
          className="apple-tab"
        >
          Andamentos Não Lidos
          {totalNaoLidos > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 rounded-full">
              {totalNaoLidos > 999 ? '999+' : totalNaoLidos}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab('prazos')}
          data-active={activeTab === 'prazos'}
          className="apple-tab"
        >
          Prazos Concluídos
        </button>
        {isSolvenza && (
          <button
            onClick={() => setActiveTab('subtarefas')}
            data-active={activeTab === 'subtarefas'}
            className="apple-tab"
          >
            Subtarefas
            {totalSubtarefasPendentes > 0 && (
              <Badge className="h-5 min-w-5 px-1.5 rounded-full bg-[hsl(var(--chart-3))] hover:bg-[hsl(var(--chart-3))] text-white border-transparent">
                {totalSubtarefasPendentes > 999 ? '999+' : totalSubtarefasPendentes}
              </Badge>
            )}
          </button>
        )}
        <button
          onClick={() => setActiveTab('indicadores')}
          data-active={activeTab === 'indicadores'}
          className="apple-tab"
        >
          Indicadores
        </button>
      </div>

      {activeTab === 'andamentos' && (
        <div className="flex-1 min-h-0">
          <CentralAndamentosNaoLidos />
        </div>
      )}

      {activeTab === 'prazos' && (
        <div className="flex-1 min-h-0">
          <CentralPrazosConcluidos />
        </div>
      )}

      {activeTab === 'subtarefas' && isSolvenza && (
        <div className="flex-1 min-h-0">
          <CentralSubtarefas />
        </div>
      )}

      {activeTab === 'indicadores' && (
        <div className="flex-1 min-h-0">
          <ControladoriaIndicadores />
        </div>
      )}
    </div>
  );
};
