import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface StatusData {
  name: string;
  value: number;
  color: string;
}

export const StatusDistributionChart = () => {
  const [data, setData] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: ops, error } = await supabase
        .from('metal_ops')
        .select('status');

      if (error) throw error;

      const statusCounts = {
        aguardando: 0,
        em_andamento: 0,
        concluido: 0
      };

      ops?.forEach(op => {
        if (op.status in statusCounts) {
          statusCounts[op.status as keyof typeof statusCounts]++;
        }
      });

      const chartData: StatusData[] = [
        { name: 'Aguardando', value: statusCounts.aguardando, color: '#eab308' },
        { name: 'Em Produção', value: statusCounts.em_andamento, color: '#3b82f6' },
        { name: 'Concluído', value: statusCounts.concluido, color: '#22c55e' }
      ];

      setData(chartData);
    } catch (error) {
      console.error('Erro ao buscar dados de status:', error);
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
        <CardTitle className="text-white">Distribuição por Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Legend 
              wrapperStyle={{ color: '#cbd5e1' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
