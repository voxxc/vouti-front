import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Gavel, MapPin, Search, Calendar, Clock } from "lucide-react";
import {
  useAudienciasIdentificadas,
  type AudienciaIdentificada,
} from "@/hooks/useAudienciasIdentificadas";

interface AudienciasDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MESES_LONGOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function formatHora(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function tipoVariant(tipo: string): "default" | "secondary" | "outline" {
  if (tipo === "Conciliação" || tipo === "Art. 334") return "default";
  if (tipo === "Instrução" || tipo === "Julgamento") return "secondary";
  return "outline";
}

function AudienciaCard({ a }: { a: AudienciaIdentificada }) {
  const dia = a.data_audiencia.getDate();
  const mesCurto = MESES_CURTOS[a.data_audiencia.getMonth()];
  return (
    <div className="rounded-lg border bg-card p-4 hover:bg-accent/30 transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-14 text-center">
          <div className="text-2xl font-bold leading-none">{dia}</div>
          <div className="text-xs uppercase text-muted-foreground mt-1">{mesCurto}</div>
          {a.hora_conhecida && (
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-2">
              <Clock className="h-3 w-3" />
              {formatHora(a.data_audiencia)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant={tipoVariant(a.tipo)}>{a.tipo}</Badge>
            {a.modalidade && (
              <Badge variant="outline" className="capitalize">
                {a.modalidade.toLowerCase()}
              </Badge>
            )}
          </div>

          {a.numero_cnj && (
            <div className="font-mono text-sm font-medium">{a.numero_cnj}</div>
          )}

          {(a.parte_ativa || a.parte_passiva) && (
            <div className="text-sm text-muted-foreground mt-1 truncate">
              {a.parte_ativa ?? "—"} <span className="mx-1">×</span> {a.parte_passiva ?? "—"}
            </div>
          )}

          {a.local && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-2">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2">{a.local}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function groupByMonth(items: AudienciaIdentificada[]) {
  const groups = new Map<string, { label: string; items: AudienciaIdentificada[] }>();
  for (const a of items) {
    const y = a.data_audiencia.getFullYear();
    const m = a.data_audiencia.getMonth();
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (!groups.has(key)) {
      groups.set(key, { label: `${MESES_LONGOS[m]} de ${y}`, items: [] });
    }
    groups.get(key)!.items.push(a);
  }
  return Array.from(groups.entries()).map(([key, v]) => ({ key, ...v }));
}

export function AudienciasDrawer({ open, onOpenChange }: AudienciasDrawerProps) {
  const { data = [], isLoading } = useAudienciasIdentificadas(open);
  const [tab, setTab] = useState<"proximas" | "realizadas" | "todas">("proximas");
  const [busca, setBusca] = useState("");

  const agora = useMemo(() => new Date(), [open]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return data.filter((a) => {
      if (!q) return true;
      return (
        a.numero_cnj?.toLowerCase().includes(q) ||
        a.parte_ativa?.toLowerCase().includes(q) ||
        a.parte_passiva?.toLowerCase().includes(q) ||
        a.local?.toLowerCase().includes(q) ||
        a.tipo.toLowerCase().includes(q)
      );
    });
  }, [data, busca]);

  const proximas = useMemo(
    () => filtered.filter((a) => a.data_audiencia >= agora)
      .sort((x, y) => x.data_audiencia.getTime() - y.data_audiencia.getTime()),
    [filtered, agora]
  );
  const realizadas = useMemo(
    () => filtered.filter((a) => a.data_audiencia < agora)
      .sort((x, y) => y.data_audiencia.getTime() - x.data_audiencia.getTime()),
    [filtered, agora]
  );
  const todas = useMemo(
    () => [...filtered].sort((x, y) => y.data_audiencia.getTime() - x.data_audiencia.getTime()),
    [filtered]
  );

  const lista =
    tab === "proximas" ? proximas : tab === "realizadas" ? realizadas : todas;
  const grupos = groupByMonth(lista);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="inset"
        className="p-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <SheetTitle className="sr-only">Audiências</SheetTitle>

        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b bg-background">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">Audiências</span>
            <Badge variant="secondary" className="ml-1">{data.length}</Badge>
          </div>
          <div className="relative w-72 max-w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por CNJ, parte, local..."
              className="pl-8 h-9"
            />
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 min-h-0 flex flex-col">
          <div className="px-6 pt-4">
            <TabsList>
              <TabsTrigger value="proximas">Próximas ({proximas.length})</TabsTrigger>
              <TabsTrigger value="realizadas">Realizadas ({realizadas.length})</TabsTrigger>
              <TabsTrigger value="todas">Todas ({todas.length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={tab} className="flex-1 min-h-0 overflow-auto p-6 mt-0">
            {isLoading ? (
              <div className="space-y-3 max-w-3xl mx-auto">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))}
              </div>
            ) : lista.length === 0 ? (
              <div className="max-w-2xl mx-auto text-center py-16">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                  <Calendar className="h-7 w-7 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Nenhuma audiência</h2>
                <p className="text-sm text-muted-foreground">
                  Não encontramos audiências{tab === "proximas" ? " futuras" : tab === "realizadas" ? " já realizadas" : ""} a partir dos andamentos dos seus processos.
                </p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-6">
                {grupos.map((g) => (
                  <div key={g.key}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      {g.label}
                    </div>
                    <div className="space-y-2">
                      {g.items.map((a) => (
                        <AudienciaCard key={a.andamento_id} a={a} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}