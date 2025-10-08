import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface SetorData {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

export const SetorDistributionChart = () => {
  const [data, setData] = useState<SetorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: ops, error } = await supabase
        .from('metal_ops')
        .select('setor_atual')
        .not('setor_atual', 'is', null);

      if (error) throw error;

      const setorCounts: { [key: string]: number } = {};

      ops?.forEach(op => {
        if (op.setor_atual) {
          setorCounts[op.setor_atual] = (setorCounts[op.setor_atual] || 0) + 1;
        }
      });

      const chartData: SetorData[] = Object.entries(setorCounts).map(([setor, count], index) => ({
        name: setor,
        value: count,
        color: COLORS[index % COLORS.length]
      }));

      setData(chartData);
    } catch (error) {
      console.error('Erro ao buscar dados de setor:', error);
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
        <CardTitle className="text-white">Distribuição por Setor Atual</CardTitle>
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
