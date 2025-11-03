import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProcessosMetrics } from '@/hooks/useProcessosMetrics';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { FileCheck, AlertTriangle, Clock, CheckCircle2, Archive } from 'lucide-react';

const COLORS_PRIORIDADE = ['#DC2626', '#F97316', '#FBBF24', '#10B981'];

export const ProcessosMetrics = () => {
  const { metrics, loading } = useProcessosMetrics();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const statusData = [
    { name: 'Em Andamento', value: metrics.processosPorStatus.em_andamento, color: '#3B82F6' },
    { name: 'Suspenso', value: metrics.processosPorStatus.suspenso, color: '#F59E0B' },
    { name: 'Arquivado', value: metrics.processosPorStatus.arquivado, color: '#8B5CF6' },
    { name: 'Finalizado', value: metrics.processosPorStatus.finalizado, color: '#22C55E' },
  ].filter(item => item.value > 0);

  const prioridadeData = [
    { name: 'Urgente', value: metrics.processosPorPrioridade.urgente },
    { name: 'Alta', value: metrics.processosPorPrioridade.alta },
    { name: 'Média', value: metrics.processosPorPrioridade.media },
    { name: 'Baixa', value: metrics.processosPorPrioridade.baixa },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">⚖️ CONTROLADORIA - PROCESSOS</h2>
        <p className="text-muted-foreground">Métricas e análise de processos jurídicos</p>
      </div>

      {/* KPIs de Processos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Processos</CardTitle>
            <FileCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProcessos}</div>
            <p className="text-xs text-muted-foreground mt-1">Cadastrados no sistema</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.processosPorStatus.em_andamento}</div>
            <p className="text-xs text-muted-foreground mt-1">Processos ativos</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos Prazos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.proximosPrazos}</div>
            <p className="text-xs text-muted-foreground mt-1">Nos próximos 7 dias</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.processosAtrasados}</div>
            <p className="text-xs text-muted-foreground mt-1">Prazo vencido</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum processo cadastrado</p>
            )}
          </CardContent>
        </Card>

        {/* Distribuição por Prioridade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Distribuição por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prioridadeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={prioridadeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {prioridadeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_PRIORIDADE[index % COLORS_PRIORIDADE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum processo com prioridade definida</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento de Status */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <div>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.processosPorStatus.em_andamento}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
              <div>
                <p className="text-xs text-muted-foreground">Suspenso</p>
                <p className="text-2xl font-bold text-yellow-600">{metrics.processosPorStatus.suspenso}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
              <div>
                <p className="text-xs text-muted-foreground">Arquivado</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.processosPorStatus.arquivado}</p>
              </div>
              <Archive className="h-8 w-8 text-purple-600" />
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
              <div>
                <p className="text-xs text-muted-foreground">Finalizado</p>
                <p className="text-2xl font-bold text-green-600">{metrics.processosPorStatus.finalizado}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
