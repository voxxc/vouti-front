import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderKanban, UserCheck, Calendar, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OverviewSection } from "../OverviewSection";
import { ClienteAnalytics } from "../ClienteAnalytics";
import { ProcessosMetrics } from "../ProcessosMetrics";
import { TasksMetrics } from "../TasksMetrics";
import { ClienteTasksMetrics } from "../ClienteTasksMetrics";

interface AdminMetricsProps {
  userId: string;
}

interface Metrics {
  totalProjects: number;
  totalLeads: number;
  totalProcessos: number;
  pendingDeadlines: number;
  conversionRate: number;
}

const AdminMetrics = ({ userId }: AdminMetricsProps) => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [userId]);

  const fetchMetrics = async () => {
    try {
      const [projectsRes, leadsRes, processosRes, deadlinesRes] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('leads_captacao').select('id, status', { count: 'exact' }),
        supabase.from('controladoria_processos').select('id', { count: 'exact', head: true }),
        supabase.from('deadlines').select('id', { count: 'exact', head: true }).eq('completed', false)
      ]);

      const totalLeads = leadsRes.count || 0;
      const convertedLeads = leadsRes.data?.filter(lead => lead.status === 'convertido').length || 0;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      setMetrics({
        totalProjects: projectsRes.count || 0,
        totalLeads: totalLeads,
        totalProcessos: processosRes.count || 0,
        pendingDeadlines: deadlinesRes.count || 0,
        conversionRate: parseFloat(conversionRate.toFixed(1))
      });
    } catch (error) {
      console.error('Erro ao buscar métricas admin:', error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">PAINEL ADMINISTRATIVO</h2>
        <p className="text-muted-foreground">Visão consolidada do sistema completo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
            <FolderKanban className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">Clientes ativos</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads no CRM</CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">Em captação</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processos</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalProcessos}</div>
            <p className="text-xs text-muted-foreground mt-1">Em controladoria</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prazos Pendentes</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.pendingDeadlines}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando conclusão</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.conversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Leads convertidos</p>
          </CardContent>
        </Card>
      </div>

      <ClienteAnalytics />

      <ProcessosMetrics />

      <TasksMetrics />

      <ClienteTasksMetrics />

      <OverviewSection users={[]} projects={[]} />
    </div>
  );
};

export default AdminMetrics;
