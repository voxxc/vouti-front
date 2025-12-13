import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FunnelData {
  leadsCadastrados: number;
  reunioesAgendadas: number;
  reunioesRealizadas: number;
  fechamentos: number;
}

interface ConversionFunnelChartProps {
  data: FunnelData;
}

export const ConversionFunnelChart = ({ data }: ConversionFunnelChartProps) => {
  const maxValue = Math.max(data.leadsCadastrados, data.reunioesAgendadas, data.reunioesRealizadas, data.fechamentos, 1);
  
  const stages = [
    { label: 'Leads Cadastrados', value: data.leadsCadastrados, color: 'hsl(var(--primary))' },
    { label: 'Reunioes Agendadas', value: data.reunioesAgendadas, color: '#6366f1' },
    { label: 'Reunioes Realizadas', value: data.reunioesRealizadas, color: '#8b5cf6' },
    { label: 'Fechamentos', value: data.fechamentos, color: '#22c55e' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Conversao</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const width = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
            const prevValue = index > 0 ? stages[index - 1].value : null;
            const conversion = prevValue && prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(1) : null;
            
            return (
              <div key={stage.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{stage.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{stage.value}</span>
                    {conversion && (
                      <span className="text-xs text-muted-foreground">
                        ({conversion}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-8 bg-muted rounded-md overflow-hidden">
                  <div 
                    className="h-full rounded-md transition-all duration-500 flex items-center justify-center text-white text-sm font-medium"
                    style={{ 
                      width: `${Math.max(width, 5)}%`,
                      backgroundColor: stage.color
                    }}
                  >
                    {width > 15 && stage.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {data.leadsCadastrados > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Taxa de Conversao Total</span>
              <span className="text-lg font-bold text-green-500">
                {((data.fechamentos / data.leadsCadastrados) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
