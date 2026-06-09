import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPaginated } from "@/lib/supabasePagination";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Search, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { exportAdministrativoDanielPDF } from "./AdministrativoDanielPDF";

const SOLVENZA_TENANT_ID = "27492091-e05d-46a8-9ee8-b3b47ec894e4";

export interface EtapaRow {
  etapa_id: string;
  etapa_nome: string;
  status: string | null;
  data_conclusao: string | null;
  updated_at: string | null;
  protocolo_id: string;
  protocolo_nome: string;
  project_id: string;
  cliente_nome: string;
}

export type ProtocoloTipo = "revisional" | "mandamental";

export interface ProtocoloAgregado {
  protocolo_id: string;
  protocolo_nome: string;
  project_id: string;
  cliente_nome: string;
  tipo: ProtocoloTipo;
  etapas: EtapaRow[];
  concluido: boolean;
  data_conclusao: string | null;
  updated_at: string | null;
}

const normalize = (s: string | null | undefined) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim();

const classificarTipo = (nome: string): ProtocoloTipo | null => {
  const n = normalize(nome);
  if (n.startsWith("REVISIONAL")) return "revisional";
  if (n.includes("MANDAMENTAL")) return "mandamental";
  return null;
};

const isAdministrativa = (nome: string) => normalize(nome).startsWith("ADMINISTRATIV");

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const AdministrativoDanielTab = () => {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EtapaRow[]>([]);
  const [tab, setTab] = useState<ProtocoloTipo>("revisional");
  const [statusFilter, setStatusFilter] = useState<"todos" | "concluidos" | "pendentes">("todos");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const tid = tenantId || SOLVENZA_TENANT_ID;
        const { data, error } = await fetchAllPaginated<any>(() =>
          supabase
            .from("project_protocolo_etapas")
            .select(
              "id, nome, status, data_conclusao, updated_at, protocolo_id, project_protocolos!inner(id, nome, project_id, projects!inner(id, name, tenant_id))"
            )
            .eq("tenant_id", tid)
            .order("id")
        );
        if (error) throw error;
        const flat: EtapaRow[] = (data || [])
          .filter((r: any) => isAdministrativa(r.nome))
          .map((r: any) => ({
            etapa_id: r.id,
            etapa_nome: r.nome,
            status: r.status,
            data_conclusao: r.data_conclusao,
            updated_at: r.updated_at,
            protocolo_id: r.project_protocolos?.id,
            protocolo_nome: r.project_protocolos?.nome || "",
            project_id: r.project_protocolos?.projects?.id,
            cliente_nome: r.project_protocolos?.projects?.name || "—",
          }))
          .filter((r) => classificarTipo(r.protocolo_nome) !== null);
        setRows(flat);
      } catch (e: any) {
        console.error("[AdministrativoDanielTab] erro:", e);
        toast.error("Erro ao carregar dados: " + (e.message || ""));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tenantId]);

  const protocolos = useMemo<ProtocoloAgregado[]>(() => {
    const map = new Map<string, ProtocoloAgregado>();
    for (const r of rows) {
      const tipo = classificarTipo(r.protocolo_nome)!;
      const existing = map.get(r.protocolo_id);
      if (existing) {
        existing.etapas.push(r);
      } else {
        map.set(r.protocolo_id, {
          protocolo_id: r.protocolo_id,
          protocolo_nome: r.protocolo_nome,
          project_id: r.project_id,
          cliente_nome: r.cliente_nome,
          tipo,
          etapas: [r],
          concluido: false,
          data_conclusao: null,
          updated_at: null,
        });
      }
    }
    for (const p of map.values()) {
      const todasConcluidas = p.etapas.every((e) => (e.status || "").toLowerCase() === "concluido");
      p.concluido = todasConcluidas;
      const datasConcl = p.etapas.map((e) => e.data_conclusao).filter(Boolean) as string[];
      p.data_conclusao = datasConcl.length ? datasConcl.sort().slice(-1)[0] : null;
      const ups = p.etapas.map((e) => e.updated_at).filter(Boolean) as string[];
      p.updated_at = ups.length ? ups.sort().slice(-1)[0] : null;
    }
    return Array.from(map.values()).sort((a, b) => a.cliente_nome.localeCompare(b.cliente_nome));
  }, [rows]);

  const stats = useMemo(() => {
    const make = (tipo: ProtocoloTipo) => {
      const list = protocolos.filter((p) => p.tipo === tipo);
      const concl = list.filter((p) => p.concluido).length;
      const pend = list.length - concl;
      return { total: list.length, concluidos: concl, pendentes: pend, pct: list.length ? (concl / list.length) * 100 : 0 };
    };
    return { revisional: make("revisional"), mandamental: make("mandamental") };
  }, [protocolos]);

  const visibleRows = useMemo(() => {
    const q = normalize(search);
    return protocolos
      .filter((p) => p.tipo === tab)
      .filter((p) => {
        if (statusFilter === "concluidos") return p.concluido;
        if (statusFilter === "pendentes") return !p.concluido;
        return true;
      })
      .filter((p) => !q || normalize(p.cliente_nome).includes(q) || normalize(p.protocolo_nome).includes(q));
  }, [protocolos, tab, statusFilter, search]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAdministrativoDanielPDF(protocolos, stats);
      toast.success("PDF gerado com sucesso");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao gerar PDF: " + (e.message || ""));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const KpiCard = ({ title, data, color }: { title: string; data: typeof stats.revisional; color: string }) => (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge variant="outline" className="text-xs">{data.total} protocolos</Badge>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Concluídos
          </div>
          <div className="text-2xl font-bold text-foreground">{data.concluidos}</div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Clock className="h-3.5 w-3.5 text-amber-500" /> Pendentes
          </div>
          <div className="text-2xl font-bold text-foreground">{data.pendentes}</div>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Conclusão</span>
          <span>{data.pct.toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all`} style={{ width: `${data.pct}%` }} />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Administrativo — Daniel</h2>
          <p className="text-sm text-muted-foreground">
            Visão das etapas administrativas sob sua responsabilidade nos projetos Revisionais e Mandamentais.
          </p>
        </div>
        <Button onClick={handleExport} disabled={exporting} className="gap-2">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiCard title="Revisionais" data={stats.revisional} color="bg-blue-500" />
        <KpiCard title="Mandamentais" data={stats.mandamental} color="bg-violet-500" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ProtocoloTipo)}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <TabsList>
            <TabsTrigger value="revisional">Revisionais ({stats.revisional.total})</TabsTrigger>
            <TabsTrigger value="mandamental">Mandamentais ({stats.mandamental.total})</TabsTrigger>
          </TabsList>
          <div className="flex gap-2 items-center">
            <div className="flex gap-1 bg-muted rounded-md p-0.5 text-xs">
              {(["todos", "concluidos", "pendentes"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded ${statusFilter === s ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                >
                  {s === "todos" ? "Todos" : s === "concluidos" ? "Concluídos" : "Pendentes"}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente/protocolo"
                className="h-8 pl-8 w-64 text-sm"
              />
            </div>
          </div>
        </div>

        <TabsContent value="revisional" className="mt-4">
          <ProtocoloTable items={visibleRows} />
        </TabsContent>
        <TabsContent value="mandamental" className="mt-4">
          <ProtocoloTable items={visibleRows} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ProtocoloTable = ({ items }: { items: ProtocoloAgregado[] }) => (
  <Card className="overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr className="text-left text-xs uppercase text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Cliente</th>
            <th className="px-4 py-2.5 font-medium">Protocolo</th>
            <th className="px-4 py-2.5 font-medium">Etapas</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Concluído em</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                Nenhum protocolo encontrado.
              </td>
            </tr>
          )}
          {items.map((p) => (
            <tr key={p.protocolo_id} className="hover:bg-muted/30">
              <td className="px-4 py-2.5 font-medium text-foreground">{p.cliente_nome}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{p.protocolo_nome}</td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {p.etapas.filter((e) => (e.status || "").toLowerCase() === "concluido").length}/{p.etapas.length}
              </td>
              <td className="px-4 py-2.5">
                {p.concluido ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 border-emerald-500/30">
                    Concluído
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 border-amber-500/30">
                    Pendente
                  </Badge>
                )}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{formatDate(p.data_conclusao)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Card>
);