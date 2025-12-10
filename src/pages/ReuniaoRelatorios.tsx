import { useState } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Users, TrendingUp, Target } from 'lucide-react';
import { useReuniaoMetrics } from '@/hooks/useReuniaoMetrics';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import { StatusDistributionChart } from '@/components/Reunioes/Charts/StatusDistributionChart';
import { ReunioesTrendChart } from '@/components/Reunioes/Charts/ReunioesTrendChart';
import { UserPerformanceTable } from '@/components/Reunioes/Charts/UserPerformanceTable';
import { RelatorioReunioesExport } from '@/components/Reunioes/RelatorioReunioesExport';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ReuniaoRelatorios = () => {
  const { navigate } = useTenantNavigation();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const { metrics, userMetrics, loading, isAdmin } = useReuniaoMetrics(undefined, startDate, endDate);

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground mb-4">
              Você não tem permissão para acessar esta página.
            </p>
            <Button onClick={() => navigate('/reunioes')}>
              Voltar para Reuniões
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          Carregando relatórios...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/reunioes')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Relatórios de Reuniões</h1>
              <p className="text-muted-foreground">
                Visão completa e consolidada de todas as reuniões
              </p>
            </div>
          </div>
          <RelatorioReunioesExport
            metrics={metrics}
            userMetrics={userMetrics}
            startDate={startDate}
            endDate={endDate}
          />
        </div>

        {/* Filtros de data */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Selecione o período para análise</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <span>até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              {(startDate || endDate) && (
                <Button variant="ghost" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
                  Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cards de resumo geral */}
        {metrics && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Reuniões</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalReunioes}</div>
                <p className="text-xs text-muted-foreground">reuniões agendadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Cadastrados</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalClientes}</div>
                <p className="text-xs text-muted-foreground">clientes únicos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.taxaConversao.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">reuniões fechadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Média por Cliente</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.mediaReunioesPorCliente.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">reuniões/cliente</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gráficos gerais */}
        {metrics && (
          <div className="grid gap-4 md:grid-cols-2">
            {metrics.reunioesPorStatus.length > 0 && (
              <StatusDistributionChart data={metrics.reunioesPorStatus} />
            )}
            {metrics.crescimentoMensal.length > 0 && (
              <ReunioesTrendChart data={metrics.crescimentoMensal} />
            )}
          </div>
        )}

        {/* Tabela de performance por usuário */}
        {userMetrics.length > 0 && (
          <UserPerformanceTable userMetrics={userMetrics} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReuniaoRelatorios;
