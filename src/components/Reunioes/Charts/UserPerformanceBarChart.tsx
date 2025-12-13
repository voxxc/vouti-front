import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserMetrics } from '@/hooks/useReuniaoMetrics';

interface UserPerformanceBarChartProps {
  data: UserMetrics[];
}

export const UserPerformanceBarChart = ({ data }: UserPerformanceBarChartProps) => {
  const chartData = data.slice(0, 10).map(u => ({
    name: u.userName.split(' ')[0],
    agendadas: u.totalReunioes,
    fechadas: u.reunioesPorStatus.find(s => s.status === 'fechado')?.count || 0
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por Usuario</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" className="text-xs text-muted-foreground" />
            <YAxis 
              type="category" 
              dataKey="name" 
              className="text-xs text-muted-foreground"
              width={80}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar 
              dataKey="agendadas" 
              fill="hsl(var(--primary))" 
              name="Agendadas"
              radius={[0, 4, 4, 0]}
            />
            <Bar 
              dataKey="fechadas" 
              fill="#22c55e" 
              name="Fechadas"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
