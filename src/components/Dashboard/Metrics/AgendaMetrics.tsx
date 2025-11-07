import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Reuniao } from "@/types/reuniao";
import { useReuniaoStatus } from "@/hooks/useReuniaoStatus";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AgendaMetricsProps {
  userId: string;
  userName: string;
  isAdminView?: boolean;
}

const AgendaMetrics = ({ userId, userName, isAdminView = false }: AgendaMetricsProps) => {
  const [metrics, setMetrics] = useState<{ [statusId: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const { status } = useReuniaoStatus();

  useEffect(() => {
    fetchMetrics();
  }, [userId, isAdminView, filtroStatus]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);

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

      setMetrics(metricsMap);
    } catch (error) {
      console.error('Error fetching agenda metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const totalReunioes = Object.values(metrics).reduce((acc, val) => acc + val, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">
          {isAdminView ? 'Métricas de Reuniões' : 'Painel de Reuniões'}
        </h2>
        <p className="text-muted-foreground">
          {isAdminView 
            ? 'Acompanhe todas as reuniões do sistema' 
            : 'Acompanhe suas reuniões e conversões'}
        </p>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Reuniões</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReunioes}</div>
            <p className="text-xs text-muted-foreground">
              {filtroStatus === 'todos' ? 'Todas as reuniões' : 'Do status selecionado'}
            </p>
          </CardContent>
        </Card>

        {status.filter(s => s.ativo).map(s => {
          const count = metrics[s.id] || 0;
          return (
            <Card key={s.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{s.nome}</CardTitle>
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: s.cor }}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">
                  {count === 1 ? 'reunião' : 'reuniões'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AgendaMetrics;
