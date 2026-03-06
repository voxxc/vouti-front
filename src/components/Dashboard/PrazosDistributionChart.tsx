import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChartIcon } from "lucide-react";

interface PrazosDistributionChartProps {
  tenantId?: string;
}

const PERIOD_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "15", label: "15 dias" },
  { value: "30", label: "1 mês" },
  { value: "60", label: "2 meses" },
];

const COLORS = {
  concluidos: "#22c55e",
  atrasados: "#ef4444",
  pendentes: "#3b82f6",
};

const PrazosDistributionChart = ({ tenantId }: PrazosDistributionChartProps) => {
  const [period, setPeriod] = useState("30");
  const [selectedUser, setSelectedUser] = useState("all");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

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
        if (d.completed) concluidos++;
        else if (d.date < todayStr) atrasados++;
        else pendentes++;
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
  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label || "30 dias";
  const selectedUserObj = users?.find((u: any) => u.user_id === selectedUser);
  const userLabel = selectedUser === "all" ? "Todos" : (selectedUserObj?.full_name || selectedUserObj?.email || "Usuário");

  return (
    <Card className="bg-card hover:shadow-elegant transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-1 flex-wrap">
          <PieChartIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Prazos</CardTitle>
          <span className="text-muted-foreground text-[10px]">·</span>
          <Popover open={periodOpen} onOpenChange={setPeriodOpen}>
            <PopoverTrigger asChild>
              <button className="text-[10px] text-primary hover:underline cursor-pointer bg-transparent border-none p-0 font-medium">
                {periodLabel}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1" align="start">
              <div className="flex flex-col">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`text-xs px-3 py-1.5 text-left rounded hover:bg-accent transition-colors ${
                      period === opt.value ? "text-primary font-semibold" : "text-foreground"
                    }`}
                    onClick={() => { setPeriod(opt.value); setPeriodOpen(false); }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-[10px]">·</span>
          <Popover open={userOpen} onOpenChange={setUserOpen}>
            <PopoverTrigger asChild>
              <button className="text-[10px] text-primary hover:underline cursor-pointer bg-transparent border-none p-0 font-medium max-w-[60px] truncate">
                {userLabel}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1 max-h-48 overflow-y-auto" align="start">
              <div className="flex flex-col">
                <button
                  className={`text-xs px-3 py-1.5 text-left rounded hover:bg-accent transition-colors ${
                    selectedUser === "all" ? "text-primary font-semibold" : "text-foreground"
                  }`}
                  onClick={() => { setSelectedUser("all"); setUserOpen(false); }}
                >
                  Todos
                </button>
                {users?.map((u: any) => (
                  <button
                    key={u.user_id}
                    className={`text-xs px-3 py-1.5 text-left rounded hover:bg-accent transition-colors truncate ${
                      selectedUser === u.user_id ? "text-primary font-semibold" : "text-foreground"
                    }`}
                    onClick={() => { setSelectedUser(u.user_id); setUserOpen(false); }}
                  >
                    {u.full_name || u.email}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-[120px] w-full" />
        ) : total === 0 ? (
          <div className="flex items-center justify-center h-[120px] text-muted-foreground text-xs">
            Nenhum prazo no período
          </div>
        ) : (
          <>
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData?.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}`, name]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "11px",
                      color: "hsl(var(--card-foreground))",
                    }}
                    itemStyle={{
                      color: "hsl(var(--card-foreground))",
                    }}
                    labelStyle={{
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.concluidos }} />
                <span className="text-muted-foreground">{chartData?.[0]?.value || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.atrasados }} />
                <span className="text-muted-foreground">{chartData?.[1]?.value || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.pendentes }} />
                <span className="text-muted-foreground">{chartData?.[2]?.value || 0}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PrazosDistributionChart;
