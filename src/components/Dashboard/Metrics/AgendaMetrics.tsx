import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, CalendarClock, Phone, X, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Reuniao } from "@/types/reuniao";

interface AgendaMetricsProps {
  userId: string;
  userName: string;
  isAdminView?: boolean;
}

interface Metrics {
  totalReunioes: number;
  primeiraReuniao: number;
  emContato: number;
  inviavel: number;
  fechado: number;
}

const AgendaMetrics = ({ userId, userName, isAdminView = false }: AgendaMetricsProps) => {
  const [metrics, setMetrics] = useState<Metrics>({
    totalReunioes: 0,
    primeiraReuniao: 0,
    emContato: 0,
    inviavel: 0,
    fechado: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [userId, isAdminView]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      // Build query
      let query = supabase.from('reunioes').select('*');

      // If not admin view, filter by user_id
      if (!isAdminView) {
        query = query.eq('user_id', userId);
      }

      const { data: reunioes, error } = await query;

      if (error) throw error;

      const reunioesData = (reunioes || []) as Reuniao[];

      // Calculate metrics
      setMetrics({
        totalReunioes: reunioesData.length,
        primeiraReuniao: reunioesData.filter(r => r.status === '1ª reunião').length,
        emContato: reunioesData.filter(r => r.status === 'em contato').length,
        inviavel: reunioesData.filter(r => r.status === 'inviável').length,
        fechado: reunioesData.filter(r => r.status === 'fechado').length,
      });
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Reuniões</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalReunioes}</div>
            <p className="text-xs text-muted-foreground">
              Todas as reuniões
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">1ª Reunião</CardTitle>
            <CalendarClock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.primeiraReuniao}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando primeira reunião
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Contato</CardTitle>
            <Phone className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.emContato}</div>
            <p className="text-xs text-muted-foreground">
              Em processo de negociação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inviável</CardTitle>
            <X className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.inviavel}</div>
            <p className="text-xs text-muted-foreground">
              Reuniões não viáveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fechado</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.fechado}</div>
            <p className="text-xs text-muted-foreground">
              Negócios concluídos
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgendaMetrics;
