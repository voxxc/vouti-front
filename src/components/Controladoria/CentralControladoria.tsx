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
      <div className="flex gap-6 border-b flex-shrink-0">
        <button
          onClick={() => setActiveTab('andamentos')}
          className={cn(
            "pb-2 text-sm font-medium transition-colors relative flex items-center gap-2",
            activeTab === 'andamentos'
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Andamentos Não Lidos
          {totalNaoLidos > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
              {totalNaoLidos > 999 ? '999+' : totalNaoLidos}
            </Badge>
          )}
          {activeTab === 'andamentos' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('prazos')}
          className={cn(
            "pb-2 text-sm font-medium transition-colors relative",
            activeTab === 'prazos'
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Prazos Concluídos
          {activeTab === 'prazos' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
        {isSolvenza && (
          <button
            onClick={() => setActiveTab('subtarefas')}
            className={cn(
              "pb-2 text-sm font-medium transition-colors relative flex items-center gap-2",
              activeTab === 'subtarefas'
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Subtarefas
            {totalSubtarefasPendentes > 0 && (
              <Badge className="h-5 min-w-5 px-1.5 bg-orange-500 hover:bg-orange-500 text-white border-transparent">
                {totalSubtarefasPendentes > 999 ? '999+' : totalSubtarefasPendentes}
              </Badge>
            )}
            {activeTab === 'subtarefas' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        )}
        <button
          onClick={() => setActiveTab('indicadores')}
          className={cn(
            "pb-2 text-sm font-medium transition-colors relative",
            activeTab === 'indicadores'
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Indicadores
          {activeTab === 'indicadores' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
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
