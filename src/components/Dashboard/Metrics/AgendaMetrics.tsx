import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useReuniaoStatus } from "@/hooks/useReuniaoStatus";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFullGreeting } from "@/utils/greetingHelper";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface AgendaMetricsProps {
  userId: string;
  userName: string;
  isAdminView?: boolean;
}

const AgendaMetrics = ({ userId, userName, isAdminView = false }: AgendaMetricsProps) => {
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const { status } = useReuniaoStatus();

  const { data: metrics, isLoading: loading } = useQuery({
    queryKey: ['agenda-metrics', userId, isAdminView, filtroStatus],
    queryFn: async () => {
      // Build query
      let query = supabase.from('reunioes').select('status_id');

      // If not admin view, filter by user_id
      if (!isAdminView) {
        query = query.eq('user_id', userId);
      }

      // Aplicar filtro de status se selecionado
      if (filtroStatus !== 'todos') {
        query = query.eq('status_id', filtroStatus);
      }

      const { data: reunioes, error } = await query;

      if (error) throw error;

      // Agrupar por status_id
      const metricsMap: { [statusId: string]: number } = {};
      reunioes?.forEach(r => {
        if (r.status_id) {
          metricsMap[r.status_id] = (metricsMap[r.status_id] || 0) + 1;
        }
      });

      return metricsMap;
    },
    staleTime: Infinity,
    enabled: !!userId,
  });

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const totalReunioes = Object.values(metrics || {}).reduce((acc, val) => acc + val, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="apple-h1 mb-1">{getFullGreeting(userName)}</h2>
        <p className="apple-subtitle">{isAdminView ? 'Métricas de Reuniões' : 'Painel de Reuniões'}</p>
      </div>

      {/* Filtro de Status */}
      <div className="flex gap-2 items-center">
        <span className="text-sm text-muted-foreground">Filtrar por Status:</span>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            {status.filter(s => s.ativo).map(s => (
              <SelectItem key={s.id} value={s.id}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.cor }} />
                  {s.nome}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Total de Reuniões</span>
            <span className="kpi-icon bg-primary/10 text-primary">
              <Calendar className="h-[18px] w-[18px]" />
            </span>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-foreground">{totalReunioes}</div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {filtroStatus === 'todos' ? 'Todas as reuniões' : 'Do status selecionado'}
          </p>
        </div>

        {status.filter(s => s.ativo).map(s => {
          const count = metrics?.[s.id] || 0;
          return (
            <div key={s.id} className="kpi-card">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">{s.nome}</span>
                <span
                  className="kpi-icon"
                  style={{
                    backgroundColor: `${s.cor}1A`,
                    color: s.cor,
                  }}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.cor }} />
                </span>
              </div>
              <div className="text-3xl font-semibold tracking-tight text-foreground">{count}</div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {count === 1 ? 'reunião' : 'reuniões'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgendaMetrics;
