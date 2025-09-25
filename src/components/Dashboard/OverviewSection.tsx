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

interface UserMetrics {
  userId: string;
  name: string;
  completedTasks: number;
  delayedTasks: number;
  inProgressTasks: number;
  completionRate: number;
}

interface OverviewProps {
  users: any[];
  projects: any[];
}

export const OverviewSection = ({ users, projects }: OverviewProps) => {
  // Mock data for demonstration - in real app this would come from backend
  const userMetrics: UserMetrics[] = [
    {
      userId: '1',
      name: 'João Silva',
      completedTasks: 45,
      delayedTasks: 3,
      inProgressTasks: 8,
      completionRate: 92
    },
    {
      userId: '2',
      name: 'Maria Santos',
      completedTasks: 38,
      delayedTasks: 1,
      inProgressTasks: 12,
      completionRate: 96
    },
    {
      userId: '3',
      name: 'Carlos Oliveira',
      completedTasks: 52,
      delayedTasks: 5,
      inProgressTasks: 6,
      completionRate: 88
    }
  ];

  const totalTasks = userMetrics.reduce((sum, user) => 
    sum + user.completedTasks + user.delayedTasks + user.inProgressTasks, 0
  );
  
  const totalCompleted = userMetrics.reduce((sum, user) => sum + user.completedTasks, 0);
  const totalDelayed = userMetrics.reduce((sum, user) => sum + user.delayedTasks, 0);
  const totalInProgress = userMetrics.reduce((sum, user) => sum + user.inProgressTasks, 0);

  const overallCompletionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const upcomingDeadlines = [
    { task: 'Revisão contrato ABC Corp', client: 'ABC Corp', date: new Date(2024, 0, 28), priority: 'high' },
    { task: 'Audiência caso Silva', client: 'João Silva', date: new Date(2024, 0, 30), priority: 'medium' },
    { task: 'Entrega parecer técnico', client: 'Tech Solutions', date: new Date(2024, 1, 2), priority: 'high' },
  ];

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
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalDelayed}</div>
            <p className="text-xs text-muted-foreground">
              requerem atenção
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
            {userMetrics.map((user) => (
              <div key={user.userId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{user.name}</span>
                  <Badge variant="outline">{user.completionRate}%</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle size={12} />
                    {user.completedTasks} concluídas
                  </div>
                  <div className="flex items-center gap-1 text-blue-600">
                    <Clock size={12} />
                    {user.inProgressTasks} em andamento
                  </div>
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertCircle size={12} />
                    {user.delayedTasks} atrasadas
                  </div>
                </div>
                <Progress value={user.completionRate} className="h-2" />
              </div>
            ))}
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
            {upcomingDeadlines.map((deadline, index) => (
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
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};