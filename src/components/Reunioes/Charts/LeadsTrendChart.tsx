import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LeadsTrendChartProps {
  data: { dia: string; total: number; novos: number }[];
}

export const LeadsTrendChart = ({ data }: LeadsTrendChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads no Periodo</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="dia" 
              className="text-xs text-muted-foreground"
              tick={{ fontSize: 11 }}
            />
            <YAxis className="text-xs text-muted-foreground" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar 
              dataKey="total" 
              fill="hsl(var(--primary))" 
              name="Total de Leads"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="novos" 
              fill="#22c55e" 
              name="Novos Leads"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
