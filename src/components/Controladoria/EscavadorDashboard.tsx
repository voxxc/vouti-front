import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEscavadorDashboard } from '@/hooks/useEscavadorDashboard';
import { MonitoramentoStatusBadge } from './MonitoramentoStatusBadge';
import { Bell, BellOff, Eye, FileText, Activity, Clock, CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const EscavadorDashboard = () => {
  const navigate = useNavigate();
  const { stats, processosMonitorados, loading, ativarMonitoramento, desativarMonitoramento } = useEscavadorDashboard();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const diasAteProximaConsulta = Math.ceil(
    (stats.proximaConsultaRecorrente.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Processos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProcessos}</div>
            <p className="text-xs text-muted-foreground mt-1">Cadastrados no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monitorados</CardTitle>
            <Bell className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.processosMonitorados}</div>
            <p className="text-xs text-muted-foreground mt-1">Com monitoramento ativo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Não Monitorados</CardTitle>
            <BellOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processosNaoMonitorados}</div>
            <p className="text-xs text-muted-foreground mt-1">Sem monitoramento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atualizações Pendentes</CardTitle>
            <Activity className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.atualizacoesRecentes24h}</div>
            <p className="text-xs text-muted-foreground mt-1">Últimas 24 horas (não lidas)</p>
          </CardContent>
        </Card>
      </div>

      {/* Card de Próxima Consulta Recorrente */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="h-5 w-5 text-primary" />
            Próxima Consulta Recorrente
          </CardTitle>
          <CardDescription>
            Consulta automática mensal de todos os processos monitorados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Agendada para:</p>
              <p className="text-xl font-bold">
                {stats.proximaConsultaRecorrente.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Clock className="h-4 w-4 mr-2" />
              em {diasAteProximaConsulta} dia(s)
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Processos Monitorados */}
      <Card>
        <CardHeader>
          <CardTitle>Processos Monitorados</CardTitle>
          <CardDescription>
            Acompanhe o status do monitoramento de cada processo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processosMonitorados.length === 0 ? (
            <div className="text-center py-12">
              <BellOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum processo monitorado</h3>
              <p className="text-muted-foreground mb-4">
                Ative o monitoramento na página de detalhes do processo
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número do Processo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Consulta</TableHead>
                  <TableHead className="text-center">Total Atualizações</TableHead>
                  <TableHead className="text-center">Não Lidas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processosMonitorados.map((processo) => (
                  <TableRow key={processo.id}>
                    <TableCell className="font-medium">{processo.numero_processo}</TableCell>
                    <TableCell>
                      <MonitoramentoStatusBadge ativo={processo.monitoramento_ativo} size="sm" />
                    </TableCell>
                    <TableCell>
                      {processo.ultima_consulta ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(processo.ultima_consulta), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Nunca consultado</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{processo.total_atualizacoes}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {processo.atualizacoes_nao_lidas > 0 ? (
                        <Badge variant="destructive">{processo.atualizacoes_nao_lidas}</Badge>
                      ) : (
                        <Badge variant="secondary">0</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/controladoria/processo/${processo.processo_id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {processo.monitoramento_ativo ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => desativarMonitoramento(processo.processo_id)}
                        >
                          <BellOff className="h-4 w-4 mr-1" />
                          Desativar
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => ativarMonitoramento(processo.processo_id)}
                        >
                          <Bell className="h-4 w-4 mr-1" />
                          Ativar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EscavadorDashboard;
