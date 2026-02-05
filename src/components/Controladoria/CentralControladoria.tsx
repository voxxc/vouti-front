import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Bell } from "lucide-react";
import { CentralPrazosConcluidos } from "./CentralPrazosConcluidos";
import { CentralAndamentosNaoLidos } from "./CentralAndamentosNaoLidos";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";

export const CentralControladoria = () => {
  const { tenantId } = useTenantId();
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
    <Tabs defaultValue="andamentos" className="flex-1 flex flex-col space-y-4">
      <TabsList className="flex-shrink-0">
        <TabsTrigger value="andamentos" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Andamentos Não Lidos
          {totalNaoLidos > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5">
              {totalNaoLidos > 999 ? '999+' : totalNaoLidos}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="prazos" className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Prazos Concluídos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="andamentos" className="flex-1 mt-0">
        <CentralAndamentosNaoLidos />
      </TabsContent>

      <TabsContent value="prazos" className="flex-1 mt-0">
        <CentralPrazosConcluidos />
      </TabsContent>
    </Tabs>
  );
};
