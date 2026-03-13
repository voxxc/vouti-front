import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChartIcon, ChevronRight, Scale, BarChart3 } from "lucide-react";

interface PrazosDistributionChartProps {
  tenantId?: string;
  userRole?: string;
}

const PERIOD_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "15", label: "15 dias" },
  { value: "30", label: "1 mês" },
  { value: "60", label: "2 meses" },
  { value: "all", label: "Todos" },
];

const COLORS = {
  concluidos: "#22c55e",
  atrasados: "#ef4444",
  pendentes: "#3b82f6",
};

const TOGGLE_ROLES = ["admin", "controller", "perito"];

type ViewType = "geral" | "pericial" | "categorias";

const DEADLINE_CATEGORIES = [
  "Revisional",
  "Embargos",
  "Contestação",
  "Exceção de Pré-executividade",
  "Impugnação ao laudo pericial",
  "Elaboração de quesitos",
  "Liquidação de sentença",
  "Cumprimento de Sentença",
  "Laudo complementar",
  "Outros",
];

const VIEW_CYCLE: ViewType[] = ["geral", "pericial", "categorias"];

const PrazosDistributionChart = ({ tenantId, userRole }: PrazosDistributionChartProps) => {
  const [view, setView] = useState<ViewType>(userRole === "perito" ? "pericial" : "geral");
  const [period, setPeriod] = useState("30");
  const [selectedUser, setSelectedUser] = useState("all");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const canToggle = userRole && TOGGLE_ROLES.includes(userRole);

  // Fetch perito user IDs directly from user_roles table
  const { data: peritoUserIds } = useQuery({
    queryKey: ["perito-user-ids", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "perito");
      return new Set((data || []).map((r: any) => r.user_id));
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!tenantId,
  });

  const { data: users } = useQuery({
    queryKey: ["tenant-users-for-chart"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_users_with_roles");
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if ((view === "pericial" || view === "categorias") && peritoUserIds) {
      return (users as any[]).filter((u: any) => peritoUserIds.has(u.user_id));
    }
    return users as any[];
  }, [users, view, peritoUserIds]);

  // Fetch deadlines with expanded date window (past + future)
  const { data: rawDeadlines, isLoading } = useQuery({
    queryKey: ["prazos-distribution-raw", period, selectedUser, tenantId, view],
    queryFn: async () => {
      const today = new Date();

      let query = supabase
        .from("deadlines")
        .select("id, completed, date, user_id, advogado_responsavel_id, deadline_category");

      if (period !== "all") {
        const days = parseInt(period);
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - days);
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + days);

        query = query
          .gte("date", startDate.toISOString().split("T")[0])
          .lte("date", endDate.toISOString().split("T")[0]);
      }

      if (selectedUser !== "all") {
        query = query.or(`user_id.eq.${selectedUser},advogado_responsavel_id.eq.${selectedUser}`);
      }

      const { data, error } = await query;
      if (error) {
        console.error("[PrazosDistribution]", error);
        return [];
      }

      let filtered = data || [];

      // In pericial/categorias view, only include deadlines from perito users
      if ((view === "pericial" || view === "categorias") && peritoUserIds && peritoUserIds.size > 0) {
        filtered = filtered.filter(
          (d) => peritoUserIds.has(d.user_id) || (d.advogado_responsavel_id && peritoUserIds.has(d.advogado_responsavel_id))
        );
      }

      return filtered;
    },
    staleTime: 3 * 60 * 1000,
    enabled: !!tenantId,
  });

  // Compute stats
  const stats = useMemo(() => {
    if (!rawDeadlines) return { concluidos: 0, atrasados: 0, pendentes: 0, total: 0 };
    const todayStr = new Date().toISOString().split("T")[0];
    let concluidos = 0, atrasados = 0, pendentes = 0;
    rawDeadlines.forEach((d) => {
      if (d.completed) concluidos++;
      else if (d.date < todayStr) atrasados++;
      else pendentes++;
    });
    return { concluidos, atrasados, pendentes, total: concluidos + atrasados + pendentes };
  }, [rawDeadlines]);

  // Pie chart data
  const pieData = useMemo(() => [
    { name: "Concluídos", value: stats.concluidos, fill: COLORS.concluidos },
    { name: "Atrasados", value: stats.atrasados, fill: COLORS.atrasados },
    { name: "Pendentes", value: stats.pendentes, fill: COLORS.pendentes },
  ], [stats]);

  // Stacked bar data (categorias)
  const categoryData = useMemo(() => {
    if (!rawDeadlines) return [];
    const todayStr = new Date().toISOString().split("T")[0];
    const catMap: Record<string, { concluidos: number; atrasados: number; pendentes: number }> = {};

    rawDeadlines.forEach((d) => {
      const cat = d.deadline_category || "Outros";
      if (!catMap[cat]) catMap[cat] = { concluidos: 0, atrasados: 0, pendentes: 0 };
      if (d.completed) catMap[cat].concluidos++;
      else if (d.date < todayStr) catMap[cat].atrasados++;
      else catMap[cat].pendentes++;
    });

    return Object.entries(catMap)
      .map(([name, vals]) => ({ name, ...vals }))
      .sort((a, b) => (b.concluidos + b.atrasados + b.pendentes) - (a.concluidos + a.atrasados + a.pendentes));
  }, [rawDeadlines]);

  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label || "30 dias";
  const selectedUserObj = filteredUsers?.find((u: any) => u.user_id === selectedUser);
  const userLabel = selectedUser === "all" ? "Todos" : (selectedUserObj?.full_name || selectedUserObj?.email || "Usuário");

  const handleToggle = () => {
    const currentIndex = VIEW_CYCLE.indexOf(view);
    const nextIndex = (currentIndex + 1) % VIEW_CYCLE.length;
    setView(VIEW_CYCLE[nextIndex]);
    setSelectedUser("all");
  };

  const ViewIcon = view === "categorias" ? BarChart3 : view === "pericial" ? Scale : PieChartIcon;
  const viewTitle = view === "categorias" ? "Por Categoria" : view === "pericial" ? "Periciais" : "Prazos";

  return (
    <Card className="bg-card hover:shadow-elegant transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-1 flex-wrap min-w-0 flex-1">
          <ViewIcon className="h-4 w-4 text-primary shrink-0" />
          <CardTitle className="text-sm font-medium">{viewTitle}</CardTitle>
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
                {filteredUsers?.map((u: any) => (
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
        {canToggle && (
          <button
            onClick={handleToggle}
            className="p-0.5 rounded hover:bg-accent transition-all duration-200 text-muted-foreground hover:text-primary shrink-0"
            title={view === "geral" ? "Ver prazos periciais" : view === "pericial" ? "Ver por categoria" : "Ver prazos gerais"}
          >
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform duration-200 ${view === "categorias" ? "rotate-180" : view === "pericial" ? "rotate-90" : ""}`}
            />
          </button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-[120px] w-full" />
        ) : view === "categorias" ? (
          categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[120px] text-muted-foreground text-xs">
              Nenhum prazo categorizado
            </div>
          ) : (
            <>
              {/* Summary stats for categorias view */}
              <div className="flex items-center justify-between text-[10px] px-0.5">
                <span className="text-muted-foreground font-medium">{stats.total} prazos · {categoryData.length} categorias</span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: COLORS.concluidos }} />
                    <span className="text-muted-foreground">{stats.concluidos}</span>
                  </span>
                  <span className="flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: COLORS.atrasados }} />
                    <span className="text-muted-foreground">{stats.atrasados}</span>
                  </span>
                  <span className="flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: COLORS.pendentes }} />
                    <span className="text-muted-foreground">{stats.pendentes}</span>
                  </span>
                </div>
              </div>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 4, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: "hsl(var(--card-foreground))",
                      }}
                      itemStyle={{ color: "hsl(var(--card-foreground))" }}
                    />
                    <Bar dataKey="concluidos" name="Concluídos" stackId="a" fill={COLORS.concluidos} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="atrasados" name="Atrasados" stackId="a" fill={COLORS.atrasados} />
                    <Bar dataKey="pendentes" name="Pendentes" stackId="a" fill={COLORS.pendentes} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px]">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.concluidos }} />
                  <span className="text-muted-foreground">Concl.</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.atrasados }} />
                  <span className="text-muted-foreground">Atras.</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.pendentes }} />
                  <span className="text-muted-foreground">Pend.</span>
                </div>
              </div>
            </>
          )
        ) : stats.total === 0 ? (
          <div className="flex items-center justify-center h-[120px] text-muted-foreground text-xs">
            Nenhum prazo no período
          </div>
        ) : (
          <>
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData?.map((entry, index) => (
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
                    itemStyle={{ color: "hsl(var(--card-foreground))" }}
                    labelStyle={{ color: "hsl(var(--card-foreground))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.concluidos }} />
                <span className="text-muted-foreground">{stats.concluidos}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.atrasados }} />
                <span className="text-muted-foreground">{stats.atrasados}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.pendentes }} />
                <span className="text-muted-foreground">{stats.pendentes}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export { DEADLINE_CATEGORIES };
export default PrazosDistributionChart;
