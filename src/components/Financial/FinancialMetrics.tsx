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
  CreditCard,
  AlertTriangle,
  Wallet,
  Receipt
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
import { differenceInDays, format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RelatorioFinanceiroModal } from '@/components/Financial/RelatorioFinanceiroModal';
import { FinanceiroReceitaCustosChart } from '@/components/Dashboard/Metrics/Financeiro/FinanceiroReceitaCustosChart';
import { FinanceiroParcelasStatusChart } from '@/components/Dashboard/Metrics/Financeiro/FinanceiroParcelasStatusChart';
import { FinanceiroCustosCategoriaChart } from '@/components/Dashboard/Metrics/Financeiro/FinanceiroCustosCategoriaChart';
import { FinanceiroProximosVencimentos } from '@/components/Dashboard/Metrics/Financeiro/FinanceiroProximosVencimentos';

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
  receitaMes: number;
  custosMes: number;
  folhaMes: number;
  inadimplenciaCount: number;
}

interface MonthData {
  mes: string;
  receita: number;
  custos: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface CategoriaData {
  name: string;
  value: number;
  color: string;
}

interface VencimentoData {
  id: string;
  cliente_nome: string;
  valor: number;
  data_vencimento: string;
}

export function FinancialMetrics() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({
    totalClientes: 0, adimplentes: 0, inadimplentes: 0, inativos: 0,
    encerrados: 0, parcelados: 0, receitaTotal: 0, receitaRecebida: 0,
    receitaPendente: 0, receitaAtrasada: 0, receitaMes: 0, custosMes: 0,
    folhaMes: 0, inadimplenciaCount: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [parcelasStatusData, setParcelasStatusData] = useState<StatusData[]>([]);
  const [categoriaCustosData, setCategoriaCustosData] = useState<CategoriaData[]>([]);
  const [proximosVencimentos, setProximosVencimentos] = useState<VencimentoData[]>([]);

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

      // Fetch all data in parallel
      const [parcelasRes, custosRes, categoriasRes, pagamentosRes] = await Promise.all([
        supabase.from('cliente_parcelas').select('*').in('cliente_id', clienteIds),
        supabase.from('custos').select('*'),
        supabase.from('custo_categorias').select('*'),
        supabase.from('colaborador_pagamentos').select('*'),
      ]);

      const parcelas = parcelasRes.data || [];
      const custos = custosRes.data || [];
      const categorias = categoriasRes.data || [];
      const pagamentos = pagamentosRes.data || [];

      const parcelasPorCliente = parcelas.reduce((acc, p) => {
        if (!acc[p.cliente_id]) acc[p.cliente_id] = [];
        acc[p.cliente_id].push(p);
        return acc;
      }, {} as Record<string, any[]>);

      let adimplentes = 0, inadimplentes = 0, inativos = 0, encerrados = 0, parceladosCount = 0;
      let receitaTotal = 0, receitaRecebida = 0, receitaPendente = 0, receitaAtrasada = 0;

      const hoje = new Date();
      const mesAtualStart = startOfMonth(hoje);
      const mesAtualEnd = endOfMonth(hoje);

      (clientes || []).forEach(cliente => {
        const clienteParcelas = parcelasPorCliente[cliente.id] || [];
        if (cliente.forma_pagamento === 'parcelado') parceladosCount++;
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
          if (diasAtraso > 60) inativos++;
          else inadimplentes++;
        } else {
          adimplentes++;
        }
      });

      // Receita do mês
      const receitaMes = parcelas
        .filter(p => p.status === 'pago' && p.data_pagamento && new Date(p.data_pagamento) >= mesAtualStart && new Date(p.data_pagamento) <= mesAtualEnd)
        .reduce((sum, p) => sum + (p.valor_pago || p.valor_parcela || 0), 0);

      // Custos do mês
      const custosMes = custos
        .filter(c => new Date(c.data) >= mesAtualStart && new Date(c.data) <= mesAtualEnd)
        .reduce((sum, c) => sum + (c.valor || 0), 0);

      // Folha do mês
      const mesRef = format(hoje, 'yyyy-MM');
      const folhaMes = pagamentos
        .filter(p => p.mes_referencia === mesRef)
        .reduce((sum, p) => sum + (p.valor_liquido || 0), 0);

      // Inadimplência count
      const inadimplenciaCount = parcelas.filter(p => p.status === 'atrasado').length;

      // --- Monthly data (6 months) ---
      const monthly: MonthData[] = [];
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(hoje, i);
        const mStart = startOfMonth(m);
        const mEnd = endOfMonth(m);
        const rec = parcelas
          .filter(p => p.status === 'pago' && p.data_pagamento && new Date(p.data_pagamento) >= mStart && new Date(p.data_pagamento) <= mEnd)
          .reduce((s, p) => s + (p.valor_pago || p.valor_parcela || 0), 0);
        const cst = custos
          .filter(c => new Date(c.data) >= mStart && new Date(c.data) <= mEnd)
          .reduce((s, c) => s + (c.valor || 0), 0);
        monthly.push({ mes: format(m, 'MMM/yy', { locale: ptBR }), receita: rec, custos: cst });
      }

      // --- Parcelas por status ---
      const pPendentes = parcelas.filter(p => p.status === 'pendente').length;
      const pPagas = parcelas.filter(p => p.status === 'pago').length;
      const pParciais = parcelas.filter(p => p.status === 'parcial').length;
      const pAtrasadas = parcelas.filter(p => p.status === 'atrasado').length;

      // --- Custos por categoria ---
      const catMap: Record<string, { name: string; value: number; color: string }> = {};
      custos.forEach(c => {
        const cat = categorias.find(ct => ct.id === c.categoria_id);
        const catName = cat?.nome || 'Sem categoria';
        const catCor = cat?.cor || '';
        if (!catMap[catName]) catMap[catName] = { name: catName, value: 0, color: catCor };
        catMap[catName].value += c.valor || 0;
      });

      // --- Próximos vencimentos (7 dias) ---
      const em7dias = new Date(hoje);
      em7dias.setDate(em7dias.getDate() + 7);
      const clienteMap = (clientes || []).reduce((acc, c) => {
        acc[c.id] = c.nome_pessoa_fisica || c.nome_pessoa_juridica || 'Sem nome';
        return acc;
      }, {} as Record<string, string>);

      const proxVenc = parcelas
        .filter(p => p.status === 'pendente' && new Date(p.data_vencimento) >= hoje && new Date(p.data_vencimento) <= em7dias)
        .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
        .slice(0, 10)
        .map(p => ({
          id: p.id,
          cliente_nome: clienteMap[p.cliente_id] || 'Cliente',
          valor: p.valor_parcela,
          data_vencimento: p.data_vencimento,
        }));

      setMetrics({
        totalClientes: clientes?.length || 0,
        adimplentes, inadimplentes, inativos, encerrados,
        parcelados: parceladosCount, receitaTotal, receitaRecebida,
        receitaPendente, receitaAtrasada, receitaMes, custosMes,
        folhaMes, inadimplenciaCount,
      });
      setMonthlyData(monthly);
      setParcelasStatusData([
        { name: 'Pendentes', value: pPendentes, color: 'hsl(var(--chart-3))' },
        { name: 'Pagas', value: pPagas, color: 'hsl(var(--chart-2))' },
        { name: 'Parciais', value: pParciais, color: 'hsl(var(--chart-4))' },
        { name: 'Atrasadas', value: pAtrasadas, color: 'hsl(var(--destructive))' },
      ]);
      setCategoriaCustosData(Object.values(catMap));
      setProximosVencimentos(proxVenc);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24" />)}
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

      {/* KPIs - Linha 1 */}
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

      {/* KPIs - Linha 2: Novos indicadores financeiros */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-primary">{formatCurrency(metrics.receitaMes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatCurrency(metrics.receitaPendente)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custos do Mês</CardTitle>
            <Wallet className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-destructive">{formatCurrency(metrics.custosMes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Folha de Pagamento</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatCurrency(metrics.folhaMes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.inadimplenciaCount}</div>
            <p className="text-xs text-muted-foreground">parcelas atrasadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Linha: Receita vs Custos */}
      <FinanceiroReceitaCustosChart data={monthlyData} />

      {/* Grid: Parcelas por Status + Custos por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinanceiroParcelasStatusChart data={parcelasStatusData} />
        <FinanceiroCustosCategoriaChart data={categoriaCustosData} />
      </div>

      {/* Próximos Vencimentos */}
      <FinanceiroProximosVencimentos data={proximosVencimentos} />

      {/* Gráficos existentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
