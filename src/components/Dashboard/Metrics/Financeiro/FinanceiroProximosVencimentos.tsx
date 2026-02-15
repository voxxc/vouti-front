import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Vencimento {
  id: string;
  cliente_nome: string;
  valor: number;
  data_vencimento: string;
}

interface Props {
  data: Vencimento[];
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FinanceiroProximosVencimentos({ data }: Props) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-lg">Próximos Vencimentos (7 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum vencimento nos próximos 7 dias
          </p>
        ) : (
          <div className="space-y-3 max-h-[280px] overflow-y-auto">
            {data.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border-l-4 border-primary"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {item.cliente_nome}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vence em{" "}
                    {format(new Date(item.data_vencimento + "T12:00:00"), "dd/MM", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {formatCurrency(item.valor)}
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    <Clock className="w-3 h-3 mr-1" />
                    Pendente
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
