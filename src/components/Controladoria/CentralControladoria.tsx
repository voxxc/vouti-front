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

  // Fetch total unread count for badge
  useEffect(() => {
    if (!tenantId) return;

    const fetchTotalNaoLidos = async () => {
      const { data } = await supabase
        .from('processos_oab')
        .select(`
          id,
          processos_oab_andamentos!left(id, lida)
        `)
        .eq('tenant_id', tenantId);

      if (data) {
        const total = data.reduce((acc, p) => {
          const naoLidos = (p.processos_oab_andamentos || [])
            .filter((a: any) => a.lida === false).length;
          return acc + naoLidos;
        }, 0);
        setTotalNaoLidos(total);
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
