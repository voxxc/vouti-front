import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, TrendingUp, Target, Filter, UserCircle, CheckCircle } from 'lucide-react';
import { useReuniaoMetrics } from '@/hooks/useReuniaoMetrics';
import { StatusDistributionChart } from './Charts/StatusDistributionChart';
import { ReunioesTrendChart } from './Charts/ReunioesTrendChart';
import { LeadsTrendChart } from './Charts/LeadsTrendChart';
import { ConversionFunnelChart } from './Charts/ConversionFunnelChart';
import { UserPerformanceBarChart } from './Charts/UserPerformanceBarChart';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useReuniaoStatus } from '@/hooks/useReuniaoStatus';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';
import { useQuery } from '@tanstack/react-query';

type PeriodoRapido = 'hoje' | 'semana' | 'mes' | 'personalizado';

export const MinhasMetricasReuniao = () => {
  const [periodoRapido, setPeriodoRapido] = useState<PeriodoRapido>('mes');
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [statusSelecionados, setStatusSelecionados] = useState<string[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<string>('todos');
  const { status } = useReuniaoStatus();
  const { tenantId } = useTenantId();

  // Calcular datas baseado no periodo rapido
  const datasCalculadas = useMemo(() => {
    const hoje = new Date();
    switch (periodoRapido) {
      case 'hoje':
        return { start: hoje, end: hoje };
      case 'semana':
        return { start: startOfWeek(hoje, { locale: ptBR }), end: hoje };
      case 'mes':
        return { start: startOfMonth(hoje), end: hoje };
      default:
        return { start: startDate, end: endDate };
    }
  }, [periodoRapido, startDate, endDate]);

  const { metrics, userMetrics, loading, isAdmin } = useReuniaoMetrics(
    usuarioSelecionado !== 'todos' ? usuarioSelecionado : undefined,
    datasCalculadas.start,
    datasCalculadas.end,
    statusSelecionados.length > 0 ? statusSelecionados : undefined
  );

  // Buscar usuarios do tenant
  const { data: usuarios } = useQuery({
    queryKey: ['usuarios-reunioes', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('tenant_id', tenantId);
      return data || [];
    },
    enabled: !!tenantId && isAdmin
  });

  // Buscar leads do periodo (de reuniao_clientes - leads criados via agendamento)
  const { data: leadsData } = useQuery({
    queryKey: ['reuniao-leads-metricas', tenantId, datasCalculadas.start, datasCalculadas.end],
    queryFn: async () => {
      let query = supabase
        .from('reuniao_clientes')
        .select('id, nome, created_at, telefone, email, observacoes')
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      if (datasCalculadas.start) {
        query = query.gte('created_at', datasCalculadas.start.toISOString());
      }
      if (datasCalculadas.end) {
        query = query.lte('created_at', datasCalculadas.end.toISOString());
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!tenantId
  });

  // Buscar reunioes detalhadas (sem JOIN com profiles)
  const { data: reunioesDetalhadas } = useQuery({
    queryKey: ['reunioes-detalhadas', tenantId, datasCalculadas.start, datasCalculadas.end, usuarioSelecionado],
    queryFn: async () => {
      let query = supabase
        .from('reunioes')
        .select(`
          id, data, observacoes, user_id,
          reuniao_clientes (nome),
          reuniao_status (nome, cor)
        `)
        .order('data', { ascending: false })
        .limit(50);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      if (datasCalculadas.start) {
        query = query.gte('created_at', datasCalculadas.start.toISOString());
      }
      if (datasCalculadas.end) {
        query = query.lte('created_at', datasCalculadas.end.toISOString());
      }
      if (usuarioSelecionado !== 'todos') {
        query = query.eq('user_id', usuarioSelecionado);
      }

      const { data: reunioes } = await query;
      if (!reunioes || reunioes.length === 0) return [];

      // Buscar perfis separadamente
      const userIds = [...new Set(reunioes.map(r => r.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map<string, string>();
      profiles?.forEach(p => profileMap.set(p.user_id, p.full_name || 'Usuario'));

      return reunioes.map(r => ({
        ...r,
        userName: profileMap.get(r.user_id) || 'Usuario'
      }));
    },
    enabled: !!tenantId
  });

  // Calcular dados do grafico de leads por dia (leads criados via agendamento)
  const leadsTrendData = useMemo(() => {
    if (!leadsData) return [];
    
    const porDia = new Map<string, number>();
    
    leadsData.forEach(lead => {
      const data = format(new Date(lead.created_at), 'dd/MM');
      porDia.set(data, (porDia.get(data) || 0) + 1);
    });

    return Array.from(porDia.entries()).map(([dia, total]) => ({
      dia,
      total,
      novos: total // Todos sao leads de reuniao
    })).slice(-14);
  }, [leadsData]);

  // Dados do funil baseado apenas em reunioes
  const funnelData = useMemo(() => {
    const fechados = metrics?.reunioesPorStatus.find(s => s.status.toLowerCase() === 'fechado')?.count || 0;
    const emContato = metrics?.reunioesPorStatus.find(s => s.status.toLowerCase().includes('contato'))?.count || 0;
    const inviaveis = metrics?.reunioesPorStatus.find(s => s.status.toLowerCase().includes('inviavel') || s.status.toLowerCase().includes('inviável'))?.count || 0;
    return {
      leadsCadastrados: leadsData?.length || 0,
      reunioesAgendadas: metrics?.totalReunioes || 0,
      reunioesRealizadas: (metrics?.totalReunioes || 0) - inviaveis,
      fechamentos: fechados
    };
  }, [leadsData, metrics]);

  // Novos leads (ultimos 7 dias)
  const novosLeads = useMemo(() => {
    if (!leadsData) return 0;
    const seteDiasAtras = subDays(new Date(), 7);
    return leadsData.filter(l => new Date(l.created_at) >= seteDiasAtras).length;
  }, [leadsData]);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Carregando metricas...</div>;
  }

  if (!metrics) {
    return <div className="flex items-center justify-center p-8">Nenhum dado disponivel</div>;
  }

  const fechados = metrics.reunioesPorStatus.find(s => s.status.toLowerCase() === 'fechado')?.count || 0;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            {/* Periodo Rapido */}
            <div className="space-y-1">
              <Label className="text-sm">Periodo</Label>
              <Select value={periodoRapido} onValueChange={(v) => setPeriodoRapido(v as PeriodoRapido)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana">Semana</SelectItem>
                  <SelectItem value="mes">Mes</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Datas personalizadas */}
            {periodoRapido === 'personalizado' && (
              <>
                <div className="space-y-1">
                  <Label className="text-sm">Inicio</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[130px]">
                        {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[130px]">
                        {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            {/* Usuario (apenas admin) */}
            {isAdmin && usuarios && usuarios.length > 0 && (
              <div className="space-y-1">
                <Label className="text-sm">Usuario</Label>
                <Select value={usuarioSelecionado} onValueChange={setUsuarioSelecionado}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os usuarios</SelectItem>
                    {usuarios.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.full_name || 'Usuario'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status */}
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
                    <Button variant="ghost" size="sm" onClick={() => setStatusSelecionados([])} className="w-full">
                      Limpar filtros
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Cadastrados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadsData?.length || 0}</div>
            <p className="text-xs text-muted-foreground">no periodo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Leads</CardTitle>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{novosLeads}</div>
            <p className="text-xs text-muted-foreground">ultimos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reunioes Agendadas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalReunioes}</div>
            <p className="text-xs text-muted-foreground">no periodo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reunioes Fechadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{fechados}</div>
            <p className="text-xs text-muted-foreground">contratos fechados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversao</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.taxaConversao.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">fechados/total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LEADs Unicos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalClientes}</div>
            <p className="text-xs text-muted-foreground">com reunioes</p>
          </CardContent>
        </Card>
      </div>

      {/* Graficos - Linha 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {leadsTrendData.length > 0 && (
          <LeadsTrendChart data={leadsTrendData} />
        )}
        <ConversionFunnelChart data={funnelData} />
      </div>

      {/* Graficos - Linha 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {metrics.reunioesPorStatus.length > 0 && (
          <StatusDistributionChart data={metrics.reunioesPorStatus} />
        )}
        {isAdmin && userMetrics.length > 0 && (
          <UserPerformanceBarChart data={userMetrics} />
        )}
      </div>

      {/* Grafico de tendencia */}
      {metrics.crescimentoMensal.length > 0 && (
        <ReunioesTrendChart data={metrics.crescimentoMensal} />
      )}

      {/* Listas detalhadas */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Lista de Reunioes */}
        <Card>
          <CardHeader>
            <CardTitle>Ultimas Reunioes</CardTitle>
            <CardDescription>Reunioes mais recentes no periodo</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>LEAD</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reunioesDetalhadas?.slice(0, 10).map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      {r.data ? format(new Date(r.data), 'dd/MM/yy') : '-'}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {(r.reuniao_clientes as any)?.nome || 'LEAD'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(r as any).userName?.split(' ')[0] || 'Usuario'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        style={{ 
                          borderColor: (r.reuniao_status as any)?.cor,
                          color: (r.reuniao_status as any)?.cor
                        }}
                      >
                        {(r.reuniao_status as any)?.nome || 'Sem status'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!reunioesDetalhadas || reunioesDetalhadas.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhuma reuniao encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Lista de Leads (cadastrados via agendamento) */}
        <Card>
          <CardHeader>
            <CardTitle>Ultimos Leads</CardTitle>
            <CardDescription>Leads cadastrados via agendamento de reunioes</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data Cadastro</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadsData?.slice(0, 10).map(lead => (
                  <TableRow key={lead.id}>
                    <TableCell className="text-sm font-medium">{lead.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(lead.created_at), 'dd/MM/yy')}
                    </TableCell>
                    <TableCell className="text-sm">{lead.telefone || '-'}</TableCell>
                    <TableCell className="text-sm">{lead.email || '-'}</TableCell>
                  </TableRow>
                ))}
                {(!leadsData || leadsData.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum lead encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
