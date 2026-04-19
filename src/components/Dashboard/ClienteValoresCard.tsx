import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { FaixaValorData } from '@/types/analytics';
import { formatCurrency } from '@/lib/utils';

interface Props {
  data: FaixaValorData[];
  menorContrato: number;
  maiorContrato: number;
  ticketMedio: number;
  dadosVisiveis: boolean;
  formatarValor: (v: number) => string;
}

export const ClienteValoresCard = ({ data, menorContrato, maiorContrato, ticketMedio, dadosVisiveis, formatarValor }: Props) => {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-5 w-5 text-primary" />
          Faixas de Valor de Contrato
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!dadosVisiveis ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p className="text-sm">Dados ocultos no modo privacidade</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.map((item) => (
              <div key={item.faixa} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{item.faixa}</span>
                  <span className="text-muted-foreground">
                    {item.count} {item.count === 1 ? 'cliente' : 'clientes'}
                    <span className="ml-1 text-xs text-primary font-semibold">
                      ({item.percentage.toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div className="h-1 w-full bg-muted/40 overflow-hidden rounded-sm">
                  <div
                    className="h-full bg-primary/70 transition-all duration-500 rounded-sm"
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}

            {/* Footer com resumo */}
            <div className="mt-5 pt-4 border-t border-border grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Menor</p>
                <p className="text-sm font-semibold text-foreground">{formatarValor(menorContrato)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Média</p>
                <p className="text-sm font-semibold text-primary">{formatarValor(ticketMedio)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Maior</p>
                <p className="text-sm font-semibold text-foreground">{formatarValor(maiorContrato)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
