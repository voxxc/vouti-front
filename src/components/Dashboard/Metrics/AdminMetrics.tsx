import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Briefcase, Eye, ShieldAlert, FileText } from "lucide-react";
import { getFullGreeting } from "@/utils/greetingHelper";
import { Skeleton } from "@/components/ui/skeleton";
import { OverviewSection } from "../OverviewSection";
import { ClienteAnalytics } from "../ClienteAnalytics";
import { TasksMetrics } from "../TasksMetrics";
import { ClienteTasksMetrics } from "../ClienteTasksMetrics";
import AgendaMetrics from "./AgendaMetrics";
import PrazosAbertosPanel from "../PrazosAbertosPanel";
import PrazosDistributionChart from "../PrazosDistributionChart";
import { DeadlineDetailDialog } from "@/components/Agenda/DeadlineDetailDialog";
import { useDadosSensiveis } from "@/contexts/DadosSensiveisContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";

interface AdminMetricsProps {
  userId: string;
  userName: string;
}

const AdminMetrics = ({ userId, userName }: AdminMetricsProps) => {
  const [agendaDrawerOpen, setAgendaDrawerOpen] = useState(false);
  const [agendaDeadlineId, setAgendaDeadlineId] = useState<string | undefined>();
  const { dadosVisiveis, toggleDadosVisiveis, formatarNumero, formatarPorcentagem } = useDadosSensiveis();
  const { tenantId } = useTenantId();
  const { userRole } = useAuth();

  // Optimized: Use React Query with cache for faster subsequent loads
  const { data: metrics, isLoading: loading } = useQuery({
    queryKey: ['admin-metrics', userId, tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const [clientesRes, processosCountRes, protocolosRes] = await Promise.all([
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.rpc('get_dashboard_processos_count'),
        supabase.from('project_protocolos').select(`
          id, 
          status, 
          data_previsao,
          etapas:project_protocolo_etapas(id, status)
        `)
      ]);

      // Calcular métricas de protocolos
      const protocolos = (protocolosRes.data || []) as Array<{
        id: string;
        status: string;
        data_previsao: string | null;
        etapas: Array<{ id: string; status: string }> | null;
      }>;
      const totalProtocolos = protocolos.length;
      const protocolosPendentes = protocolos.filter(p => p.status === 'pendente').length;
      const protocolosEmAndamento = protocolos.filter(p => p.status === 'em_andamento').length;
      
      // Protocolo é concluído se: status explícito 'concluido' OU todas as etapas concluídas
      const isProtocoloConcluido = (p: typeof protocolos[0]) => {
        if (p.status === 'concluido') return true;
        const etapas = p.etapas || [];
        if (etapas.length === 0) return false;
        return etapas.every(e => e.status === 'concluido');
      };
      
      const protocolosAtrasados = protocolos.filter(p => {
        if (!p.data_previsao) return false;
        return new Date(p.data_previsao) < new Date() && !isProtocoloConcluido(p);
      }).length;
      const protocolosConcluidos = protocolos.filter(isProtocoloConcluido).length;

      return {
        totalClientes: clientesRes.count || 0,
        totalProcessos: (processosCountRes.data as number | null) || 0,
        totalProtocolos,
        protocolosPendentes,
        protocolosEmAndamento,
        protocolosAtrasados,
        protocolosConcluidos
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!userId && !!tenantId,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Calcular altura das barras proporcionalmente
  const total = metrics?.totalProtocolos || 1;
  const getBarHeight = (value: number) => {
    if (total === 0) return 10;
    return Math.max((value / total) * 100, value > 0 ? 15 : 5);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="apple-h1 mb-1">{getFullGreeting(userName)}</h2>
          <p className="apple-subtitle">Painel Administrativo</p>
        </div>
        <Button
          variant={dadosVisiveis ? "outline" : "secondary"}
          size="sm"
          onClick={toggleDadosVisiveis}
          className="flex items-center gap-2 rounded-full"
          title={dadosVisiveis ? "Ativar modo privacidade" : "Mostrar todos os dados"}
        >
          {dadosVisiveis ? (
            <>
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Dados Visíveis</span>
            </>
          ) : (
            <>
              <ShieldAlert className="h-4 w-4" />
              <span className="hidden sm:inline">Modo Privacidade</span>
            </>
          )}
        </Button>
      </div>

      {/* Painel de Tarefas e Prazos do Usuário (topo) */}
      <PrazosAbertosPanel userId={userId} maxItems={15} onOpenAgendaDrawer={(id) => { setAgendaDeadlineId(id); setAgendaDrawerOpen(true); }} />
      <DeadlineDetailDialog deadlineId={agendaDeadlineId || null} open={agendaDrawerOpen} onOpenChange={(open) => { setAgendaDrawerOpen(open); if (!open) setAgendaDeadlineId(undefined); }} />

      <ClienteAnalytics />

      <div>
        <h2 className="apple-h1 mb-1">Indicadores</h2>
        <p className="apple-subtitle">Visão geral do escritório</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total de Clientes */}
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Total de Clientes</span>
            <span className="kpi-icon bg-primary/10 text-primary">
              <Users className="h-[18px] w-[18px]" />
            </span>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-foreground">{formatarNumero(metrics?.totalClientes || 0)}</div>
          <p className="text-xs text-muted-foreground mt-1.5">Cadastrados</p>
        </div>

        {/* 2. Casos */}
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Casos</span>
            <span className="kpi-icon bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Briefcase className="h-[18px] w-[18px]" />
            </span>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-foreground">{formatarNumero(metrics?.totalProcessos || 0)}</div>
          <p className="text-xs text-muted-foreground mt-1.5">Em controladoria</p>
        </div>

        {/* 3. Processos com mini-barras visuais */}
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Processos</span>
            <span className="kpi-icon bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FileText className="h-[18px] w-[18px]" />
            </span>
          </div>
          <div className="flex items-end gap-1.5 h-10 mb-3">
            <div 
              className="bg-blue-500 rounded-t w-4 transition-all duration-500" 
              style={{ height: `${getBarHeight(metrics?.protocolosPendentes || 0)}%` }}
              title={`Pendentes: ${metrics?.protocolosPendentes || 0}`}
            />
            <div 
              className="bg-yellow-500 rounded-t w-4 transition-all duration-500" 
              style={{ height: `${getBarHeight(metrics?.protocolosEmAndamento || 0)}%` }}
              title={`Em Andamento: ${metrics?.protocolosEmAndamento || 0}`}
            />
            <div 
              className="bg-red-500 rounded-t w-4 transition-all duration-500" 
              style={{ height: `${getBarHeight(metrics?.protocolosAtrasados || 0)}%` }}
              title={`Atrasados: ${metrics?.protocolosAtrasados || 0}`}
            />
            <div 
              className="bg-green-500 rounded-t w-4 transition-all duration-500" 
              style={{ height: `${getBarHeight(metrics?.protocolosConcluidos || 0)}%` }}
              title={`Concluídos: ${metrics?.protocolosConcluidos || 0}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-blue-500" />
              <span className="text-muted-foreground">{metrics?.protocolosPendentes || 0} pend.</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-yellow-500" />
              <span className="text-muted-foreground">{metrics?.protocolosEmAndamento || 0} andam.</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-red-500" />
              <span className="text-muted-foreground">{metrics?.protocolosAtrasados || 0} atras.</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-green-500" />
              <span className="text-muted-foreground">{metrics?.protocolosConcluidos || 0} concl.</span>
            </div>
          </div>
        </div>

        <PrazosDistributionChart tenantId={tenantId} userRole={userRole} />
      </div>

      <TasksMetrics />

      <ClienteTasksMetrics />

      <OverviewSection users={[]} projects={[]} />

      {/* Métricas de Reuniões */}
      <Card>
        <CardContent className="pt-6">
          <AgendaMetrics userId={userId} userName="Admin" isAdminView={true} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMetrics;
