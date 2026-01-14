import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FolderKanban, UserCheck, Calendar, TrendingUp, Eye, ShieldAlert, FileText } from "lucide-react";
import { getFullGreeting } from "@/utils/greetingHelper";
import { Skeleton } from "@/components/ui/skeleton";
import { OverviewSection } from "../OverviewSection";
import { ClienteAnalytics } from "../ClienteAnalytics";
import { ProcessosMetrics } from "../ProcessosMetrics";
import { TasksMetrics } from "../TasksMetrics";
import { ClienteTasksMetrics } from "../ClienteTasksMetrics";
import AgendaMetrics from "./AgendaMetrics";
import PrazosAbertosPanel from "../PrazosAbertosPanel";
import { useDadosSensiveis } from "@/contexts/DadosSensiveisContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdminMetricsProps {
  userId: string;
  userName: string;
}

const AdminMetrics = ({ userId, userName }: AdminMetricsProps) => {
  const { dadosVisiveis, toggleDadosVisiveis, formatarNumero, formatarPorcentagem } = useDadosSensiveis();

  // Optimized: Use React Query with cache for faster subsequent loads
  const { data: metrics, isLoading: loading } = useQuery({
    queryKey: ['admin-metrics', userId],
    queryFn: async () => {
      const [projectsRes, leadsRes, processosRes, deadlinesRes, protocolosRes] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('leads_captacao').select('id, status', { count: 'exact' }),
        supabase.from('processos_oab').select('id', { count: 'exact', head: true }),
        supabase.from('deadlines').select('id', { count: 'exact', head: true }).eq('completed', false),
        supabase.from('project_protocolos').select('id, status, data_previsao')
      ]);

      const totalLeads = leadsRes.count || 0;
      const convertedLeads = leadsRes.data?.filter(lead => lead.status === 'convertido').length || 0;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      // Calcular métricas de protocolos
      const protocolos = protocolosRes.data || [];
      const totalProtocolos = protocolos.length;
      const protocolosPendentes = protocolos.filter(p => p.status === 'pendente').length;
      const protocolosEmAndamento = protocolos.filter(p => p.status === 'em_andamento').length;
      const protocolosAtrasados = protocolos.filter(p => {
        if (!p.data_previsao) return false;
        return new Date(p.data_previsao) < new Date() && p.status !== 'concluido';
      }).length;
      const protocolosConcluidos = protocolos.filter(p => p.status === 'concluido').length;

      return {
        totalProjects: projectsRes.count || 0,
        totalLeads: totalLeads,
        totalProcessos: processosRes.count || 0,
        pendingDeadlines: deadlinesRes.count || 0,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        totalProtocolos,
        protocolosPendentes,
        protocolosEmAndamento,
        protocolosAtrasados,
        protocolosConcluidos
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: !!userId,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2 text-foreground">{getFullGreeting(userName)}</h2>
          <p className="text-muted-foreground">Painel Administrativo</p>
        </div>
        <Button
          variant={dadosVisiveis ? "outline" : "secondary"}
          size="sm"
          onClick={toggleDadosVisiveis}
          className="flex items-center gap-2"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
            <FolderKanban className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarNumero(metrics?.totalProjects || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Clientes ativos</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads no CRM</CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarNumero(metrics?.totalLeads || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Em captação</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processos</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarNumero(metrics?.totalProcessos || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Em controladoria</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prazos Pendentes</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarNumero(metrics?.pendingDeadlines || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando conclusão</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarPorcentagem(metrics?.conversionRate || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Leads convertidos</p>
          </CardContent>
        </Card>

        {/* Card de Protocolos com mini-barras visuais */}
        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protocolos</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {/* Mini-barras visuais */}
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
            
            {/* Legenda compacta */}
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
          </CardContent>
        </Card>
      </div>

      {/* Painel de Tarefas e Prazos do Usuário */}
      <PrazosAbertosPanel userId={userId} maxItems={15} />

      <ClienteAnalytics />

      <ProcessosMetrics />

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
