import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, TrendingUp, Target, Filter } from 'lucide-react';
import { useReuniaoMetrics } from '@/hooks/useReuniaoMetrics';
import { StatusDistributionChart } from './Charts/StatusDistributionChart';
import { ReunioesTrendChart } from './Charts/ReunioesTrendChart';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useReuniaoStatus } from '@/hooks/useReuniaoStatus';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export const MinhasMetricasReuniao = () => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [statusSelecionados, setStatusSelecionados] = useState<string[]>([]);
  const { status } = useReuniaoStatus();
  const { metrics, loading } = useReuniaoMetrics(undefined, startDate, endDate, statusSelecionados.length > 0 ? statusSelecionados : undefined);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Carregando métricas...</div>;
  }

  if (!metrics) {
    return <div className="flex items-center justify-center p-8">Nenhum dado disponível</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filtros de data e status */}
      <div className="flex flex-wrap gap-4 items-center">
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

        {/* Filtro de Status */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Status {statusSelecionados.length > 0 && `(${statusSelecionados.length})`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Filtrar por Status</h4>
              <div className="space-y-2">
                {status.filter(s => s.ativo).map(s => (
                  <div key={s.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={s.id}
                      checked={statusSelecionados.includes(s.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setStatusSelecionados([...statusSelecionados, s.id]);
                        } else {
                          setStatusSelecionados(statusSelecionados.filter(id => id !== s.id));
                        }
                      }}
                    />
                    <Label htmlFor={s.id} className="flex items-center gap-2 cursor-pointer">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.cor }} />
                      {s.nome}
                    </Label>
                  </div>
                ))}
              </div>
              {statusSelecionados.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStatusSelecionados([])}
                  className="w-full"
                >
                  Limpar filtros de status
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
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
