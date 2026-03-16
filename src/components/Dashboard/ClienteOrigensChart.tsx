import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Share2 } from 'lucide-react';
import { OrigemData } from '@/types/analytics';

const ORIGEM_COLORS: Record<string, string> = {
  instagram_organico: '#E1306C',
  instagram_trafego: '#833AB4',
  facebook_organico: '#1877F2',
  facebook_trafego: '#4267B2',
  indicacao: '#10B981',
  outro: '#6B7280',
};

interface Props {
  data: OrigemData[];
  dadosVisiveis: boolean;
}

export const ClienteOrigensChart = ({ data, dadosVisiveis }: Props) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="h-5 w-5 text-primary" />
          Origem dos Clientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!dadosVisiveis ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p className="text-sm">Dados ocultos no modo privacidade</p>
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma origem cadastrada ainda</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={130}
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value: number, _: any, entry: any) => [
                  `${value} clientes (${entry.payload.percentage.toFixed(1)}%)`,
                  '',
                ]}
                labelFormatter={() => ''}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={28}>
                {data.map((entry) => (
                  <Cell key={entry.origem} fill={ORIGEM_COLORS[entry.origem] || '#6B7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
