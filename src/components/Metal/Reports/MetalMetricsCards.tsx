import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Factory, Clock, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Metrics {
  totalOPs: number;
  aguardando: number;
  emProducao: number;
  concluidas: number;
  tempoMedio: number;
}

export const MetalMetricsCards = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const { data: ops, error } = await supabase
        .from('metal_ops')
        .select('id, status, created_at, updated_at');

      if (error) throw error;

      const totalOPs = ops?.length || 0;
      const aguardando = ops?.filter(op => op.status === 'aguardando').length || 0;
      const emProducao = ops?.filter(op => op.status === 'em_andamento').length || 0;
      const concluidas = ops?.filter(op => op.status === 'concluido').length || 0;

      // Calcular tempo médio de conclusão (diferença entre updated_at e created_at para OPs concluídas)
      const concluidasComDatas = ops?.filter(op => 
        op.status === 'concluido' && op.created_at && op.updated_at
      ) || [];

      let tempoMedio = 0;
      if (concluidasComDatas.length > 0) {
        const totalHoras = concluidasComDatas.reduce((acc, op) => {
          const inicio = new Date(op.created_at).getTime();
          const fim = new Date(op.updated_at).getTime();
          const horas = (fim - inicio) / (1000 * 60 * 60);
          return acc + horas;
        }, 0);
        tempoMedio = totalHoras / concluidasComDatas.length;
      }

      setMetrics({
        totalOPs,
        aguardando,
        emProducao,
        concluidas,
        tempoMedio: Math.round(tempoMedio)
      });
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="bg-slate-800/50 border-slate-700 hover:shadow-lg hover:shadow-orange-500/20 transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">Total de OPs</CardTitle>
          <Factory className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{metrics?.totalOPs}</div>
          <p className="text-xs text-slate-400 mt-1">Todas as ordens</p>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700 hover:shadow-lg hover:shadow-yellow-500/20 transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">Em Aguardo</CardTitle>
          <AlertCircle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{metrics?.aguardando}</div>
          <p className="text-xs text-slate-400 mt-1">Aguardando início</p>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700 hover:shadow-lg hover:shadow-blue-500/20 transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">Em Produção</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{metrics?.emProducao}</div>
          <p className="text-xs text-slate-400 mt-1">Em andamento</p>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700 hover:shadow-lg hover:shadow-green-500/20 transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">Concluídas</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{metrics?.concluidas}</div>
          <p className="text-xs text-slate-400 mt-1">Finalizadas</p>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700 hover:shadow-lg hover:shadow-purple-500/20 transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">Tempo Médio</CardTitle>
          <Clock className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{metrics?.tempoMedio}h</div>
          <p className="text-xs text-slate-400 mt-1">Conclusão média</p>
        </CardContent>
      </Card>
    </div>
  );
};
