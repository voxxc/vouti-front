import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getFullGreeting } from "@/utils/greetingHelper";
import { useQuery } from "@tanstack/react-query";

interface ComercialMetricsProps {
  userId: string;
  userName: string;
}

interface Lead {
  id: string;
  nome: string;
  status: string;
  prioridade: string;
  updated_at: string;
  origem: string;
}

const ComercialMetrics = ({ userId, userName }: ComercialMetricsProps) => {
  const { data, isLoading: loading } = useQuery({
    queryKey: ['comercial-metrics', userId],
    queryFn: async () => {
      const { data: allLeads, count: totalCount } = await supabase
        .from('leads_captacao')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(10);

      const captacao = allLeads?.filter(l => l.status === 'captacao').length || 0;
      const qualificados = allLeads?.filter(l => l.status === 'qualificado').length || 0;
      const convertidos = allLeads?.filter(l => l.status === 'convertido').length || 0;
      const highPriority = allLeads?.filter(l => l.prioridade === 'alta').length || 0;

      const total = totalCount || 0;
      const conversionRate = total > 0 ? (convertidos / total) * 100 : 0;

      return {
        metrics: {
          totalLeads: total,
          leadsCaptacao: captacao,
          leadsQualificados: qualificados,
          leadsConvertidos: convertidos,
          conversionRate: parseFloat(conversionRate.toFixed(1)),
          highPriorityLeads: highPriority
        },
        recentLeads: (allLeads || []) as Lead[]
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!userId,
  });

  const metrics = data?.metrics;
  const recentLeads = data?.recentLeads || [];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'convertido':
        return 'default';
      case 'qualificado':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta':
        return 'text-destructive';
      case 'media':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="apple-h1 mb-1">{getFullGreeting(userName)}</h2>
        <p className="apple-subtitle">Painel Comercial</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Em Captação</span>
            <span className="kpi-icon bg-primary/10 text-primary">
              <Clock className="h-[18px] w-[18px]" />
            </span>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-foreground">{metrics?.leadsCaptacao}</div>
          <p className="text-xs text-muted-foreground mt-1.5">Aguardando qualificação</p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Qualificados</span>
            <span className="kpi-icon bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <UserCheck className="h-[18px] w-[18px]" />
            </span>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-foreground">{metrics?.leadsQualificados}</div>
          <p className="text-xs text-muted-foreground mt-1.5">Prontos para conversão</p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Convertidos</span>
            <span className="kpi-icon bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-[18px] w-[18px]" />
            </span>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-foreground">{metrics?.leadsConvertidos}</div>
          <p className="text-xs text-muted-foreground mt-1.5">Viraram clientes</p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Taxa de Conversão</span>
            <span className="kpi-icon bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-[18px] w-[18px]" />
            </span>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-foreground">{metrics?.conversionRate}%</div>
          <p className="text-xs text-muted-foreground mt-1.5">Performance geral</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tight">Últimas Interações com Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 ? (
            <div className="apple-empty">
              <span className="apple-empty-icon"><UserCheck className="h-6 w-6" /></span>
              <p className="apple-empty-title">Nenhum lead registrado</p>
              <p className="apple-empty-subtitle">Novos leads aparecerão aqui automaticamente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLeads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="apple-list-item">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{lead.nome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {lead.origem} • Atualizado {format(new Date(lead.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <Badge variant={getStatusBadgeVariant(lead.status)} className="text-xs rounded-full font-normal">
                      {lead.status}
                    </Badge>
                    <AlertCircle className={`w-4 h-4 ${getPriorityColor(lead.prioridade)}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ComercialMetrics;
