import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { AppleChartTooltip } from "./AppleChartTooltip";
import { Inbox } from "lucide-react";

interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: StatusData[];
}

export function FinanceiroParcelasStatusChart({ data }: Props) {
  const isEmpty = data.every((d) => d.value === 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold tracking-tight">Parcelas por Status</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="apple-empty h-[220px]">
            <span className="apple-empty-icon"><Inbox className="h-6 w-6" /></span>
            <p className="apple-empty-title">Sem dados para exibir</p>
            <p className="apple-empty-subtitle">As parcelas aparecerão aqui assim que forem registradas.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border) / 0.5)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                content={<AppleChartTooltip />}
              />
              <Bar dataKey="value" name="Parcelas" radius={[8, 8, 0, 0]}>
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
