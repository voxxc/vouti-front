import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AppleChartTooltip } from "./AppleChartTooltip";
import { LineChart as LineChartIcon } from "lucide-react";

interface MonthData {
  mes: string;
  receita: number;
  custos: number;
}

interface Props {
  data: MonthData[];
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FinanceiroReceitaCustosChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold tracking-tight">Receitas vs Custos (6 meses)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="apple-empty h-[250px]">
            <span className="apple-empty-icon"><LineChartIcon className="h-6 w-6" /></span>
            <p className="apple-empty-title">Sem dados no período</p>
            <p className="apple-empty-subtitle">Receitas e custos dos últimos 6 meses aparecerão aqui.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border) / 0.5)" vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "2 4" }}
                content={<AppleChartTooltip valueFormatter={formatCurrency} />}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="receita"
                name="Receitas"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--chart-2))" }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
              />
              <Line
                type="monotone"
                dataKey="custos"
                name="Custos"
                stroke="hsl(var(--chart-5))"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--chart-5))" }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
