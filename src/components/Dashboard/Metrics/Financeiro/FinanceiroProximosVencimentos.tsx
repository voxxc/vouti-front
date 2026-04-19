import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarCheck } from "lucide-react";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold tracking-tight">Próximos Vencimentos (7 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="apple-empty">
            <span className="apple-empty-icon"><CalendarCheck className="h-6 w-6" /></span>
            <p className="apple-empty-title">Tudo em dia</p>
            <p className="apple-empty-subtitle">Nenhum vencimento nos próximos 7 dias.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {data.map((item) => (
              <div key={item.id} className="apple-list-item">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-foreground">
                    {item.cliente_nome}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vence em{" "}
                    {format(new Date(item.data_vencimento + "T12:00:00"), "dd/MM", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm font-semibold whitespace-nowrap tabular-nums text-foreground">
                    {formatCurrency(item.valor)}
                  </span>
                  <Badge variant="outline" className="shrink-0 rounded-full font-normal">
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
