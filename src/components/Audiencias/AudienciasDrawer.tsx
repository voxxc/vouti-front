import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Gavel, Search, RefreshCw, MapPin, Clock, Plus, X, MessageSquare,
  History, FileText, Send, Trash2, Calendar as CalendarIcon, ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  useAudiencias, useSyncAudiencias, useAudienciaDetalhe,
  useAudienciaMutations, useTenantUsers,
  type AudienciaRow, type AudienciaStatus,
} from "@/hooks/useAudiencias";

interface AudienciasDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MESES_LONGOS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_CURTOS = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const DIAS = ["dom","seg","ter","qua","qui","sex","sáb"];

const STATUS_META: Record<AudienciaStatus, { label: string; dot: string; chip: string }> = {
  pendente:   { label: "Pendente",   dot: "bg-amber-500",  chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  confirmada: { label: "Confirmada", dot: "bg-emerald-500",chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  realizada:  { label: "Realizada",  dot: "bg-sky-500",    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  cancelada:  { label: "Cancelada",  dot: "bg-rose-500",   chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  adiada:     { label: "Adiada",     dot: "bg-muted-foreground", chip: "bg-muted text-muted-foreground border-border" },
};

function initials(name?: string | null) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}
function fmtHora(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

export function AudienciasDrawer({ open, onOpenChange }: AudienciasDrawerProps) {
  const { data: list = [], isLoading } = useAudiencias(open);
  const sync = useSyncAudiencias();
  const [tab, setTab] = useState<"proximas" | "realizadas" | "todas">("proximas");
  const [busca, setBusca] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [didAutoSync, setDidAutoSync] = useState(false);

  // Auto-sync na primeira abertura
  useEffect(() => {
    if (open && !didAutoSync && list.length === 0 && !isLoading) {
      sync.mutate();
      setDidAutoSync(true);
    }
  }, [open, didAutoSync, list.length, isLoading]); // eslint-disable-line

  const agora = useMemo(() => new Date(), [open, list.length]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return list.filter((a) => {
      if (!q) return true;
      return (
        a.numero_cnj?.toLowerCase().includes(q) ||
        a.parte_ativa?.toLowerCase().includes(q) ||
        a.parte_passiva?.toLowerCase().includes(q) ||
        a.local?.toLowerCase().includes(q) ||
        a.tipo.toLowerCase().includes(q)
      );
    });
  }, [list, busca]);

  const proximas = useMemo(() => filtered.filter((a) => new Date(a.data_audiencia) >= agora)
      .sort((x,y) => +new Date(x.data_audiencia) - +new Date(y.data_audiencia)), [filtered, agora]);
  const realizadas = useMemo(() => filtered.filter((a) => new Date(a.data_audiencia) < agora)
      .sort((x,y) => +new Date(y.data_audiencia) - +new Date(x.data_audiencia)), [filtered, agora]);
  const todas = useMemo(() => [...filtered]
      .sort((x,y) => +new Date(y.data_audiencia) - +new Date(x.data_audiencia)), [filtered]);

  const lista = tab === "proximas" ? proximas : tab === "realizadas" ? realizadas : todas;

  // Auto-selecionar primeiro item ao abrir
  useEffect(() => {
    if (open && !selectedId && lista.length) setSelectedId(lista[0].id);
    if (selectedId && !list.find((a) => a.id === selectedId)) setSelectedId(null);
  }, [open, lista, selectedId, list]);

  const selected = list.find((a) => a.id === selectedId) ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="inset"
        className="p-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <SheetTitle className="sr-only">Audiências</SheetTitle>

        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-3 border-b bg-background">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">Audiências</span>
            <Badge variant="secondary" className="ml-1">{list.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-72 max-w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por CNJ, parte, local..."
                className="pl-8 h-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", sync.isPending && "animate-spin")} />
              Sincronizar
            </Button>
          </div>
        </div>

        {/* Split */}
        <div className="flex-1 min-h-0 flex">
          {/* Lista */}
          <div className="w-[380px] border-r flex flex-col bg-muted/20">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <div className="px-3 pt-3">
                <TabsList className="w-full grid grid-cols-3 h-8">
                  <TabsTrigger value="proximas" className="text-xs">Próximas ({proximas.length})</TabsTrigger>
                  <TabsTrigger value="realizadas" className="text-xs">Realizadas ({realizadas.length})</TabsTrigger>
                  <TabsTrigger value="todas" className="text-xs">Todas ({todas.length})</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value={tab} className="mt-0">
                <ScrollArea className="h-[calc(100vh-160px)]">
                  {isLoading ? (
                    <div className="p-3 space-y-2">
                      {[1,2,3,4].map((i) => <Skeleton key={i} className="h-20 w-full rounded-md" />)}
                    </div>
                  ) : lista.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhuma audiência {tab === "proximas" ? "futura" : tab === "realizadas" ? "realizada" : ""}.
                    </div>
                  ) : (
                    <ListaItens items={lista} selectedId={selectedId} onSelect={setSelectedId} />
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Detalhe */}
          <div className="flex-1 min-w-0 bg-background">
            {selected ? (
              <DetalhePane key={selected.id} audiencia={selected} />
            ) : (
              <div className="h-full flex items-center justify-center text-center p-10">
                <div>
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <Gavel className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Selecione uma audiência ao lado para ver detalhes, responsáveis, comentários e histórico.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===================== Lista =====================
function ListaItens({
  items, selectedId, onSelect,
}: { items: AudienciaRow[]; selectedId: string | null; onSelect: (id: string) => void }) {
  // Agrupar por mês
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: AudienciaRow[] }>();
    for (const a of items) {
      const d = new Date(a.data_audiencia);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,"0")}`;
      if (!map.has(key)) map.set(key, { label: `${MESES_LONGOS[d.getMonth()]} ${d.getFullYear()}`, items: [] });
      map.get(key)!.items.push(a);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <div>
      {groups.map(([k, g]) => (
        <div key={k}>
          <div className="sticky top-0 z-10 px-3 py-1.5 bg-muted/60 backdrop-blur text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b">
            {g.label}
          </div>
          {g.items.map((a) => (
            <ListaRow key={a.id} a={a} selected={a.id === selectedId} onClick={() => onSelect(a.id)} />
          ))}
        </div>
      ))}
    </div>
  );
}

function ListaRow({ a, selected, onClick }: { a: AudienciaRow; selected: boolean; onClick: () => void }) {
  const d = new Date(a.data_audiencia);
  const meta = STATUS_META[a.status];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left flex gap-3 px-3 py-3 border-b border-border/50 hover:bg-accent/40 transition-colors relative",
        selected && "bg-accent border-l-2 border-l-primary"
      )}
    >
      <div className="w-12 flex-shrink-0 text-center">
        <div className="text-lg font-bold leading-none">{d.getDate()}</div>
        <div className="text-[10px] uppercase text-muted-foreground mt-0.5">{MESES_CURTOS[d.getMonth()]}</div>
        {a.hora_conhecida && (
          <div className="text-[10px] text-muted-foreground mt-1 font-mono">{fmtHora(a.data_audiencia)}</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", meta.dot)} />
          <span className="text-xs font-medium truncate">{a.tipo}</span>
          {a.comentarios_count ? (
            <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" />{a.comentarios_count}
            </span>
          ) : null}
        </div>
        {a.numero_cnj && (
          <div className="font-mono text-[11px] text-muted-foreground mt-0.5 truncate">{a.numero_cnj}</div>
        )}
        {a.local && (
          <div className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">{a.local}</div>
        )}
        {a.responsaveis && a.responsaveis.length > 0 && (
          <div className="flex -space-x-1.5 mt-1.5">
            {a.responsaveis.slice(0, 3).map((r) => (
              <Avatar key={r.id} className="h-5 w-5 ring-2 ring-background">
                {r.avatar_url && <AvatarImage src={r.avatar_url} />}
                <AvatarFallback className="text-[9px]">{initials(r.full_name)}</AvatarFallback>
              </Avatar>
            ))}
            {a.responsaveis.length > 3 && (
              <div className="h-5 w-5 rounded-full bg-muted ring-2 ring-background flex items-center justify-center text-[9px] font-medium">
                +{a.responsaveis.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

// ===================== Detalhe =====================
function DetalhePane({ audiencia }: { audiencia: AudienciaRow }) {
  const { setStatus } = useAudienciaMutations();
  const d = new Date(audiencia.data_audiencia);
  const meta = STATUS_META[audiencia.status];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
              <CalendarIcon className="h-3.5 w-3.5" />
              {DIAS[d.getDay()]}, {d.getDate()} de {MESES_LONGOS[d.getMonth()].toLowerCase()} de {d.getFullYear()}
              {audiencia.hora_conhecida && (
                <>
                  <span className="opacity-50">·</span>
                  <Clock className="h-3.5 w-3.5" />
                  {fmtHora(audiencia.data_audiencia)}
                </>
              )}
            </div>
            <h2 className="text-xl font-semibold mt-1 flex items-center gap-2">
              Audiência de {audiencia.tipo}
              {audiencia.modalidade && (
                <Badge variant="outline" className="capitalize text-[10px] font-normal">
                  {audiencia.modalidade.toLowerCase()}
                </Badge>
              )}
            </h2>
            {audiencia.local && (
              <div className="flex items-start gap-1.5 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{audiencia.local}</span>
              </div>
            )}
          </div>
          <Select
            value={audiencia.status}
            onValueChange={(v) => setStatus.mutate({ id: audiencia.id, status: v as AudienciaStatus })}
          >
            <SelectTrigger className={cn("w-[160px] h-8 border", meta.chip)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_META) as AudienciaStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_META[s].dot)} />
                    {STATUS_META[s].label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 space-y-6 max-w-3xl">
          <ProcessoBloco audiencia={audiencia} />
          <ResponsaveisBloco audiencia={audiencia} />
          <TabsBloco audiencia={audiencia} />
        </div>
      </ScrollArea>
    </div>
  );
}

function ProcessoBloco({ audiencia }: { audiencia: AudienciaRow }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Processo</h3>
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="font-mono text-sm font-medium">{audiencia.numero_cnj ?? "—"}</div>
          {audiencia.processo_oab_id && (
            <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              <a href={`/solvenza/processos/${audiencia.processo_oab_id}`} target="_blank" rel="noreferrer">
                Abrir <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
        {(audiencia.parte_ativa || audiencia.parte_passiva) && (
          <div className="text-sm text-muted-foreground mt-1">
            {audiencia.parte_ativa ?? "—"} <span className="mx-1.5 opacity-50">×</span> {audiencia.parte_passiva ?? "—"}
          </div>
        )}
        {audiencia.juizo && (
          <div className="text-xs text-muted-foreground mt-1">{audiencia.juizo}</div>
        )}
      </div>
    </section>
  );
}

function ResponsaveisBloco({ audiencia }: { audiencia: AudienciaRow }) {
  const { addResponsavel, removeResponsavel } = useAudienciaMutations();
  const [openPop, setOpenPop] = useState(false);
  const [filter, setFilter] = useState("");
  const { data: users = [] } = useTenantUsers(openPop);
  const existingIds = new Set((audiencia.responsaveis ?? []).map((r) => r.user_id));
  const available = users.filter((u: any) =>
    !existingIds.has(u.user_id) &&
    (u.full_name?.toLowerCase().includes(filter.toLowerCase()) ||
     u.email?.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responsáveis</h3>
        <Popover open={openPop} onOpenChange={setOpenPop}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" /> Adicionar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="end">
            <Input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar usuário..."
              className="h-8 mb-2"
            />
            <ScrollArea className="h-56">
              {available.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">Nenhum usuário</div>
              ) : available.map((u: any) => (
                <button
                  key={u.user_id}
                  type="button"
                  onClick={() => {
                    addResponsavel.mutate({ audiencia_id: audiencia.id, user_id: u.user_id, papel: "titular" });
                    setOpenPop(false);
                    setFilter("");
                  }}
                  className="w-full text-left flex items-center gap-2 p-2 rounded hover:bg-accent"
                >
                  <Avatar className="h-7 w-7">
                    {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                    <AvatarFallback className="text-[10px]">{initials(u.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm truncate">{u.full_name ?? u.email}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {!audiencia.responsaveis || audiencia.responsaveis.length === 0 ? (
        <div className="text-sm text-muted-foreground italic">Nenhum responsável marcado.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {audiencia.responsaveis.map((r) => (
            <div key={r.id} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border bg-card">
              <Avatar className="h-6 w-6">
                {r.avatar_url && <AvatarImage src={r.avatar_url} />}
                <AvatarFallback className="text-[9px]">{initials(r.full_name)}</AvatarFallback>
              </Avatar>
              <span className="text-xs">{r.full_name ?? "—"}</span>
              <Badge variant="secondary" className="text-[9px] h-4 capitalize">{r.papel}</Badge>
              <button
                type="button"
                onClick={() => removeResponsavel.mutate({ id: r.id, audiencia_id: audiencia.id })}
                className="text-muted-foreground hover:text-destructive ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TabsBloco({ audiencia }: { audiencia: AudienciaRow }) {
  const [tab, setTab] = useState<"coment" | "hist" | "andam">("coment");
  return (
    <section>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="coment" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Comentários
            {(audiencia.comentarios_count ?? 0) > 0 && (
              <Badge variant="secondary" className="h-4 text-[10px] ml-1">{audiencia.comentarios_count}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="hist" className="gap-1.5">
            <History className="h-3.5 w-3.5" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="andam" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Andamento
          </TabsTrigger>
        </TabsList>
        <TabsContent value="coment" className="mt-3">
          <ComentariosTab audiencia={audiencia} />
        </TabsContent>
        <TabsContent value="hist" className="mt-3">
          <HistoricoTab audiencia={audiencia} />
        </TabsContent>
        <TabsContent value="andam" className="mt-3">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap leading-relaxed">
            {audiencia.descricao_origem || "Sem descrição do andamento de origem."}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}

function ComentariosTab({ audiencia }: { audiencia: AudienciaRow }) {
  const { comentarios } = useAudienciaDetalhe(audiencia.id);
  const { addComentario, deleteComentario } = useAudienciaMutations();
  const [txt, setTxt] = useState("");

  const submit = async () => {
    if (!txt.trim()) return;
    await addComentario.mutateAsync({ audiencia_id: audiencia.id, comentario: txt.trim() });
    setTxt("");
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {comentarios.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (comentarios.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sem comentários ainda. Seja o primeiro.</p>
        ) : (
          (comentarios.data ?? []).map((c) => (
            <div key={c.id} className="flex gap-2 group">
              <Avatar className="h-7 w-7 mt-0.5 flex-shrink-0">
                {c.autor?.avatar_url && <AvatarImage src={c.autor.avatar_url} />}
                <AvatarFallback className="text-[10px]">{initials(c.autor?.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 rounded-lg bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{c.autor?.full_name ?? "Usuário"}</span>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteComentario.mutate({ id: c.id, audiencia_id: audiencia.id })}
                    className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="text-sm mt-0.5 whitespace-pre-wrap">{c.comentario}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2 items-end pt-2 border-t">
        <Textarea
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          placeholder="Escrever comentário..."
          rows={2}
          className="flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
          }}
        />
        <Button
          size="icon"
          onClick={submit}
          disabled={!txt.trim() || addComentario.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function acaoLabel(acao: string): string {
  switch (acao) {
    case "criada": return "Audiência criada";
    case "status_alterado": return "Status alterado";
    case "dados_alterados": return "Dados atualizados";
    case "responsavel_adicionado": return "Responsável adicionado";
    case "responsavel_removido": return "Responsável removido";
    case "comentario": return "Comentário";
    default: return acao;
  }
}

function HistoricoTab({ audiencia }: { audiencia: AudienciaRow }) {
  const { historico } = useAudienciaDetalhe(audiencia.id);
  if (historico.isLoading) return <Skeleton className="h-16 w-full" />;
  const rows = historico.data ?? [];
  if (!rows.length) return <p className="text-sm text-muted-foreground italic">Sem registros.</p>;

  return (
    <div className="space-y-2">
      {rows.map((h) => (
        <div key={h.id} className="flex gap-3 text-sm">
          <div className="w-1.5 mt-2 flex-shrink-0">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
          <div className="flex-1 min-w-0 pb-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <span className="font-medium text-xs">{acaoLabel(h.acao)}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(h.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {h.autor?.full_name ?? "Sistema"}
              {h.acao === "status_alterado" && h.para && (
                <> · <span className="capitalize">{h.de?.status ?? "—"}</span> → <span className="capitalize">{h.para.status}</span></>
              )}
              {h.acao === "comentario" && h.para?.preview && (
                <> · "{h.para.preview}"</>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}