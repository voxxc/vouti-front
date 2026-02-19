import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Calendar, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PrazosAbertosPanel from "../PrazosAbertosPanel";
import { AgendaDrawer } from "@/components/Agenda/AgendaDrawer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getFullGreeting } from "@/utils/greetingHelper";

interface AdvogadoMetricsProps {
  userId: string;
  userName: string;
}

const AdvogadoMetrics = ({ userId, userName }: AdvogadoMetricsProps) => {
  const [agendaDrawerOpen, setAgendaDrawerOpen] = useState(false);
  // Optimized: Use React Query with cache for faster subsequent loads
  const { data: metrics, isLoading: loading } = useQuery({
    queryKey: ['advogado-metrics', userId],
    queryFn: async () => {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Buscar projetos criados pelo usuário e onde é participante em PARALELO
      const [createdProjectsRes, collaboratorProjectsRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id')
          .eq('created_by', userId),
        supabase
          .from('project_collaborators')
          .select('project_id')
          .eq('user_id', userId)
      ]);

      // Combinar IDs únicos
      const createdIds = createdProjectsRes.data?.map(p => p.id) || [];
      const collabIds = collaboratorProjectsRes.data?.map(p => p.project_id) || [];
      const allProjectIds = [...new Set([...createdIds, ...collabIds])];

      const [deadlinesRes, tasksRes, completedTasksRes] = await Promise.all([
        supabase
          .from('deadlines')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('completed', false)
          .gte('date', today.toISOString().split('T')[0])
          .lte('date', nextWeek.toISOString().split('T')[0]),
        allProjectIds.length > 0
          ? supabase
              .from('tasks')
              .select('id', { count: 'exact', head: true })
              .in('project_id', allProjectIds)
              .in('status', ['todo', 'in_progress'])
          : Promise.resolve({ count: 0 }),
        allProjectIds.length > 0
          ? supabase
              .from('tasks')
              .select('id', { count: 'exact', head: true })
              .in('project_id', allProjectIds)
              .eq('status', 'done')
          : Promise.resolve({ count: 0 }),
      ]);

      const totalTasks = (tasksRes.count || 0) + (completedTasksRes.count || 0);
      const completionRate = totalTasks > 0 ? ((completedTasksRes.count || 0) / totalTasks) * 100 : 0;

      return {
        myProjects: allProjectIds.length,
        deadlinesThisWeek: deadlinesRes.count || 0,
        activeTasks: tasksRes.count || 0,
        completionRate: parseFloat(completionRate.toFixed(1))
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    enabled: !!userId,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Ativas</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Em andamento</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Tarefas concluídas</p>
          </CardContent>
        </Card>
      </div>

      <PrazosAbertosPanel userId={userId} maxItems={10} onOpenAgendaDrawer={() => setAgendaDrawerOpen(true)} />
      <AgendaDrawer open={agendaDrawerOpen} onOpenChange={setAgendaDrawerOpen} />
    </div>
  );
};

export default AdvogadoMetrics;
