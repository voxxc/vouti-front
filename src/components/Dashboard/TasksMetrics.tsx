import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTasksMetrics } from '@/hooks/useTasksMetrics';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CheckCircle2, Clock, AlertCircle, ListTodo, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const COLORS_TASKS = ['#F59E0B', '#3B82F6', '#8B5CF6', '#22C55E'];

export const TasksMetrics = () => {
  const { metrics, loading } = useTasksMetrics();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const tasksData = [
    { name: 'Em Espera', value: metrics.tasksPorStatus.waiting, color: '#F59E0B' },
    { name: 'A Fazer', value: metrics.tasksPorStatus.todo, color: '#3B82F6' },
    { name: 'Em Andamento', value: metrics.tasksPorStatus.progress, color: '#8B5CF6' },
    { name: 'Concluídas', value: metrics.tasksPorStatus.done, color: '#22C55E' },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">📋 TAREFAS DOS CLIENTES</h2>
        <p className="text-muted-foreground">Métricas e análise de tarefas dos projetos</p>
      </div>

      {/* KPIs de Tarefas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
            <ListTodo className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Todas as tarefas</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{metrics.tasksPorStatus.progress}</div>
            <p className="text-xs text-muted-foreground mt-1">Tarefas ativas</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.tasksAtrasadas}</div>
            <p className="text-xs text-muted-foreground mt-1">Sem atualização +7 dias</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Aberto</CardTitle>
            <ListTodo className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.tasksEmAberto}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando + A fazer</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.taxaConclusao}%</div>
            <Progress value={metrics.taxaConclusao} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Pizza */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Distribuição de Tarefas por Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasksData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tasksData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tasksData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma tarefa cadastrada</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
