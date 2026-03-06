import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChartIcon } from "lucide-react";

interface PrazosDistributionChartProps {
  tenantId?: string;
}

const PERIOD_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "15", label: "Últimos 15 dias" },
  { value: "30", label: "Último mês" },
  { value: "60", label: "Últimos 2 meses" },
];

const COLORS = {
  concluidos: "#22c55e",
  atrasados: "#ef4444",
  pendentes: "#3b82f6",
};

const PrazosDistributionChart = ({ tenantId }: PrazosDistributionChartProps) => {
  const [period, setPeriod] = useState("30");
  const [selectedUser, setSelectedUser] = useState("all");

  const { data: users } = useQuery({
    queryKey: ["tenant-users-for-chart"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_users_with_roles");
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: chartData, isLoading } = useQuery({
    queryKey: ["prazos-distribution", period, selectedUser, tenantId],
    queryFn: async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - parseInt(period));

      let query = supabase
        .from("deadlines")
        .select("id, completed, date")
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", today.toISOString().split("T")[0]);

      if (selectedUser !== "all") {
        // Filter by user_id OR advogado_responsavel_id
        query = query.or(`user_id.eq.${selectedUser},advogado_responsavel_id.eq.${selectedUser}`);
      }

      const { data, error } = await query;
      if (error) {
        console.error("[PrazosDistribution]", error);
        return [];
      }

      const todayStr = today.toISOString().split("T")[0];
      let concluidos = 0;
      let atrasados = 0;
      let pendentes = 0;

      (data || []).forEach((d) => {
        if (d.completed) {
          concluidos++;
        } else if (d.date < todayStr) {
          atrasados++;
        } else {
          pendentes++;
        }
      });

      return [
        { name: "Concluídos", value: concluidos, fill: COLORS.concluidos },
        { name: "Atrasados", value: atrasados, fill: COLORS.atrasados },
        { name: "Pendentes", value: pendentes, fill: COLORS.pendentes },
      ];
    },
    staleTime: 3 * 60 * 1000,
    enabled: !!tenantId,
  });

  const total = chartData?.reduce((sum, d) => sum + d.value, 0) || 0;

  return (
    <Card className="bg-card">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">Distribuição de Prazos</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {users?.map((u: any) => (
                  <SelectItem key={u.user_id} value={u.user_id}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : total === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            Nenhum prazo encontrado no período
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-[200px] h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData?.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} prazos`, name]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.concluidos }} />
                <span className="text-muted-foreground">Concluídos:</span>
                <span className="font-semibold">{chartData?.[0]?.value || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.atrasados }} />
                <span className="text-muted-foreground">Atrasados:</span>
                <span className="font-semibold">{chartData?.[1]?.value || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.pendentes }} />
                <span className="text-muted-foreground">Pendentes:</span>
                <span className="font-semibold">{chartData?.[2]?.value || 0}</span>
              </div>
              <div className="pt-1 border-t border-border text-xs text-muted-foreground">
                Total: <span className="font-medium text-foreground">{total}</span> prazos
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrazosDistributionChart;
