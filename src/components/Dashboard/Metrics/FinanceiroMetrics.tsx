import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, AlertTriangle, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinanceiroMetricsProps {
  userId: string;
  userName: string;
}

interface Metrics {
  activeProjects: number;
  overdueDeadlines: number;
  totalDeadlines: number;
  complianceRate: number;
}

interface OverdueItem {
  id: string;
  title: string;
  date: string;
  project_id: string;
}

const FinanceiroMetrics = ({ userId, userName }: FinanceiroMetricsProps) => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [userId]);

  const fetchMetrics = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [projectsRes, overdueRes, totalDeadlinesRes, overdueListRes] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase
          .from('deadlines')
          .select('id', { count: 'exact', head: true })
          .eq('completed', false)
          .lt('date', today),
        supabase.from('deadlines').select('id', { count: 'exact', head: true }),
        supabase
          .from('deadlines')
          .select('id, title, date, project_id')
          .eq('completed', false)
          .lt('date', today)
          .order('date', { ascending: true })
          .limit(5)
      ]);

      const totalDeadlines = totalDeadlinesRes.count || 0;
      const completedDeadlines = totalDeadlines - (overdueRes.count || 0);
      const complianceRate = totalDeadlines > 0 ? (completedDeadlines / totalDeadlines) * 100 : 0;

      setMetrics({
        activeProjects: projectsRes.count || 0,
        overdueDeadlines: overdueRes.count || 0,
        totalDeadlines: totalDeadlines,
        complianceRate: parseFloat(complianceRate.toFixed(1))
      });

      setOverdueItems(overdueListRes.data || []);
    } catch (error) {
      console.error('Erro ao buscar métricas financeiro:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">PAINEL FINANCEIRO - {userName.toUpperCase()}</h2>
        <p className="text-muted-foreground">Controle financeiro e inadimplências</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">Em faturamento</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prazos Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics?.overdueDeadlines}</div>
            <p className="text-xs text-muted-foreground mt-1">Necessitam atenção</p>
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

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Prazos Vencidos para Cobrança</CardTitle>
        </CardHeader>
        <CardContent>
          {overdueItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum prazo vencido no momento</p>
          ) : (
            <div className="space-y-3">
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
  );
};

export default FinanceiroMetrics;
