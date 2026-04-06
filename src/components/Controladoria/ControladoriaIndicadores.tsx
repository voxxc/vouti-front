import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { extrairTribunalDoNumeroProcesso } from "@/utils/processoHelpers";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, CheckCircle2, Clock, AlertTriangle, Printer, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/dateUtils";

interface TribunalCount {
  sigla: string;
  count: number;
  percentage: number;
}

interface UserDeadlineCount {
  userId: string;
  name: string;
  avatar?: string;
  count: number;
}

interface PendingDeadline {
  id: string;
  title: string;
  date: string;
  projectName?: string;
}

export const ControladoriaIndicadores = () => {
  const { tenantId } = useTenantId();
  const [data, setData] = useState<TribunalCount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Prazos state
  const [deadlineStats, setDeadlineStats] = useState({ total: 0, concluidos: 0, pendentes: 0, atrasados: 0 });
  const [userCounts, setUserCounts] = useState<UserDeadlineCount[]>([]);
  const [pendingDeadlines, setPendingDeadlines] = useState<PendingDeadline[]>([]);
  const [loadingPrazos, setLoadingPrazos] = useState(true);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tenantId) return;

    const fetchProcessos = async () => {
      setLoading(true);
      const { data: processos, error } = await supabase
        .from("processos_oab")
        .select("tribunal_sigla, numero_cnj")
        .eq("tenant_id", tenantId);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const map = new Map<string, number>();
      (processos || []).forEach((p) => {
        const sigla = p.tribunal_sigla || (p.numero_cnj ? extrairTribunalDoNumeroProcesso(p.numero_cnj) : "Desconhecido");
        map.set(sigla, (map.get(sigla) || 0) + 1);
      });

      const totalCount = processos?.length || 0;
      const sorted = Array.from(map.entries())
        .map(([sigla, count]) => ({
          sigla,
          count,
          percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      setData(sorted);
      setTotal(totalCount);
      setLoading(false);
    };

    const fetchPrazos = async () => {
      setLoadingPrazos(true);

      // Buscar todos os deadlines do tenant
      const { data: deadlines, error } = await supabase
        .from("deadlines")
        .select("id, title, date, completed, concluido_por, concluido_em, project_id")
        .eq("tenant_id", tenantId);

      if (error) {
        console.error(error);
        setLoadingPrazos(false);
        return;
      }

      const all = deadlines || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const concluidos = all.filter(d => d.completed);
      const pendentes = all.filter(d => !d.completed);
      const atrasados = pendentes.filter(d => {
        const deadlineDate = parseLocalDate(d.date);
        return deadlineDate < today;
      });

      setDeadlineStats({
        total: all.length,
        concluidos: concluidos.length,
        pendentes: pendentes.length,
        atrasados: atrasados.length,
      });

      // Agrupar concluídos por usuário
      const userMap = new Map<string, { name: string; avatar?: string; count: number }>();
      const userIds = [...new Set(concluidos.map(d => d.concluido_por).filter(Boolean))] as string[];

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

        concluidos.forEach(d => {
          if (!d.concluido_por) return;
          const existing = userMap.get(d.concluido_por);
          if (existing) {
            existing.count++;
          } else {
            const profile = profileMap.get(d.concluido_por);
            userMap.set(d.concluido_por, {
              name: profile?.full_name || "Usuário desconhecido",
              avatar: profile?.avatar_url || undefined,
              count: 1,
            });
          }
        });
      }

      setUserCounts(
        Array.from(userMap.entries())
          .map(([userId, v]) => ({ userId, ...v }))
          .sort((a, b) => b.count - a.count)
      );

      // Prazos pendentes (próximos 20, ordenados por data)
      const projectIds = [...new Set(pendentes.map(d => d.project_id).filter(Boolean))] as string[];
      let projectMap = new Map<string, string>();
      if (projectIds.length > 0) {
        const { data: projects } = await supabase
          .from("projects")
          .select("id, name")
          .in("id", projectIds);
        projectMap = new Map((projects || []).map(p => [p.id, p.name]));
      }

      setPendingDeadlines(
        pendentes
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 20)
          .map(d => ({
            id: d.id,
            title: d.title,
            date: d.date,
            projectName: d.project_id ? projectMap.get(d.project_id) : undefined,
          }))
      );

      setLoadingPrazos(false);
    };

    fetchProcessos();
    fetchPrazos();
  }, [tenantId]);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Indicadores - Prazos</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            h2 { font-size: 15px; margin-top: 20px; margin-bottom: 8px; }
            .stats { display: flex; gap: 16px; margin-bottom: 16px; }
            .stat { border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; min-width: 120px; }
            .stat-label { font-size: 12px; color: #666; }
            .stat-value { font-size: 22px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
            th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #eee; }
            th { font-weight: 600; background: #f9f9f9; }
            .muted { color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Relatório de Prazos</h1>
          <p class="muted">Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
          <div class="stats">
            <div class="stat"><div class="stat-label">Total</div><div class="stat-value">${deadlineStats.total}</div></div>
            <div class="stat"><div class="stat-label">Concluídos</div><div class="stat-value">${deadlineStats.concluidos}</div></div>
            <div class="stat"><div class="stat-label">Pendentes</div><div class="stat-value">${deadlineStats.pendentes}</div></div>
            <div class="stat"><div class="stat-label">Atrasados</div><div class="stat-value">${deadlineStats.atrasados}</div></div>
          </div>
          ${userCounts.length > 0 ? `
            <h2>Prazos concluídos por usuário</h2>
            <table>
              <thead><tr><th>Usuário</th><th>Concluídos</th></tr></thead>
              <tbody>${userCounts.map(u => `<tr><td>${u.name}</td><td>${u.count}</td></tr>`).join("")}</tbody>
            </table>
          ` : ""}
          ${pendingDeadlines.length > 0 ? `
            <h2>Prazos pendentes</h2>
            <table>
              <thead><tr><th>Título</th><th>Data</th><th>Projeto</th></tr></thead>
              <tbody>${pendingDeadlines.map(d => `<tr><td>${d.title}</td><td>${format(parseLocalDate(d.date), "dd/MM/yyyy")}</td><td>${d.projectName || "—"}</td></tr>`).join("")}</tbody>
            </table>
          ` : ""}
        </body>
      </html>
    `);
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
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {loadingPrazos ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              {/* Cards de resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Total
                  </div>
                  <p className="text-2xl font-bold tabular-nums">{deadlineStats.total}</p>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Concluídos
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-emerald-600">
                    {deadlineStats.concluidos}
                    {deadlineStats.total > 0 && (
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        ({((deadlineStats.concluidos / deadlineStats.total) * 100).toFixed(0)}%)
                      </span>
                    )}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    Pendentes
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-amber-600">{deadlineStats.pendentes}</p>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    Atrasados
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-destructive">{deadlineStats.atrasados}</p>
                </div>
              </div>

              {/* Tabela: concluídos por usuário */}
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
                        {userCounts.map(u => (
                          <TableRow key={u.userId}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="tabular-nums">{u.count}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Tabela: prazos pendentes */}
              {pendingDeadlines.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Prazos pendentes (próximos 20)</h4>
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
                              <TableCell className="text-muted-foreground">{d.projectName || "—"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {deadlineStats.total === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum prazo encontrado.</p>
              )}
            </>
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
