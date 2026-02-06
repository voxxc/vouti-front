import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  UserX,
  CheckCircle,
  CreditCard
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { differenceInDays } from 'date-fns';
import { RelatorioFinanceiroModal } from '@/components/Financial/RelatorioFinanceiroModal';

interface Metrics {
  totalClientes: number;
  adimplentes: number;
  inadimplentes: number;
  inativos: number;
  encerrados: number;
  parcelados: number;
  receitaTotal: number;
  receitaRecebida: number;
  receitaPendente: number;
  receitaAtrasada: number;
}

export function FinancialMetrics() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({
    totalClientes: 0,
    adimplentes: 0,
    inadimplentes: 0,
    inativos: 0,
    encerrados: 0,
    parcelados: 0,
    receitaTotal: 0,
    receitaRecebida: 0,
    receitaPendente: 0,
    receitaAtrasada: 0,
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isAdmin = userRoles?.some(r => r.role === 'admin');
      const isFinanceiro = userRoles?.some(r => r.role === 'financeiro');
      const hasFullAccess = isAdmin || isFinanceiro;

      let query = supabase.from('clientes').select('*');
      if (!hasFullAccess) query = query.eq('user_id', user.id);

      const { data: clientes } = await query;
      const clienteIds = (clientes || []).map(c => c.id);

      const { data: parcelas } = await supabase
        .from('cliente_parcelas')
        .select('*')
        .in('cliente_id', clienteIds);

      const parcelasPorCliente = (parcelas || []).reduce((acc, p) => {
        if (!acc[p.cliente_id]) acc[p.cliente_id] = [];
        acc[p.cliente_id].push(p);
        return acc;
      }, {} as Record<string, any[]>);

      let adimplentes = 0;
      let inadimplentes = 0;
      let inativos = 0;
      let encerrados = 0;
      let parcelados = 0;
      let receitaTotal = 0;
      let receitaRecebida = 0;
      let receitaPendente = 0;
      let receitaAtrasada = 0;

      const hoje = new Date();

      (clientes || []).forEach(cliente => {
        const clienteParcelas = parcelasPorCliente[cliente.id] || [];
        
        if (cliente.forma_pagamento === 'parcelado') parcelados++;
        receitaTotal += cliente.valor_contrato || 0;

        if (clienteParcelas.length === 0 && cliente.forma_pagamento === 'a_vista') {
          encerrados++;
          return;
        }

        const pagas = clienteParcelas.filter(p => p.status === 'pago');
        const atrasadas = clienteParcelas.filter(p => p.status === 'atrasado');
        const pendentes = clienteParcelas.filter(p => p.status === 'pendente');
        const parciais = clienteParcelas.filter(p => p.status === 'parcial');

        receitaRecebida += pagas.reduce((sum, p) => sum + (p.valor_pago || p.valor_parcela || 0), 0);
        receitaPendente += pendentes.reduce((sum, p) => sum + (p.valor_parcela || 0), 0);
        receitaPendente += parciais.reduce((sum, p) => sum + (p.saldo_restante || 0), 0);
        receitaAtrasada += atrasadas.reduce((sum, p) => sum + (p.valor_parcela || 0), 0);

        if (pagas.length === clienteParcelas.length && clienteParcelas.length > 0) {
          encerrados++;
        } else if (atrasadas.length > 0) {
          const maisAtrasada = atrasadas.sort((a, b) => 
            new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
          )[0];
          const diasAtraso = differenceInDays(hoje, new Date(maisAtrasada.data_vencimento));
          
          if (diasAtraso > 60) {
            inativos++;
          } else {
            inadimplentes++;
          }
        } else {
          adimplentes++;
        }
      });

      setMetrics({
        totalClientes: clientes?.length || 0,
        adimplentes,
        inadimplentes,
        inativos,
        encerrados,
        parcelados,
        receitaTotal,
        receitaRecebida,
        receitaPendente,
        receitaAtrasada,
      });
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const statusData = [
    { name: 'Adimplentes', value: metrics.adimplentes, color: 'hsl(var(--chart-2))' },
    { name: 'Inadimplentes', value: metrics.inadimplentes, color: 'hsl(var(--destructive))' },
    { name: 'Inativos', value: metrics.inativos, color: 'hsl(var(--muted-foreground))' },
    { name: 'Encerrados', value: metrics.encerrados, color: 'hsl(var(--chart-4))' },
  ].filter(d => d.value > 0);

  const receitaData = [
    { name: 'Receita', recebida: metrics.receitaRecebida, pendente: metrics.receitaPendente, atrasada: metrics.receitaAtrasada },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botão Exportar */}
      <div className="flex justify-end">
        <RelatorioFinanceiroModal />
      </div>

      {/* Cards de Métricas - Linha 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalClientes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adimplentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{metrics.adimplentes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inadimplentes</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.inadimplentes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{metrics.inativos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Métricas - Linha 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(metrics.receitaTotal)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parcelados</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.parcelados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Encerrados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.encerrados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pizza: Status dos Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status dos Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Clientes']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Barras: Receita */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={receitaData} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={() => ''}
                />
                <Legend />
                <Bar dataKey="recebida" name="Recebida" fill="hsl(var(--chart-2))" stackId="a" />
                <Bar dataKey="pendente" name="Pendente" fill="hsl(var(--chart-3))" stackId="a" />
                <Bar dataKey="atrasada" name="Em atraso" fill="hsl(var(--destructive))" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
