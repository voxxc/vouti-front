import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getFullGreeting } from "@/utils/greetingHelper";

interface ComercialMetricsProps {
  userId: string;
  userName: string;
}

interface Metrics {
  totalLeads: number;
  leadsCaptacao: number;
  leadsQualificados: number;
  leadsConvertidos: number;
  conversionRate: number;
  highPriorityLeads: number;
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
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [userId]);

  const fetchMetrics = async () => {
    try {
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

      setMetrics({
        totalLeads: total,
        leadsCaptacao: captacao,
        leadsQualificados: qualificados,
        leadsConvertidos: convertidos,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        highPriorityLeads: highPriority
      });

      setRecentLeads(allLeads || []);
    } catch (error) {
      console.error('Erro ao buscar métricas comercial:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <h2 className="text-2xl font-semibold mb-2 text-foreground">{getFullGreeting(userName)}</h2>
        <p className="text-muted-foreground">Painel Comercial</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Captação</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.leadsCaptacao}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando qualificação</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualificados</CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.leadsQualificados}</div>
            <p className="text-xs text-muted-foreground mt-1">Prontos para conversão</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convertidos</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.leadsConvertidos}</div>
            <p className="text-xs text-muted-foreground mt-1">Viraram clientes</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-elegant transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <AlertCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.conversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Performance geral</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Últimas Interações com Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lead registrado ainda</p>
          ) : (
            <div className="space-y-3">
              {recentLeads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{lead.nome}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lead.origem} • Atualizado {format(new Date(lead.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge variant={getStatusBadgeVariant(lead.status)} className="text-xs">
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
