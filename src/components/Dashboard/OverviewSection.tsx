import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Users,
  Calendar,
  Target
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserMetrics {
  userId: string;
  name: string;
  completedTasks: number;
  delayedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  waitingTasks: number;
  completionRate: number;
}

interface OverviewProps {
  users: any[];
  projects: any[];
}

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'progress' | 'waiting' | 'done';
  project_id: string;
  created_at: string;
  updated_at: string;
  projects?: {
    name: string;
    client: string;
  };
}

export const OverviewSection = ({ users, projects }: OverviewProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRealData();
  }, []);

  const fetchRealData = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks with project information
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          projects (
            name,
            client
          )
        `)
        .order('updated_at', { ascending: false });

      if (tasksError) throw tasksError;

      setTasks((tasksData || []) as Task[]);

      // Calculate user metrics based on real data
      const metricsMap = new Map<string, UserMetrics>();

      // Initialize metrics for each user
      users.forEach(user => {
        metricsMap.set(user.user_id, {
          userId: user.user_id,
          name: user.full_name || user.email,
          completedTasks: 0,
          delayedTasks: 0,
          inProgressTasks: 0,
          todoTasks: 0,
          waitingTasks: 0,
          completionRate: 0
        });
      });

      // Count tasks by status for each user
      tasksData?.forEach(task => {
        // For now, we'll count all tasks as belonging to the admin user
        // In the future, you might have an assigned_to field
        const adminUser = users.find(u => u.role === 'admin');
        if (adminUser) {
          const metrics = metricsMap.get(adminUser.user_id);
          if (metrics) {
            switch (task.status) {
              case 'done':
                metrics.completedTasks++;
                break;
              case 'progress':
                metrics.inProgressTasks++;
                break;
              case 'todo':
                metrics.todoTasks++;
                break;
              case 'waiting':
                metrics.waitingTasks++;
                break;
            }
          }
        }
      });

      // Calculate completion rates
      metricsMap.forEach(metrics => {
        const totalTasks = metrics.completedTasks + metrics.delayedTasks + 
                          metrics.inProgressTasks + metrics.todoTasks + metrics.waitingTasks;
        metrics.completionRate = totalTasks > 0 ? 
          Math.round((metrics.completedTasks / totalTasks) * 100) : 0;
      });

      setUserMetrics(Array.from(metricsMap.values()).filter(m => 
        m.completedTasks + m.inProgressTasks + m.todoTasks + m.waitingTasks > 0
      ));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Visão Geral</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalTasks = userMetrics.reduce((sum, user) => 
    sum + user.completedTasks + user.delayedTasks + user.inProgressTasks + user.todoTasks + user.waitingTasks, 0
  );
  
  const totalCompleted = userMetrics.reduce((sum, user) => sum + user.completedTasks, 0);
  const totalDelayed = userMetrics.reduce((sum, user) => sum + user.delayedTasks, 0);
  const totalInProgress = userMetrics.reduce((sum, user) => sum + user.inProgressTasks, 0);
  const totalWaiting = userMetrics.reduce((sum, user) => sum + user.waitingTasks, 0);

  const overallCompletionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  // Get recent tasks for upcoming deadlines (using the 5 most recent tasks)
  const upcomingDeadlines = tasks
    .filter(task => task.status !== 'done')
    .slice(0, 5)
    .map(task => ({
      task: task.title,
      client: task.projects?.client || task.projects?.name || 'Cliente não identificado',
      date: new Date(task.updated_at),
      priority: task.status === 'waiting' ? 'high' : task.status === 'progress' ? 'medium' : 'low'
    }));

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Visão Geral</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {totalCompleted} concluídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overallCompletionRate}%</div>
            <Progress value={overallCompletionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalInProgress}</div>
            <p className="text-xs text-muted-foreground">
              tarefas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totalWaiting}</div>
            <p className="text-xs text-muted-foreground">
              aguardando aprovação
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={20} />
              Performance por Usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {userMetrics.length > 0 ? userMetrics.map((user) => (
              <div key={user.userId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{user.name}</span>
                  <Badge variant="outline">{user.completionRate}%</Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle size={12} />
                    {user.completedTasks} concluídas
                  </div>
                  <div className="flex items-center gap-1 text-blue-600">
                    <Clock size={12} />
                    {user.inProgressTasks} em andamento
                  </div>
                  <div className="flex items-center gap-1 text-yellow-600">
                    <AlertCircle size={12} />
                    {user.waitingTasks} aguardando
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Target size={12} />
                    {user.todoTasks} a fazer
                  </div>
                </div>
                <Progress value={user.completionRate} className="h-2" />
              </div>
            )) : (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma tarefa encontrada
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={20} />
              Próximos Prazos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingDeadlines.length > 0 ? upcomingDeadlines.map((deadline, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{deadline.task}</p>
                  <p className="text-xs text-muted-foreground">{deadline.client}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {deadline.date.toLocaleDateString('pt-BR')}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getPriorityColor(deadline.priority)}`}
                  >
                    {deadline.priority === 'high' ? 'Alta' : 
                     deadline.priority === 'medium' ? 'Média' : 'Baixa'}
                  </Badge>
                </div>
              </div>
            )) : (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma tarefa pendente
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};