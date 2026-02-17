import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, AlertTriangle, Calendar, Receipt, Wallet, Users2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getFullGreeting } from "@/utils/greetingHelper";
import { useQuery } from "@tanstack/react-query";
import { FinanceiroReceitaCustosChart } from "./Financeiro/FinanceiroReceitaCustosChart";
import { FinanceiroParcelasStatusChart } from "./Financeiro/FinanceiroParcelasStatusChart";
import { FinanceiroCustosCategoriaChart } from "./Financeiro/FinanceiroCustosCategoriaChart";
import { FinanceiroProximosVencimentos } from "./Financeiro/FinanceiroProximosVencimentos";

interface FinanceiroMetricsProps {
  userId: string;
  userName: string;
}

interface OverdueItem {
  id: string;
  title: string;
  date: string;
  project_id: string;
}

const FinanceiroMetrics = ({ userId, userName }: FinanceiroMetricsProps) => {
  const { data, isLoading: loading } = useQuery({
    queryKey: ['financeiro-metrics', userId],
    queryFn: async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const mesAtualInicio = format(startOfMonth(today), 'yyyy-MM-dd');
      const mesAtualFim = format(endOfMonth(today), 'yyyy-MM-dd');

      // Build 6-month range
      const sixMonthsAgo = subMonths(startOfMonth(today), 5);
      const sixMonthsAgoStr = format(sixMonthsAgo, 'yyyy-MM-dd');

      // Next 7 days
      const seteDias = new Date(today);
      seteDias.setDate(seteDias.getDate() + 7);
      const seteDiasStr = format(seteDias, 'yyyy-MM-dd');

      const [
        projectsRes,
        overdueRes,
        totalDeadlinesRes,
        overdueListRes,
        parcelasRes,
        custosRes,
        custoCategoriasRes,
        colaboradorPagRes,
        proximosVencRes,
      ] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('module', 'legal'),
        supabase.from('deadlines').select('id', { count: 'exact', head: true }).eq('completed', false).lt('date', todayStr),
        supabase.from('deadlines').select('id', { count: 'exact', head: true }),
        supabase.from('deadlines').select('id, title, date, project_id').eq('completed', false).lt('date', todayStr).order('date', { ascending: true }).limit(5),
        // All parcelas from last 6 months onward
        supabase.from('cliente_parcelas').select('id, valor_parcela, valor_pago, saldo_restante, data_vencimento, data_pagamento, status').gte('data_vencimento', sixMonthsAgoStr),
        // Custos from last 6 months
        supabase.from('custos').select('id, valor, data, status, categoria_id').gte('data', sixMonthsAgoStr),
        supabase.from('custo_categorias').select('id, nome, cor'),
        // Colaborador pagamentos current month
        supabase.from('colaborador_pagamentos').select('id, valor_liquido, status, mes_referencia').eq('mes_referencia', format(today, 'yyyy-MM')),
        // Próximos vencimentos (7 dias) with client name
        supabase.from('cliente_parcelas').select('id, valor_parcela, data_vencimento, cliente_id, clientes(nome_pessoa_fisica, nome_pessoa_juridica)').in('status', ['pendente', 'parcial']).gte('data_vencimento', todayStr).lte('data_vencimento', seteDiasStr).order('data_vencimento', { ascending: true }).limit(10),
      ]);

      const parcelas = parcelasRes.data || [];
      const custos = custosRes.data || [];
      const categorias = custoCategoriasRes.data || [];
      const colabPag = colaboradorPagRes.data || [];
      const proximosVenc = proximosVencRes.data || [];

      // === KPIs ===
      const totalDeadlines = totalDeadlinesRes.count || 0;
      const overdueCount = overdueRes.count || 0;
      const completedDeadlines = totalDeadlines - overdueCount;
      const complianceRate = totalDeadlines > 0 ? (completedDeadlines / totalDeadlines) * 100 : 0;

      // Receita do mês (parcelas pagas no mês atual)
      const receitaMes = parcelas
        .filter(p => p.status === 'pago' && p.data_pagamento && p.data_pagamento >= mesAtualInicio && p.data_pagamento <= mesAtualFim)
        .reduce((sum, p) => sum + (p.valor_pago || p.valor_parcela || 0), 0);

      // A receber (pendente + parcial)
      const aReceber = parcelas
        .filter(p => p.status === 'pendente' || p.status === 'parcial')
        .reduce((sum, p) => sum + (p.status === 'parcial' ? (p.saldo_restante || 0) : (p.valor_parcela || 0)), 0);

      // Custos do mês
      const custosMes = custos
        .filter(c => c.data >= mesAtualInicio && c.data <= mesAtualFim)
        .reduce((sum, c) => sum + (c.valor || 0), 0);

      // Folha de pagamento
      const folhaPagamento = colabPag.reduce((sum, p) => sum + (p.valor_liquido || 0), 0);

      // Inadimplência (parcelas vencidas não pagas)
      const inadimplencia = parcelas.filter(p => p.status === 'atrasado' || (p.status === 'pendente' && p.data_vencimento < todayStr)).length;

      // === Gráfico Linha: Receitas vs Custos (6 meses) ===
      const monthlyData: { mes: string; receita: number; custos: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(today, i);
        const mStart = format(startOfMonth(m), 'yyyy-MM-dd');
        const mEnd = format(endOfMonth(m), 'yyyy-MM-dd');
        const label = format(m, 'MMM/yy', { locale: ptBR });

        const rec = parcelas
          .filter(p => p.status === 'pago' && p.data_pagamento && p.data_pagamento >= mStart && p.data_pagamento <= mEnd)
          .reduce((s, p) => s + (p.valor_pago || p.valor_parcela || 0), 0);

        const cst = custos
          .filter(c => c.data >= mStart && c.data <= mEnd)
          .reduce((s, c) => s + (c.valor || 0), 0);

        monthlyData.push({ mes: label, receita: rec, custos: cst });
      }

      // === Gráfico Barras: Parcelas por status ===
      const parcelasStatus = [
        { name: 'Pagas', value: parcelas.filter(p => p.status === 'pago').length, color: 'hsl(var(--chart-2))' },
        { name: 'Pendentes', value: parcelas.filter(p => p.status === 'pendente').length, color: 'hsl(var(--chart-3))' },
        { name: 'Parciais', value: parcelas.filter(p => p.status === 'parcial').length, color: 'hsl(var(--chart-4))' },
        { name: 'Atrasadas', value: parcelas.filter(p => p.status === 'atrasado').length, color: 'hsl(var(--destructive))' },
      ];

      // === Gráfico Pizza: Custos por Categoria ===
      const catMap = new Map(categorias.map(c => [c.id, c]));
      const custosPorCat: Record<string, { nome: string; valor: number; cor: string }> = {};
      custos.forEach(c => {
        const cat = c.categoria_id ? catMap.get(c.categoria_id) : null;
        const catName = cat?.nome || 'Sem categoria';
        const catCor = cat?.cor || '';
        if (!custosPorCat[catName]) custosPorCat[catName] = { nome: catName, valor: 0, cor: catCor };
        custosPorCat[catName].valor += c.valor || 0;
      });
      const custosCategoria = Object.values(custosPorCat).map(c => ({ name: c.nome, value: c.valor, color: c.cor }));

      // === Próximos Vencimentos ===
      const proximosFormatted = proximosVenc.map((p: any) => ({
        id: p.id,
        cliente_nome: p.clientes?.nome_pessoa_fisica || p.clientes?.nome_pessoa_juridica || 'Cliente',
        valor: p.valor_parcela,
        data_vencimento: p.data_vencimento,
      }));

      return {
        metrics: {
          activeProjects: projectsRes.count || 0,
          overdueDeadlines: overdueCount,
          totalDeadlines,
          complianceRate: parseFloat(complianceRate.toFixed(1)),
          receitaMes,
          aReceber,
          custosMes,
          folhaPagamento,
          inadimplencia,
        },
        overdueItems: (overdueListRes.data || []) as OverdueItem[],
        monthlyData,
        parcelasStatus,
        custosCategoria,
        proximosVencimentos: proximosFormatted,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    enabled: !!userId,
  });

  const metrics = data?.metrics;
  const overdueItems = data?.overdueItems || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">{getFullGreeting(userName)}</h2>
        <p className="text-muted-foreground">Painel Financeiro</p>
      </div>

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(metrics?.receitaMes || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Valores recebidos</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <Receipt className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.aReceber || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Pendente + parcial</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custos do Mês</CardTitle>
            <Wallet className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(metrics?.custosMes || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Despesas registradas</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Folha de Pagamento</CardTitle>
            <Users2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.folhaPagamento || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Colaboradores do mês</p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">Em faturamento</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics?.inadimplencia}</div>
            <p className="text-xs text-muted-foreground mt-1">Parcelas vencidas</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Prazos</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalDeadlines}</div>
            <p className="text-xs text-muted-foreground mt-1">No sistema</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Adimplência</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.complianceRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Prazos cumpridos</p>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart - Receitas vs Custos */}
      <FinanceiroReceitaCustosChart data={data?.monthlyData || []} />

      {/* Bar + Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinanceiroParcelasStatusChart data={data?.parcelasStatus || []} />
        <FinanceiroCustosCategoriaChart data={data?.custosCategoria || []} />
      </div>

      {/* Próximos Vencimentos + Vencidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinanceiroProximosVencimentos data={data?.proximosVencimentos || []} />

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Prazos Vencidos para Cobrança</CardTitle>
          </CardHeader>
          <CardContent>
            {overdueItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum prazo vencido no momento</p>
            ) : (
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {overdueItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border-l-4 border-destructive">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Venceu em {format(new Date(item.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant="destructive" className="ml-2">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Vencido
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceiroMetrics;
