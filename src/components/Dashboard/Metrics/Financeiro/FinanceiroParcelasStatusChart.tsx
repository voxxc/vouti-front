import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: StatusData[];
}

export function FinanceiroParcelasStatusChart({ data }: Props) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-lg">Parcelas por Status</CardTitle>
      </CardHeader>
      <CardContent>
        {data.every((d) => d.value === 0) ? (
          <p className="text-sm text-muted-foreground h-[220px] flex items-center justify-center">
            Sem dados para exibir
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" name="Parcelas" radius={[4, 4, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
