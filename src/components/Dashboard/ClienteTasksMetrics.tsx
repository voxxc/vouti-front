import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClienteTasksMetrics } from '@/hooks/useClienteTasksMetrics';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Clock, CheckCircle2, AlertCircle, ListTodo } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDadosSensiveis } from '@/contexts/DadosSensiveisContext';

export const ClienteTasksMetrics = () => {
  const { metrics, loading } = useClienteTasksMetrics();
  const { dadosVisiveis, formatarNumero, formatarTexto } = useDadosSensiveis();

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">👥 ANÁLISE POR CLIENTE</h2>
        <p className="text-muted-foreground">Tarefas e atividades dos clientes/projetos</p>
      </div>

      {/* KPIs Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarNumero(metrics.totalClientes)}</div>
            <p className="text-xs text-muted-foreground mt-1">Com tarefas cadastradas</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatarNumero(metrics.distribuicaoGeral.emAndamento)}</div>
            <p className="text-xs text-muted-foreground mt-1">Cards ativos</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatarNumero(metrics.distribuicaoGeral.aguardando)}</div>
            <p className="text-xs text-muted-foreground mt-1">Em espera</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatarNumero(metrics.distribuicaoGeral.concluidas)}</div>
            <p className="text-xs text-muted-foreground mt-1">Finalizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Clientes com Mais Tarefas Ativas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top 5 Clientes com Mais Tarefas Ativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.top5ClientesAtivos.length > 0 && dadosVisiveis ? (
              metrics.top5ClientesAtivos.map((cliente, index) => {
                const totalAtivas = cliente.emAndamento + cliente.aguardando + cliente.aFazer;
                
                return (
                  <div key={cliente.projectId} className="p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                        <h4 className="font-semibold text-sm">{formatarTexto(cliente.clienteNome, 20)}</h4>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {formatarNumero(totalAtivas)} ativas
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div className="flex flex-col items-center p-2 bg-purple-50 dark:bg-purple-950/20 rounded border border-purple-200 dark:border-purple-900">
                        <Clock className="h-4 w-4 text-purple-600 mb-1" />
                        <span className="font-bold text-purple-600">{formatarNumero(cliente.emAndamento)}</span>
                        <span className="text-muted-foreground">Andamento</span>
                      </div>
                      <div className="flex flex-col items-center p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-900">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mb-1" />
                        <span className="font-bold text-yellow-600">{formatarNumero(cliente.aguardando)}</span>
                        <span className="text-muted-foreground">Aguardando</span>
                      </div>
                      <div className="flex flex-col items-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-900">
                        <ListTodo className="h-4 w-4 text-blue-600 mb-1" />
                        <span className="font-bold text-blue-600">{formatarNumero(cliente.aFazer)}</span>
                        <span className="text-muted-foreground">A Fazer</span>
                      </div>
                      <div className="flex flex-col items-center p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-900">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mb-1" />
                        <span className="font-bold text-green-600">{formatarNumero(cliente.concluidas)}</span>
                        <span className="text-muted-foreground">Concluídas</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : !dadosVisiveis ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Dados ocultos no modo privacidade
              </p>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum cliente com tarefas ativas
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
