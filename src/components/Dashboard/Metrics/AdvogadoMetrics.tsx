import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Calendar, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdvogadoMetricsProps {
  userId: string;
  userName: string;
}

interface Metrics {
  myProjects: number;
  deadlinesThisWeek: number;
  activeTasks: number;
  completionRate: number;
}

interface Deadline {
  id: string;
  title: string;
  date: string;
  project_id: string;
}

const AdvogadoMetrics = ({ userId, userName }: AdvogadoMetricsProps) => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [userId]);

  const fetchMetrics = async () => {
    try {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Buscar projetos criados pelo usuário
      const { data: createdProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('created_by', userId);

      // Buscar projetos onde o usuário é participante
      const { data: collaboratorProjects } = await supabase
        .from('project_collaborators')
        .select('project_id')
        .eq('user_id', userId);

      // Combinar IDs únicos (evitar duplicatas se for criador E participante)
      const createdIds = createdProjects?.map(p => p.id) || [];
      const collabIds = collaboratorProjects?.map(p => p.project_id) || [];
      const allProjectIds = [...new Set([...createdIds, ...collabIds])];

      const [deadlinesRes, tasksRes, completedTasksRes, upcomingRes] = await Promise.all([
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
        supabase
          .from('deadlines')
          .select('id, title, date, project_id')
          .eq('user_id', userId)
          .eq('completed', false)
          .gte('date', today.toISOString().split('T')[0])
          .order('date', { ascending: true })
          .limit(5)
      ]);

      const totalTasks = (tasksRes.count || 0) + (completedTasksRes.count || 0);
      const completionRate = totalTasks > 0 ? ((completedTasksRes.count || 0) / totalTasks) * 100 : 0;

      setMetrics({
        myProjects: allProjectIds.length,
        deadlinesThisWeek: deadlinesRes.count || 0,
        activeTasks: tasksRes.count || 0,
        completionRate: parseFloat(completionRate.toFixed(1))
      });

      setUpcomingDeadlines(upcomingRes.data || []);
    } catch (error) {
      console.error('Erro ao buscar métricas advogado:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <h2 className="text-2xl font-semibold mb-2 text-foreground">BEM-VINDO, {userName.toUpperCase()}</h2>
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

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Próximos Prazos</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum prazo pendente nos próximos dias</p>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map((deadline) => (
                <div key={deadline.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{deadline.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(deadline.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    <Calendar className="w-3 h-3 mr-1" />
                    Pendente
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvogadoMetrics;
