import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PrazosAbertosPanel from "../PrazosAbertosPanel";
import { DeadlineDetailDialog } from "@/components/Agenda/DeadlineDetailDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getFullGreeting } from "@/utils/greetingHelper";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";
import PrazosDistributionChart from "../PrazosDistributionChart";

interface AdvogadoMetricsProps {
  userId: string;
  userName: string;
}

const AdvogadoMetrics = ({ userId, userName }: AdvogadoMetricsProps) => {
  const [agendaDrawerOpen, setAgendaDrawerOpen] = useState(false);
  const [agendaDeadlineId, setAgendaDeadlineId] = useState<string | undefined>();
  const { tenantId } = useTenantId();
  const { userRole } = useAuth();

  const { data: metrics, isLoading: loading } = useQuery({
    queryKey: ['advogado-metrics', userId],
    queryFn: async () => {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [createdProjectsRes, collaboratorProjectsRes] = await Promise.all([
        supabase.from('projects').select('id').eq('created_by', userId),
        supabase.from('project_collaborators').select('project_id').eq('user_id', userId)
      ]);

      const createdIds = createdProjectsRes.data?.map(p => p.id) || [];
      const collabIds = collaboratorProjectsRes.data?.map(p => p.project_id) || [];
      const allProjectIds = [...new Set([...createdIds, ...collabIds])];

      const [deadlinesRes] = await Promise.all([
        supabase
          .from('deadlines')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('completed', false)
          .gte('date', today.toISOString().split('T')[0])
          .lte('date', nextWeek.toISOString().split('T')[0]),
      ]);

      return {
        myProjects: allProjectIds.length,
        deadlinesThisWeek: deadlinesRes.count || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    enabled: !!userId,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">{getFullGreeting(userName)}</h2>
        <p className="text-muted-foreground">Seus casos e prazos em um só lugar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meus Projetos</CardTitle>
            <FolderKanban className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.myProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">Clientes ativos</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prazos Esta Semana</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.deadlinesThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">Próximos 7 dias</p>
          </CardContent>
        </Card>

        <PrazosDistributionChart tenantId={tenantId} userRole={userRole || undefined} />
      </div>

      <PrazosAbertosPanel userId={userId} maxItems={10} onOpenAgendaDrawer={(id) => { setAgendaDeadlineId(id); setAgendaDrawerOpen(true); }} />
      <DeadlineDetailDialog deadlineId={agendaDeadlineId || null} open={agendaDrawerOpen} onOpenChange={(open) => { setAgendaDrawerOpen(open); if (!open) setAgendaDeadlineId(undefined); }} />
    </div>
  );
};

export default AdvogadoMetrics;
