import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { CentralPrazosConcluidos } from "./CentralPrazosConcluidos";
import { CentralAndamentosNaoLidos } from "./CentralAndamentosNaoLidos";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { cn } from "@/lib/utils";

type TabValue = 'andamentos' | 'prazos';

export const CentralControladoria = () => {
  const { tenantId } = useTenantId();
  const [activeTab, setActiveTab] = useState<TabValue>('andamentos');
  const [totalNaoLidos, setTotalNaoLidos] = useState(0);

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
    </div>
  );
};
