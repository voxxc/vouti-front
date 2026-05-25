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

const BADGE_CACHE_KEY = 'controladoria_badge_andamentos_v1';

const readBadgeCache = (tenantId: string): number => {
  try {
    const raw = localStorage.getItem(BADGE_CACHE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { tenantId: string; total: number };
    return parsed.tenantId === tenantId ? parsed.total : 0;
  } catch {
    return 0;
  }
};

const writeBadgeCache = (tenantId: string, total: number) => {
  try {
    localStorage.setItem(BADGE_CACHE_KEY, JSON.stringify({ tenantId, total }));
  } catch {
    // ignore
  }
};

export const CentralControladoria = () => {
  const { tenantId } = useTenantId();
  const { tenantSlug } = useTenantNavigation();
  const [activeTab, setActiveTab] = useState<TabValue>('andamentos');
  const [totalNaoLidos, setTotalNaoLidos] = useState(() =>
    tenantId ? readBadgeCache(tenantId) : 0
  );
  const [totalSubtarefasPendentes, setTotalSubtarefasPendentes] = useState(0);

  const isSolvenza = tenantSlug === 'solvenza';

  // Fetch total unread count for badge using RPC
  useEffect(() => {
    if (!tenantId) return;

    // Hidratar imediatamente a partir do cache local
    const cached = readBadgeCache(tenantId);
    if (cached) setTotalNaoLidos(cached);

    const fetchTotalNaoLidos = async () => {
      const { data, error } = await supabase
        .rpc('get_total_andamentos_nao_lidos', { p_tenant_id: tenantId });

      if (!error && data !== null) {
        setTotalNaoLidos(data);
        writeBadgeCache(tenantId, data);
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
      <div className="apple-tab-bar overflow-x-auto">
        <button
          onClick={() => setActiveTab('andamentos')}
          data-active={activeTab === 'andamentos'}
          className="apple-tab whitespace-nowrap"
        >
          <span className="md:hidden">Andamentos</span>
          <span className="hidden md:inline">Andamentos Não Lidos</span>
          {totalNaoLidos > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 rounded-full">
              {totalNaoLidos > 999 ? '999+' : totalNaoLidos}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab('prazos')}
          data-active={activeTab === 'prazos'}
          className="apple-tab whitespace-nowrap"
        >
          <span className="md:hidden">Prazos</span>
          <span className="hidden md:inline">Prazos Concluídos</span>
        </button>
        {isSolvenza && (
          <button
            onClick={() => setActiveTab('subtarefas')}
            data-active={activeTab === 'subtarefas'}
            className="apple-tab whitespace-nowrap"
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
          className="apple-tab whitespace-nowrap"
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
