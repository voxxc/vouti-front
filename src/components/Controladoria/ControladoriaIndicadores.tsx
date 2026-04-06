import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { extrairTribunalDoNumeroProcesso } from "@/utils/processoHelpers";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, CheckCircle2, Clock, AlertTriangle, Printer, CalendarClock, ChevronDown, ChevronUp, Filter, ChevronLeft, ChevronRight, TableIcon, Users, Settings, Trash2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/dateUtils";

interface TribunalCount {
  sigla: string;
  count: number;
  percentage: number;
}

interface RawDeadline {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  concluido_por: string | null;
  concluido_em: string | null;
  created_at: string;
  project_id: string | null;
  user_id: string;
  deadline_number: number | null;
}

interface ProfileInfo {
  name: string;
  avatar?: string;
}

const ITEMS_PER_PAGE = 50;

export const ControladoriaIndicadores = () => {
  const { tenantId } = useTenantId();
  const [data, setData] = useState<TribunalCount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Raw data
  const [allDeadlines, setAllDeadlines] = useState<RawDeadline[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, ProfileInfo>>(new Map());
  const [projectMap, setProjectMap] = useState<Map<string, string>>(new Map());
  const [loadingPrazos, setLoadingPrazos] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [userFilter, setUserFilter] = useState("todos");

  // View tab
  const [viewTab, setViewTab] = useState<"resumo" | "planilha" | "por-usuario">("resumo");

  // Expanded user
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Pagination for planilha
  const [currentPage, setCurrentPage] = useState(1);

  // Logo config
  const [logoEscritorio, setLogoEscritorio] = useState<string | null>(() => localStorage.getItem("escritorio_logo"));
  const [showLogoConfig, setShowLogoConfig] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      localStorage.setItem("escritorio_logo", base64);
      setLogoEscritorio(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    localStorage.removeItem("escritorio_logo");
    setLogoEscritorio(null);
  };

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tenantId) return;

    const fetchProcessos = async () => {
      setLoading(true);
      const { data: processos, error } = await supabase
        .from("processos_oab")
        .select("tribunal_sigla, numero_cnj")
        .eq("tenant_id", tenantId);

      if (error) { console.error(error); setLoading(false); return; }

      const map = new Map<string, number>();
      (processos || []).forEach((p) => {
        const sigla = p.tribunal_sigla || (p.numero_cnj ? extrairTribunalDoNumeroProcesso(p.numero_cnj) : "Desconhecido");
        map.set(sigla, (map.get(sigla) || 0) + 1);
      });

      const totalCount = processos?.length || 0;
      const sorted = Array.from(map.entries())
        .map(([sigla, count]) => ({ sigla, count, percentage: totalCount > 0 ? (count / totalCount) * 100 : 0 }))
        .sort((a, b) => b.count - a.count);

      setData(sorted);
      setTotal(totalCount);
      setLoading(false);
    };

    const fetchPrazos = async () => {
      setLoadingPrazos(true);

      const { data: deadlines, error } = await supabase
        .from("deadlines")
        .select("id, title, date, completed, concluido_por, concluido_em, created_at, project_id, user_id, deadline_number")
        .eq("tenant_id", tenantId);

      if (error) { console.error(error); setLoadingPrazos(false); return; }

      const all = (deadlines || []) as RawDeadline[];
      setAllDeadlines(all);

      // Fetch profiles for all relevant users
      const userIds = [...new Set([
        ...all.map(d => d.concluido_por).filter(Boolean),
        ...all.map(d => d.user_id),
      ])] as string[];

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);

        const pMap = new Map<string, ProfileInfo>();
        (profiles || []).forEach(p => pMap.set(p.user_id, { name: p.full_name || "Usuário desconhecido", avatar: p.avatar_url || undefined }));
        setProfileMap(pMap);
      }

      // Fetch project names
      const projectIds = [...new Set(all.map(d => d.project_id).filter(Boolean))] as string[];
      if (projectIds.length > 0) {
        const { data: projects } = await supabase
          .from("projects")
          .select("id, name")
          .in("id", projectIds);
        setProjectMap(new Map((projects || []).map(p => [p.id, p.name])));
      }

      setLoadingPrazos(false);
    };

    fetchProcessos();
    fetchPrazos();
  }, [tenantId]);

  // Filtered deadlines
  const filtered = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allDeadlines.filter(d => {
      if (dateFrom && d.date < dateFrom) return false;
      if (dateTo && d.date > dateTo) return false;

      if (statusFilter === "concluidos" && !d.completed) return false;
      if (statusFilter === "pendentes" && d.completed) return false;
      if (statusFilter === "atrasados") {
        if (d.completed) return false;
        const dd = parseLocalDate(d.date);
        if (dd >= today) return false;
      }

      if (userFilter !== "todos") {
        if (d.concluido_por !== userFilter && d.user_id !== userFilter) return false;
      }

      return true;
    });
  }, [allDeadlines, dateFrom, dateTo, statusFilter, userFilter]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, statusFilter, userFilter]);

  // Computed stats from filtered
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const concluidos = filtered.filter(d => d.completed);
    const pendentes = filtered.filter(d => !d.completed);
    const atrasados = pendentes.filter(d => parseLocalDate(d.date) < today);
    return { total: filtered.length, concluidos: concluidos.length, pendentes: pendentes.length, atrasados: atrasados.length };
  }, [filtered]);

  // User counts (completed)
  const userCounts = useMemo(() => {
    const map = new Map<string, number>();
    filtered.filter(d => d.completed && d.concluido_por).forEach(d => {
      map.set(d.concluido_por!, (map.get(d.concluido_por!) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([userId, count]) => ({ userId, name: profileMap.get(userId)?.name || "Usuário desconhecido", count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered, profileMap]);

  // Deadlines completed by a specific user
  const getDeadlinesForUser = (userId: string) => {
    return filtered
      .filter(d => d.completed && d.concluido_por === userId)
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  // Pending deadlines
  const pendingDeadlines = useMemo(() => {
    return filtered
      .filter(d => !d.completed)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  // Unique users for filter select
  const availableUsers = useMemo(() => {
    const ids = new Set<string>();
    allDeadlines.forEach(d => {
      if (d.concluido_por) ids.add(d.concluido_por);
      ids.add(d.user_id);
    });
    return Array.from(ids)
      .map(id => ({ id, name: profileMap.get(id)?.name || "Usuário desconhecido" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allDeadlines, profileMap]);

  // Planilha data: sorted by date desc
  const planilhaData = useMemo(() => {
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(planilhaData.length / ITEMS_PER_PAGE));
  const paginatedPlanilha = planilhaData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getStatus = (d: RawDeadline) => {
    if (d.completed) return "concluido";
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return parseLocalDate(d.date) < today ? "atrasado" : "pendente";
  };

  const handlePrint = () => {
    const filterDesc: string[] = [];
    if (dateFrom || dateTo) filterDesc.push(`Período: ${dateFrom || "início"} a ${dateTo || "atual"}`);
    if (statusFilter !== "todos") filterDesc.push(`Status: ${statusFilter}`);
    if (userFilter !== "todos") filterDesc.push(`Usuário: ${profileMap.get(userFilter)?.name || userFilter}`);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    if (viewTab === "planilha") {
      // Print spreadsheet view with ALL filtered data (not just current page)
      printWindow.document.write(`
        <html>
          <head>
            <title>Planilha de Prazos</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 16px; color: #111; font-size: 11px; }
              h1 { font-size: 16px; margin-bottom: 4px; }
              .meta { font-size: 10px; color: #555; margin-bottom: 8px; }
              table { width: 100%; border-collapse: collapse; margin-top: 8px; }
              th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; font-size: 10px; }
              th { background: #e5e7eb; font-weight: 700; }
              tr:nth-child(even) { background: #f9fafb; }
              .status-concluido { background: #d1fae5; color: #065f46; font-weight: 600; }
              .status-pendente { background: #fef3c7; color: #92400e; font-weight: 600; }
              .status-atrasado { background: #fee2e2; color: #991b1b; font-weight: 600; }
              @media print { body { padding: 8px; } }
            </style>
          </head>
          <body>
            <h1>Planilha de Prazos</h1>
            <p class="meta">Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} — ${planilhaData.length} registro(s)</p>
            ${filterDesc.length > 0 ? `<p class="meta">Filtros: ${filterDesc.join(" | ")}</p>` : ""}
            <table>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Título</th>
                  <th>Data Prazo</th>
                  <th>Criado em</th>
                  <th>Concluído em</th>
                  <th>Status</th>
                  <th>Responsável</th>
                  <th>Concluído por</th>
                  <th>Projeto</th>
                </tr>
              </thead>
              <tbody>
                ${planilhaData.map(d => {
                  const status = getStatus(d);
                  const statusLabel = status === "concluido" ? "Concluído" : status === "atrasado" ? "Atrasado" : "Pendente";
                  return `<tr>
                    <td>${d.deadline_number || "—"}</td>
                    <td>${d.title}</td>
                    <td>${format(parseLocalDate(d.date), "dd/MM/yyyy")}</td>
                    <td>${d.created_at ? format(new Date(d.created_at), "dd/MM/yyyy HH:mm") : "—"}</td>
                    <td>${d.concluido_em ? format(new Date(d.concluido_em), "dd/MM/yyyy HH:mm") : "—"}</td>
                    <td class="status-${status}">${statusLabel}</td>
                    <td>${profileMap.get(d.user_id)?.name || "—"}</td>
                    <td>${d.concluido_por ? (profileMap.get(d.concluido_por)?.name || "—") : "—"}</td>
                    <td>${d.project_id ? (projectMap.get(d.project_id) || "—") : "—"}</td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </body>
        </html>
      `);
    } else if (viewTab === "por-usuario") {
      const totalConcluidos = userCounts.reduce((s, u) => s + u.count, 0);
      printWindow.document.write(`
        <html>
          <head>
            <title>Prazos por Usuário</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
              h1 { font-size: 18px; margin-bottom: 4px; }
              .meta { font-size: 12px; color: #555; margin-bottom: 12px; }
              table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
              th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
              th { background: #e5e7eb; font-weight: 700; }
              tr:nth-child(even) { background: #f9fafb; }
              tfoot td { font-weight: 700; background: #f3f4f6; border-top: 2px solid #999; }
              .right { text-align: right; }
              @media print { body { padding: 8px; } }
            </style>
          </head>
          <body>
            <h1>Prazos Concluídos por Usuário</h1>
            <p class="meta">Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
            ${filterDesc.length > 0 ? `<p class="meta">Filtros: ${filterDesc.join(" | ")}</p>` : ""}
            <table>
              <thead><tr><th>Usuário</th><th class="right">Prazos Concluídos</th></tr></thead>
              <tbody>
                ${userCounts.map(u => `<tr><td>${u.name}</td><td class="right">${u.count}</td></tr>`).join("")}
              </tbody>
              <tfoot><tr><td>Total</td><td class="right">${totalConcluidos}</td></tr></tfoot>
            </table>
          </body>
        </html>
      `);
    } else {
      // Print resumo view
      printWindow.document.write(`
        <html>
          <head>
            <title>Indicadores - Prazos</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
              h1 { font-size: 18px; margin-bottom: 4px; }
              h2 { font-size: 15px; margin-top: 20px; margin-bottom: 8px; }
              .filters { font-size: 12px; color: #555; margin-bottom: 12px; }
              .stats { display: flex; gap: 16px; margin-bottom: 16px; }
              .stat { border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; min-width: 120px; }
              .stat-label { font-size: 12px; color: #666; }
              .stat-value { font-size: 22px; font-weight: 700; }
              table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
              th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #eee; }
              th { font-weight: 600; background: #f9f9f9; }
              .muted { color: #888; font-size: 12px; }
              .overdue { color: #dc2626; font-weight: 600; }
            </style>
          </head>
          <body>
            <h1>Relatório de Prazos</h1>
            <p class="muted">Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
            ${filterDesc.length > 0 ? `<p class="filters">Filtros: ${filterDesc.join(" | ")}</p>` : ""}
            <div class="stats">
              <div class="stat"><div class="stat-label">Total</div><div class="stat-value">${stats.total}</div></div>
              <div class="stat"><div class="stat-label">Concluídos</div><div class="stat-value">${stats.concluidos}</div></div>
              <div class="stat"><div class="stat-label">Pendentes</div><div class="stat-value">${stats.pendentes}</div></div>
              <div class="stat"><div class="stat-label">Atrasados</div><div class="stat-value">${stats.atrasados}</div></div>
            </div>
            ${userCounts.length > 0 ? `
              <h2>Prazos concluídos por usuário</h2>
              ${userCounts.map(u => {
                const userDeadlines = getDeadlinesForUser(u.userId);
                return `
                  <table>
                    <thead><tr><th colspan="3">${u.name} — ${u.count} concluído(s)</th></tr></thead>
                    <tbody>
                      ${userDeadlines.map(d => `<tr><td>${d.title}</td><td>${format(parseLocalDate(d.date), "dd/MM/yyyy")}</td><td>${d.project_id ? projectMap.get(d.project_id) || "—" : "—"}</td></tr>`).join("")}
                    </tbody>
                  </table>
                `;
              }).join("")}
            ` : ""}
            ${pendingDeadlines.length > 0 ? `
              <h2>Prazos pendentes (${pendingDeadlines.length})</h2>
              <table>
                <thead><tr><th>Título</th><th>Data</th><th>Projeto</th></tr></thead>
                <tbody>${pendingDeadlines.map(d => {
                  const dd = parseLocalDate(d.date);
                  const today = new Date(); today.setHours(0,0,0,0);
                  const cls = dd < today ? ' class="overdue"' : '';
                  return `<tr><td${cls}>${d.title}</td><td${cls}>${format(dd, "dd/MM/yyyy")}</td><td>${d.project_id ? projectMap.get(d.project_id) || "—" : "—"}</td></tr>`;
                }).join("")}</tbody>
              </table>
            ` : ""}
          </body>
        </html>
      `);
    }
    printWindow.document.close();
    printWindow.print();
  };

  const maxCount = data[0]?.count || 1;

  return (
    <div className="space-y-6" ref={printRef}>
      {/* Seção: Prazos */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Indicadores de Prazos
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={() => setShowLogoConfig(true)} className="h-8 w-8" title="Configurar logo do escritório">
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-3.5 w-3.5" />
              Imprimir / PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Filtros */}
          <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Filtros
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">De</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-36 text-xs" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Até</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-36 text-xs" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="concluidos">Concluídos</SelectItem>
                  <SelectItem value="pendentes">Pendentes</SelectItem>
                  <SelectItem value="atrasados">Atrasados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Usuário</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {availableUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(dateFrom || dateTo || statusFilter !== "todos" || userFilter !== "todos") && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilter("todos"); setUserFilter("todos"); }}>
                Limpar
              </Button>
            )}
          </div>

          {loadingPrazos ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <Tabs value={viewTab} onValueChange={v => setViewTab(v as "resumo" | "planilha" | "por-usuario")}>
              <TabsList className="mb-4">
                <TabsTrigger value="resumo" className="gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Resumo
                </TabsTrigger>
                <TabsTrigger value="planilha" className="gap-1.5">
                  <TableIcon className="h-3.5 w-3.5" />
                  Planilha
                </TabsTrigger>
                <TabsTrigger value="por-usuario" className="gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Por Usuário
                </TabsTrigger>
              </TabsList>

              <TabsContent value="resumo" className="space-y-5 mt-0">
                {/* Cards de resumo */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border bg-card p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Total
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Concluídos
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-emerald-600">
                      {stats.concluidos}
                      {stats.total > 0 && (
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          ({((stats.concluidos / stats.total) * 100).toFixed(0)}%)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      Pendentes
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-amber-600">{stats.pendentes}</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      Atrasados
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-destructive">{stats.atrasados}</p>
                  </div>
                </div>

                {/* Tabela: concluídos por usuário (expandível) */}
                {userCounts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Prazos concluídos por usuário</h4>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead className="w-28 text-right">Concluídos</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userCounts.map(u => {
                            const isExpanded = expandedUserId === u.userId;
                            const userDeadlines = isExpanded ? getDeadlinesForUser(u.userId) : [];
                            return (
                              <>
                                <TableRow
                                  key={u.userId}
                                  className="cursor-pointer hover:bg-muted/50"
                                  onClick={() => setExpandedUserId(isExpanded ? null : u.userId)}
                                >
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                      {u.name}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant="secondary" className="tabular-nums">{u.count}</Badge>
                                  </TableCell>
                                </TableRow>
                                {isExpanded && userDeadlines.map(d => (
                                  <TableRow key={d.id} className="bg-muted/20">
                                    <TableCell className="pl-10 text-sm text-muted-foreground">{d.title}</TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground">
                                      {format(parseLocalDate(d.date), "dd/MM/yyyy")}
                                      {d.project_id && projectMap.get(d.project_id) && (
                                        <span className="ml-2">• {projectMap.get(d.project_id)}</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Tabela: prazos pendentes */}
                {pendingDeadlines.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Prazos pendentes ({pendingDeadlines.length})</h4>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Título</TableHead>
                            <TableHead className="w-28">Data</TableHead>
                            <TableHead>Projeto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingDeadlines.map(d => {
                            const deadlineDate = parseLocalDate(d.date);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const isOverdue = deadlineDate < today;

                            return (
                              <TableRow key={d.id}>
                                <TableCell className="font-medium">{d.title}</TableCell>
                                <TableCell>
                                  <span className={isOverdue ? "text-destructive font-medium" : ""}>
                                    {format(deadlineDate, "dd/MM/yyyy")}
                                  </span>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {d.project_id ? projectMap.get(d.project_id) || "—" : "—"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {stats.total === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum prazo encontrado para os filtros selecionados.</p>
                )}
              </TabsContent>

              <TabsContent value="planilha" className="mt-0">
                {planilhaData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum prazo encontrado para os filtros selecionados.</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-muted-foreground">
                        {planilhaData.length} registro(s) — Página {currentPage} de {totalPages}
                      </p>
                    </div>
                    <div className="rounded-md border overflow-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border border-border px-2 py-1.5 text-left font-semibold text-muted-foreground w-12">Nº</th>
                            <th className="border border-border px-2 py-1.5 text-left font-semibold text-muted-foreground">Título</th>
                            <th className="border border-border px-2 py-1.5 text-left font-semibold text-muted-foreground w-24">Data Prazo</th>
                            <th className="border border-border px-2 py-1.5 text-left font-semibold text-muted-foreground w-32">Criado em</th>
                            <th className="border border-border px-2 py-1.5 text-left font-semibold text-muted-foreground w-32">Concluído em</th>
                            <th className="border border-border px-2 py-1.5 text-center font-semibold text-muted-foreground w-24">Status</th>
                            <th className="border border-border px-2 py-1.5 text-left font-semibold text-muted-foreground">Responsável</th>
                            <th className="border border-border px-2 py-1.5 text-left font-semibold text-muted-foreground">Concluído por</th>
                            <th className="border border-border px-2 py-1.5 text-left font-semibold text-muted-foreground">Projeto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPlanilha.map((d, idx) => {
                            const status = getStatus(d);
                            const isEven = idx % 2 === 0;
                            return (
                              <tr key={d.id} className={isEven ? "bg-background" : "bg-muted/30"}>
                                <td className="border border-border px-2 py-1 tabular-nums text-muted-foreground">{d.deadline_number || "—"}</td>
                                <td className="border border-border px-2 py-1 font-medium">{d.title}</td>
                                <td className="border border-border px-2 py-1 tabular-nums">{format(parseLocalDate(d.date), "dd/MM/yyyy")}</td>
                                <td className="border border-border px-2 py-1 tabular-nums text-muted-foreground">
                                  {d.created_at ? format(new Date(d.created_at), "dd/MM/yyyy HH:mm") : "—"}
                                </td>
                                <td className="border border-border px-2 py-1 tabular-nums text-muted-foreground">
                                  {d.concluido_em ? format(new Date(d.concluido_em), "dd/MM/yyyy HH:mm") : "—"}
                                </td>
                                <td className="border border-border px-2 py-1 text-center">
                                  {status === "concluido" && (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                      Concluído
                                    </span>
                                  )}
                                  {status === "pendente" && (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                      Pendente
                                    </span>
                                  )}
                                  {status === "atrasado" && (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                                      Atrasado
                                    </span>
                                  )}
                                </td>
                                <td className="border border-border px-2 py-1">{profileMap.get(d.user_id)?.name || "—"}</td>
                                <td className="border border-border px-2 py-1">{d.concluido_por ? (profileMap.get(d.concluido_por)?.name || "—") : "—"}</td>
                                <td className="border border-border px-2 py-1 text-muted-foreground">{d.project_id ? (projectMap.get(d.project_id) || "—") : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(p => p - 1)}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Anterior
                        </Button>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {currentPage} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(p => p + 1)}
                        >
                          Próximo
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="por-usuario" className="mt-0">
                {userCounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum prazo concluído encontrado para os filtros selecionados.</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead className="font-semibold">Usuário</TableHead>
                          <TableHead className="w-40 text-right font-semibold">Prazos Concluídos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userCounts.map((u, idx) => (
                          <TableRow key={u.userId} className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="tabular-nums">{u.count}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <tfoot>
                        <tr className="border-t bg-muted/50 font-medium">
                          <td className="p-4 font-semibold">Total</td>
                          <td className="p-4 text-right">
                            <Badge className="tabular-nums">{userCounts.reduce((sum, u) => sum + u.count, 0)}</Badge>
                          </td>
                        </tr>
                      </tfoot>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Seção existente: Processos por Tribunal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Processos por Tribunal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-2.5 w-full" />
                </div>
              ))}
            </div>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum processo encontrado.</p>
          ) : (
            data.map((item) => (
              <div key={item.sigla} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">{item.sigla}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {item.count} ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={(item.count / maxCount) * 100} className="h-1.5" />
              </div>
            ))
          )}
        </CardContent>
        {data.length > 0 && (
          <CardFooter className="text-xs text-muted-foreground pt-0">
            Total: {total} processos
          </CardFooter>
        )}
      </Card>
    </div>
  );
};
