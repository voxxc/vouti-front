import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface SetorTimeData {
  setor: string;
  tempoMedio: number;
}

export const AverageTimeBySetorChart = () => {
  const [data, setData] = useState<SetorTimeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: flows, error } = await supabase
        .from('metal_setor_flow')
        .select('setor, entrada, saida')
        .not('saida', 'is', null);

      if (error) throw error;

      const setorTimes: { [key: string]: { total: number; count: number } } = {};

      flows?.forEach(flow => {
        if (flow.entrada && flow.saida) {
          const inicio = new Date(flow.entrada).getTime();
          const fim = new Date(flow.saida).getTime();
          const horas = (fim - inicio) / (1000 * 60 * 60);

          if (!setorTimes[flow.setor]) {
            setorTimes[flow.setor] = { total: 0, count: 0 };
          }
          setorTimes[flow.setor].total += horas;
          setorTimes[flow.setor].count += 1;
        }
      });

      const chartData: SetorTimeData[] = Object.entries(setorTimes).map(([setor, { total, count }]) => ({
        setor,
        tempoMedio: Math.round(total / count)
      })).sort((a, b) => b.tempoMedio - a.tempoMedio);

      setData(chartData);
    } catch (error) {
      console.error('Erro ao buscar dados de tempo por setor:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Tempo Médio por Setor (Horas)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="setor" 
              stroke="#94a3b8"
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Legend wrapperStyle={{ color: '#cbd5e1' }} />
            <Bar dataKey="tempoMedio" fill="#f97316" name="Tempo Médio (h)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
