import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, TrendingUp, Target } from 'lucide-react';
import { useReuniaoMetrics } from '@/hooks/useReuniaoMetrics';
import { StatusDistributionChart } from './Charts/StatusDistributionChart';
import { ReunioesTrendChart } from './Charts/ReunioesTrendChart';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const MinhasMetricasReuniao = () => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const { metrics, loading } = useReuniaoMetrics(undefined, startDate, endDate);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Carregando métricas...</div>;
  }

  if (!metrics) {
    return <div className="flex items-center justify-center p-8">Nenhum dado disponível</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filtros de data */}
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

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Reuniões</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalReunioes}</div>
            <p className="text-xs text-muted-foreground">
              reuniões agendadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Cadastrados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalClientes}</div>
            <p className="text-xs text-muted-foreground">
              clientes únicos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.taxaConversao.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              reuniões fechadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Cliente</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.mediaReunioesPorCliente.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              reuniões/cliente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        {metrics.reunioesPorStatus.length > 0 && (
          <StatusDistributionChart data={metrics.reunioesPorStatus} />
        )}
        {metrics.crescimentoMensal.length > 0 && (
          <ReunioesTrendChart data={metrics.crescimentoMensal} />
        )}
      </div>
    </div>
  );
};
