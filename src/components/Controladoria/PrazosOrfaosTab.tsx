import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Link2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useTenantId } from "@/hooks/useTenantId";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPaginated, fetchAllPaginatedIn } from "@/lib/supabasePagination";
import { parseLocalDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

interface OrphanDeadline {
  id: string;
  deadline_number: number | null;
  title: string;
  description: string | null;
  date: string;
  completed: boolean;
  created_at: string;
  project_id: string | null;
  workspace_id: string | null;
  user_id: string | null;
  advogado_responsavel_id: string | null;
  project_name?: string;
  project_client?: string;
  workspace_name?: string;
  creator_name?: string;
  responsavel_name?: string;
}

interface Protocolo {
  id: string;
  nome: string;
  workspace_id: string | null;
  processo_oab_id: string | null;
}

interface Etapa {
  id: string;
  nome: string;
  protocolo_id: string;
  ordem: number | null;
  status: string | null;
}

export function PrazosOrfaosTab() {
  const { tenantId } = useTenantId();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<OrphanDeadline[]>([]);
  const [protocolosByProject, setProtocolosByProject] = useState<Record<string, Protocolo[]>>({});
  const [etapasByProtocolo, setEtapasByProtocolo] = useState<Record<string, Etapa[]>>({});

  // Filtros
  const [search, setSearch] = useState("");
  const [filterCreator, setFilterCreator] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");

  // Dialog de vínculo
  const [linkRow, setLinkRow] = useState<OrphanDeadline | null>(null);
  const [linkProtocoloId, setLinkProtocoloId] = useState<string>("");
  const [linkEtapaId, setLinkEtapaId] = useState<string>("");
  const [linking, setLinking] = useState(false);

  // Exclusão
  const [deleteRow, setDeleteRow] = useState<OrphanDeadline | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    if (!tenantId) return;
    setRefreshing(true);
    try {
      // 1. Buscar todos os prazos órfãos (sem limite de 1000)
      const { data: deadlines, error } = await fetchAllPaginated<any>(() =>
        supabase
          .from("deadlines")
          .select(
            "id, deadline_number, title, description, date, completed, created_at, project_id, workspace_id, user_id, advogado_responsavel_id"
          )
          .eq("tenant_id", tenantId)
          .is("protocolo_etapa_id", null)
          .is("processo_oab_id", null)
          .not("project_id", "is", null)
          .order("created_at", { ascending: false })
      );

      if (error) throw error;

      const list = (deadlines || []) as OrphanDeadline[];

      // 2. Resolver nomes de projetos, workspaces, criadores e responsáveis em batch
      const projectIds = Array.from(new Set(list.map((d) => d.project_id).filter(Boolean) as string[]));
      const workspaceIds = Array.from(new Set(list.map((d) => d.workspace_id).filter(Boolean) as string[]));
      const userIds = Array.from(
        new Set([
          ...list.map((d) => d.user_id).filter(Boolean),
          ...list.map((d) => d.advogado_responsavel_id).filter(Boolean),
        ] as string[])
      );

      const [{ data: projects }, { data: workspaces }, { data: profiles }, { data: protocolos }] =
        await Promise.all([
          fetchAllPaginatedIn<{ id: string; name: string; client: string | null }>(
            projectIds,
            (chunk) => supabase.from("projects").select("id, name, client").in("id", chunk)
          ),
          fetchAllPaginatedIn<{ id: string; nome: string }>(workspaceIds, (chunk) =>
            supabase.from("project_workspaces").select("id, nome").in("id", chunk)
          ),
          fetchAllPaginatedIn<{ user_id: string; full_name: string }>(userIds, (chunk) =>
            supabase.from("profiles").select("user_id, full_name").in("user_id", chunk)
          ),
          fetchAllPaginatedIn<Protocolo>(projectIds, (chunk) =>
            supabase
              .from("project_protocolos")
              .select("id, nome, workspace_id, processo_oab_id, project_id")
              .in("project_id", chunk)
          ),
        ]);

      const projectMap = new Map((projects || []).map((p: any) => [p.id, p]));
      const wsMap = new Map((workspaces || []).map((w: any) => [w.id, w]));
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const protocolosByProj: Record<string, Protocolo[]> = {};
      ((protocolos || []) as any[]).forEach((p: any) => {
        const arr = protocolosByProj[p.project_id] || [];
        arr.push(p);
        protocolosByProj[p.project_id] = arr;
      });

      setProtocolosByProject(protocolosByProj);

      const enriched = list.map((d) => {
        const proj = d.project_id ? (projectMap.get(d.project_id) as any) : null;
        const ws = d.workspace_id ? (wsMap.get(d.workspace_id) as any) : null;
        const creator = d.user_id ? (profileMap.get(d.user_id) as any) : null;
        const resp = d.advogado_responsavel_id
          ? (profileMap.get(d.advogado_responsavel_id) as any)
          : null;
        return {
          ...d,
          project_name: proj?.name,
          project_client: proj?.client,
          workspace_name: ws?.nome,
          creator_name: creator?.full_name,
          responsavel_name: resp?.full_name,
        };
      });

      setRows(enriched);
    } catch (err: any) {
      console.error("[PrazosOrfaosTab] fetchData error:", err);
      toast({
        title: "Erro ao carregar prazos órfãos",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // Carrega etapas do protocolo selecionado no dialog
  useEffect(() => {
    const load = async () => {
      if (!linkProtocoloId || etapasByProtocolo[linkProtocoloId]) return;
      const { data } = await supabase
        .from("project_protocolo_etapas")
        .select("id, nome, protocolo_id, ordem, status")
        .eq("protocolo_id", linkProtocoloId)
        .order("ordem");
      setEtapasByProtocolo((prev) => ({ ...prev, [linkProtocoloId]: (data || []) as Etapa[] }));
    };
    load();
  }, [linkProtocoloId, etapasByProtocolo]);

  const creators = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      if (r.user_id && r.creator_name) map.set(r.user_id, r.creator_name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      if (r.project_id && r.project_name) map.set(r.project_id, r.project_name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterCreator !== "all" && r.user_id !== filterCreator) return false;
      if (filterProject !== "all" && r.project_id !== filterProject) return false;
      if (q) {
        const hay = `${r.title} ${r.description ?? ""} ${r.project_name ?? ""} ${
          r.project_client ?? ""
        } ${r.workspace_name ?? ""} ${r.creator_name ?? ""} ${r.responsavel_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterCreator, filterProject, search]);

  const openLinkDialog = (row: OrphanDeadline) => {
    setLinkRow(row);
    setLinkProtocoloId("");
    setLinkEtapaId("");
  };

  const handleLink = async () => {
    if (!linkRow || !linkProtocoloId) return;
    setLinking(true);
    try {
      const protocolo = (protocolosByProject[linkRow.project_id || ""] || []).find(
        (p) => p.id === linkProtocoloId
      );
      const { error } = await supabase
        .from("deadlines")
        .update({
          protocolo_etapa_id: linkEtapaId || null,
          processo_oab_id: protocolo?.processo_oab_id || null,
          workspace_id: protocolo?.workspace_id || linkRow.workspace_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", linkRow.id);

      if (error) throw error;

      toast({
        title: "Prazo vinculado",
        description: linkEtapaId
          ? "Vinculado ao protocolo e etapa escolhidos."
          : "Vinculado ao protocolo escolhido.",
      });
      setLinkRow(null);
      setRows((prev) => prev.filter((r) => r.id !== linkRow.id));
    } catch (err: any) {
      toast({
        title: "Erro ao vincular",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLinking(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("deadlines").delete().eq("id", deleteRow.id);
      if (error) throw error;
      toast({ title: "Prazo excluído" });
      setRows((prev) => prev.filter((r) => r.id !== deleteRow.id));
      setDeleteRow(null);
    } catch (err: any) {
      toast({
        title: "Erro ao excluir",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const linkProtocolos = linkRow
    ? (protocolosByProject[linkRow.project_id || ""] || []).filter(
        (p) => !linkRow.workspace_id || !p.workspace_id || p.workspace_id === linkRow.workspace_id
      )
    : [];

  const linkEtapas = linkProtocoloId ? etapasByProtocolo[linkProtocoloId] || [] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="apple-h2">Prazos OF (órfãos)</h2>
            <p className="apple-subtitle text-xs">
              Prazos vinculados a um projeto mas sem protocolo nem processo de origem.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-lg">
            {filteredRows.length} de {rows.length}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input
          placeholder="Buscar por título, projeto, cliente, usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={filterCreator} onValueChange={setFilterCreator}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os criadores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os criadores</SelectItem>
            {creators.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os projetos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            {projects.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Nº</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Projeto / Workspace</TableHead>
              <TableHead>Criador</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!loading && filteredRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum prazo órfão encontrado.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              filteredRows.map((row) => {
                const date = parseLocalDate(row.date);
                const protocolosCount = (protocolosByProject[row.project_id || ""] || []).length;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {row.deadline_number ?? "-"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.title}</div>
                      {row.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {row.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(date, "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{row.project_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.workspace_name || "Sem workspace"}
                        {row.project_client ? ` · ${row.project_client}` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{row.creator_name || "—"}</TableCell>
                    <TableCell className="text-sm">{row.responsavel_name || "—"}</TableCell>
                    <TableCell>
                      {row.completed ? (
                        <Badge variant="secondary">Concluído</Badge>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="default"
                          size="sm"
                          disabled={protocolosCount === 0}
                          title={
                            protocolosCount === 0
                              ? "Projeto não tem protocolos cadastrados"
                              : "Vincular a um protocolo"
                          }
                          onClick={() => openLinkDialog(row)}
                        >
                          <Link2 className="h-4 w-4 mr-1" />
                          Vincular
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setDeleteRow(row)}
                          title="Excluir prazo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de vínculo */}
      <Dialog open={!!linkRow} onOpenChange={(open) => !open && setLinkRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular prazo a um protocolo</DialogTitle>
            <DialogDescription>
              {linkRow ? (
                <>
                  <strong>{linkRow.title}</strong> · {linkRow.project_name}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Protocolo *</label>
              <Select value={linkProtocoloId} onValueChange={setLinkProtocoloId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o protocolo" />
                </SelectTrigger>
                <SelectContent>
                  {linkProtocolos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {linkProtocoloId && linkEtapas.length > 0 && (
              <div>
                <label className="text-sm font-medium">Etapa (opcional)</label>
                <Select value={linkEtapaId || "none"} onValueChange={(v) => setLinkEtapaId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem etapa</SelectItem>
                    {linkEtapas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkRow(null)} disabled={linking}>
              Cancelar
            </Button>
            <Button onClick={handleLink} disabled={!linkProtocoloId || linking}>
              {linking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRow} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir prazo?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow ? (
                <>
                  Tem certeza que deseja excluir <strong>{deleteRow.title}</strong>? Esta ação não
                  pode ser desfeita.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default PrazosOrfaosTab;