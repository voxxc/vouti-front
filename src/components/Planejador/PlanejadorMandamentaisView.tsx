import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, MoreVertical, User, ClipboardList, CheckCircle2, Archive, Loader2, Pencil, UserPlus, Search, ExternalLink, Trash2, RotateCcw, CalendarClock, AlarmClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Mandamental,
  useMandamentais,
  useCreateMandamental,
  useUpdateMandamental,
  useAtribuirMandamental,
  useArquivarMandamental,
  useReabrirMandamental,
  useDeleteMandamental,
} from "@/hooks/usePlanejadorMandamentais";
import { CreateDeadlineDialog } from "@/components/Agenda/CreateDeadlineDialog";
import { parseLocalDate } from "@/lib/dateUtils";

// Ordena mandamentais: prazo não concluído por data asc; sem prazo por created_at desc; concluídos no fim
function sortByUrgency(list: Mandamental[]): Mandamental[] {
  const withOpen: Mandamental[] = [];
  const withoutDeadline: Mandamental[] = [];
  const completed: Mandamental[] = [];
  for (const r of list) {
    if (r.deadline && !r.deadline.completed) withOpen.push(r);
    else if (r.deadline && r.deadline.completed) completed.push(r);
    else withoutDeadline.push(r);
  }
  withOpen.sort((a, b) => (a.deadline!.date < b.deadline!.date ? -1 : 1));
  withoutDeadline.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  completed.sort((a, b) => (a.deadline!.date < b.deadline!.date ? 1 : -1));
  return [...withOpen, ...withoutDeadline, ...completed];
}

interface TenantProfile {
  user_id: string;
  full_name: string;
}

interface PlanejadorMandamentaisViewProps {
  profiles: TenantProfile[];
  onOpenDeadline?: (deadlineId: string) => void;
  searchQuery?: string;
}

export function PlanejadorMandamentaisView({ profiles, onOpenDeadline, searchQuery = "" }: PlanejadorMandamentaisViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { data: mandamentais = [], isLoading } = useMandamentais();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Mandamental | null>(null);
  const [assigning, setAssigning] = useState<Mandamental | null>(null);
  const [viewing, setViewing] = useState<Mandamental | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  // Mantém o viewer sincronizado quando a mandamental for atualizada na lista
  const viewingSynced = useMemo(
    () => (viewing ? mandamentais.find((r) => r.id === viewing.id) || null : null),
    [viewing, mandamentais]
  );


  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mandamentais.filter((r) => {
      if (!q) return true;
      return (
        r.titulo.toLowerCase().includes(q) ||
        (r.cliente_nome || "").toLowerCase().includes(q) ||
        (r.descricao || "").toLowerCase().includes(q)
      );
    });
  }, [mandamentais, searchQuery]);

  const pendentes = sortByUrgency(filtered.filter((r) => r.status === "pendente"));
  const atribuidos = sortByUrgency(filtered.filter((r) => r.status === "atribuido"));
  const arquivados = sortByUrgency(filtered.filter((r) => r.status === "arquivado"));

  const text = isDark ? "text-white" : "text-foreground";
  const textMuted = isDark ? "text-white/60" : "text-foreground/60";
  const glassBg = isDark ? "bg-white/[0.06]" : "bg-black/[0.04]";
  const cardBg = isDark ? "bg-white/[0.08] hover:bg-white/[0.12]" : "bg-white/70 hover:bg-white/90";
  const borderColor = isDark ? "border-white/10" : "border-black/10";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className={`h-8 w-8 animate-spin ${isDark ? "text-white/50" : "text-foreground/50"}`} />
      </div>
    );
  }

  const columns: { id: string; label: string; color: string; icon: React.ReactNode; items: Mandamental[] }[] = [
    { id: "pendente", label: "Pendentes", color: "#f59e0b", icon: <ClipboardList className="h-3.5 w-3.5" />, items: pendentes },
    { id: "atribuido", label: "Atribuídos", color: "#22c55e", icon: <CheckCircle2 className="h-3.5 w-3.5" />, items: atribuidos },
  ];
  if (showArchived) {
    columns.push({ id: "arquivado", label: "Arquivados", color: "#64748b", icon: <Archive className="h-3.5 w-3.5" />, items: arquivados });
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Plus className="h-4 w-4 mr-1" /> Nova Mandamental
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived((v) => !v)}
            className={textMuted}
          >
            <Archive className="h-4 w-4 mr-1" />
            {showArchived ? "Ocultar arquivados" : `Arquivados${arquivados.length ? ` (${arquivados.length})` : ""}`}
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-1 overflow-x-auto pb-2">
        {columns.map((col) => (
          <div
            key={col.id}
            className={`flex flex-col min-w-[280px] flex-1 rounded-xl ${glassBg} border ${borderColor} transition-all duration-300`}
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-inherit">
              <span
                className="flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0"
                style={{ backgroundColor: col.color + "30", color: col.color }}
              >
                {col.icon}
              </span>
              <span className={`text-sm font-semibold ${text} truncate`}>{col.label}</span>
              <span className={`text-xs ml-auto flex-shrink-0 ${textMuted}`}>{col.items.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2 planejador-scroll">
              <div className="flex flex-col gap-2">
                {col.items.length === 0 && (
                  <div className={`text-xs text-center py-6 ${textMuted}`}>Nenhum mandamental</div>
                )}
                {col.items.map((mand) => (
                  <MandamentalCard
                    key={mand.id}
                    mand={mand}
                    profiles={profiles}
                    cardBg={cardBg}
                    borderColor={borderColor}
                    text={text}
                    textMuted={textMuted}
                    onOpen={() => setViewing(mand)}
                    onOpenDeadline={onOpenDeadline}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <MandamentalFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        profiles={profiles}
      />
      <MandamentalFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        mode="edit"
        mandamental={editing}
        profiles={profiles}
      />
      <AtribuirMandamentalFlowDialog
        open={!!assigning}
        onOpenChange={(o) => !o && setAssigning(null)}
        mandamental={assigning}
        profiles={profiles}
      />
      <MandamentalViewerDialog
        open={!!viewingSynced}
        onOpenChange={(o) => !o && setViewing(null)}
        mandamental={viewingSynced}
        profiles={profiles}
        onOpenDeadline={onOpenDeadline}
        onAssign={(mand) => {
          setViewing(null);
          setAssigning(mand);
        }}
      />
    </div>
  );
}

function MandamentalCard({
  mand,
  profiles,
  cardBg,
  borderColor,
  text,
  textMuted,
  onOpen,
  onOpenDeadline,
}: {
  mand: Mandamental;
  profiles: TenantProfile[];
  cardBg: string;
  borderColor: string;
  text: string;
  textMuted: string;
  onOpen: () => void;
  onOpenDeadline?: (id: string) => void;
}) {
  const assignedName = mand.assigned_to
    ? profiles.find((p) => p.user_id === mand.assigned_to)?.full_name || "Usuário"
    : null;
  const createdName = profiles.find((p) => p.user_id === mand.created_by)?.full_name || "—";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`group w-full text-left p-2.5 rounded-lg ${cardBg} border ${borderColor} transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}
    >
      <div className="flex items-start gap-1.5">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${text} line-clamp-2 break-words`}>{mand.titulo}</p>
          {mand.cliente_nome && (
            <p className={`text-xs mt-0.5 ${textMuted} truncate`}>{mand.cliente_nome}</p>
          )}
          {mand.descricao && (
            <p className={`text-xs mt-1 ${textMuted} line-clamp-2`}>{mand.descricao}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`text-[10px] ${textMuted}`}>
              {format(new Date(mand.created_at), "dd MMM", { locale: ptBR })} · {createdName}
            </span>
            {assignedName && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                <User className="h-3 w-3" /> {assignedName}
              </span>
            )}
            {mand.deadline && !mand.deadline.completed && (() => {
              const d = parseLocalDate(mand.deadline.date);
              const today = new Date(); today.setHours(0,0,0,0);
              const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
              const danger = diff <= 0;
              const warn = diff > 0 && diff <= 3;
              const cls = danger
                ? "bg-destructive/15 text-destructive"
                : warn
                ? "bg-amber-500/15 text-amber-500"
                : "bg-blue-500/15 text-blue-500";
              return (
                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${cls}`}>
                  <AlarmClock className="h-3 w-3" />
                  {format(d, "dd MMM", { locale: ptBR })}
                  {danger ? (diff === 0 ? " · hoje" : ` · ${Math.abs(diff)}d atrasado`) : ""}
                </span>
              );
            })()}
            {mand.deadline && mand.deadline.completed && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                <CheckCircle2 className="h-3 w-3" /> concluído
              </span>
            )}
          </div>
          {mand.status === "atribuido" && mand.deadline_id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onOpenDeadline?.(mand.deadline_id!);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Ver prazo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MandamentalViewerDialog({
  open,
  onOpenChange,
  mandamental,
  profiles,
  onOpenDeadline,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mandamental: Mandamental | null;
  profiles: TenantProfile[];
  onOpenDeadline?: (id: string) => void;
  onAssign: (mand: Mandamental) => void;
}) {
  const update = useUpdateMandamental();
  const arquivar = useArquivarMandamental();
  const reabrir = useReabrirMandamental();
  const remover = useDeleteMandamental();

  const [editMode, setEditMode] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [cliente, setCliente] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    if (open && mandamental) {
      setEditMode(false);
      setTitulo(mandamental.titulo);
      setCliente(mandamental.cliente_nome || "");
      setDescricao(mandamental.descricao || "");
    }
  }, [open, mandamental?.id]);

  if (!mandamental) return null;

  const assignedName = mandamental.assigned_to
    ? profiles.find((p) => p.user_id === mandamental.assigned_to)?.full_name || "Usuário"
    : null;
  const createdName = profiles.find((p) => p.user_id === mandamental.created_by)?.full_name || "—";

  const statusMeta: Record<string, { label: string; color: string }> = {
    pendente: { label: "Pendente", color: "#f59e0b" },
    atribuido: { label: "Atribuído", color: "#22c55e" },
    arquivado: { label: "Arquivado", color: "#64748b" },
  };
  const st = statusMeta[mandamental.status] || statusMeta.pendente;

  const handleSave = async () => {
    if (!titulo.trim()) return;
    const dirty =
      titulo.trim() !== mandamental.titulo ||
      (cliente.trim() || null) !== (mandamental.cliente_nome || null) ||
      (descricao.trim() || null) !== (mandamental.descricao || null);
    if (!dirty) {
      setEditMode(false);
      return;
    }
    await update.mutateAsync({
      id: mandamental.id,
      titulo: titulo.trim(),
      cliente_nome: cliente.trim() || null,
      descricao: descricao.trim() || null,
    });
    setEditMode(false);
  };

  const handleCancel = () => {
    setTitulo(mandamental.titulo);
    setCliente(mandamental.cliente_nome || "");
    setDescricao(mandamental.descricao || "");
    setEditMode(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="flex-1">
              {editMode ? "Editar Mandamental" : "Detalhes do Mandamental"}
            </DialogTitle>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: st.color + "25", color: st.color }}
            >
              {st.label}
            </span>
          </div>
        </DialogHeader>

        {editMode ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Cliente (opcional)</label>
              <Input value={cliente} onChange={(e) => setCliente(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">Título</div>
              <div className="text-base font-semibold break-words">{mandamental.titulo}</div>
            </div>
            {mandamental.cliente_nome && (
              <div>
                <div className="text-xs text-muted-foreground">Cliente</div>
                <div className="text-sm">{mandamental.cliente_nome}</div>
              </div>
            )}
            {mandamental.descricao && (
              <div>
                <div className="text-xs text-muted-foreground">Descrição</div>
                <div className="text-sm whitespace-pre-wrap">{mandamental.descricao}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">Criado por</div>
                <div>{createdName}</div>
                <div className="text-muted-foreground">
                  {format(new Date(mandamental.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>
              {assignedName && (
                <div>
                  <div className="text-muted-foreground">Atribuído a</div>
                  <div className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" /> {assignedName}
                  </div>
                  {mandamental.atribuido_em && (
                    <div className="text-muted-foreground">
                      {format(new Date(mandamental.atribuido_em), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  )}
                </div>
              )}
            </div>
            {mandamental.status === "atribuido" && mandamental.deadline_id && (
              <button
                onClick={() => onOpenDeadline?.(mandamental.deadline_id!)}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> Abrir prazo vinculado
                {mandamental.deadline?.date && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({format(parseLocalDate(mandamental.deadline.date), "dd MMM yyyy", { locale: ptBR })})
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          {editMode ? (
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" onClick={handleCancel} disabled={update.isPending}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!titulo.trim() || update.isPending}>
                {update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-1.5 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Excluir este mandamental?")) {
                      remover.mutate(mandamental.id);
                      onOpenChange(false);
                    }
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Excluir
                </Button>
                {mandamental.status !== "arquivado" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      arquivar.mutate(mandamental.id);
                      onOpenChange(false);
                    }}
                  >
                    <Archive className="h-4 w-4 mr-1" /> Arquivar
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      reabrir.mutate(mandamental.id);
                      onOpenChange(false);
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" /> Reabrir
                  </Button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {mandamental.status === "pendente" && (
                  <Button variant="secondary" size="sm" onClick={() => onAssign(mandamental)}>
                    <UserPlus className="h-4 w-4 mr-1" /> Atribuir
                  </Button>
                )}
                <Button size="sm" onClick={() => setEditMode(true)}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MandamentalFormDialog({
  open,
  onOpenChange,
  mode,
  mandamental,
  profiles,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "create" | "edit";
  mandamental?: Mandamental | null;
  profiles?: TenantProfile[];
}) {
  const create = useCreateMandamental();
  const update = useUpdateMandamental();
  const atribuir = useAtribuirMandamental();
  const [titulo, setTitulo] = useState("");
  const [cliente, setCliente] = useState("");
  const [descricao, setDescricao] = useState("");
  const [withDeadline, setWithDeadline] = useState(false);
  const [responsavel, setResponsavel] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  // Estado para encadear: mandamental recém-criada → CreateDeadlineDialog
  const [pendingRev, setPendingRev] = useState<{ id: string; titulo: string; descricao: string | null; project_id: string | null; responsavel: string } | null>(null);

  // hidrata ao abrir
  useEffect(() => {
    if (open) {
      setTitulo(mandamental?.titulo || "");
      setCliente(mandamental?.cliente_nome || "");
      setDescricao(mandamental?.descricao || "");
      setWithDeadline(false);
      setResponsavel(null);
      setUserSearch("");
      setPendingRev(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mandamental?.id]);

  const submitting = create.isPending || update.isPending;

  const handleSubmit = async () => {
    if (!titulo.trim()) return;
    if (mode === "create") {
      if (withDeadline && !responsavel) return;
      const newRev = await create.mutateAsync({
        titulo: titulo.trim(),
        cliente_nome: cliente.trim() || undefined,
        descricao: descricao.trim() || undefined,
      });
      if (withDeadline && responsavel && newRev) {
        setPendingRev({
          id: newRev.id,
          titulo: newRev.titulo,
          descricao: newRev.descricao,
          project_id: newRev.project_id,
          responsavel,
        });
        return; // não fecha; abre o dialog do prazo
      }
    } else if (mandamental) {
      await update.mutateAsync({
        id: mandamental.id,
        titulo: titulo.trim(),
        cliente_nome: cliente.trim() || null,
        descricao: descricao.trim() || null,
      });
    }
    onOpenChange(false);
  };

  // Encadeamento: depois de criada a mandamental, abre o CreateDeadlineDialog
  if (pendingRev) {
    return (
      <CreateDeadlineDialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            setPendingRev(null);
            onOpenChange(false);
          }
        }}
        defaultValues={{
          title: pendingRev.titulo,
          description: pendingRev.descricao || "",
          projectId: pendingRev.project_id || "",
          advogadoResponsavelId: pendingRev.responsavel,
        }}
        onCreated={async (deadlineId) => {
          await atribuir.mutateAsync({ id: pendingRev.id, userId: pendingRev.responsavel, deadlineId });
          setPendingRev(null);
          onOpenChange(false);
        }}
      />
    );
  }

  const filteredProfiles = (profiles || []).filter((p) =>
    (p.full_name || "").toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nova Mandamental" : "Editar Mandamental"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="text-sm font-medium">Título</label>
            <Input
              autoFocus
              placeholder="Ex.: Mandamental Cliente Xdasilva"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Cliente (opcional)</label>
            <Input placeholder="Nome do cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Descrição (opcional)</label>
            <Textarea
              placeholder="Detalhes adicionais"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          {mode === "create" && (
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4" /> Definir prazo de conclusão agora
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A mandamental já será criada como atribuída, com prazo vinculado.
                  </p>
                </div>
                <Switch checked={withDeadline} onCheckedChange={setWithDeadline} />
              </div>
              {withDeadline && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Responsável</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuário..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto rounded-md border">
                    {filteredProfiles.length === 0 && (
                      <div className="px-3 py-3 text-sm text-muted-foreground text-center">Nenhum usuário</div>
                    )}
                    {filteredProfiles.map((p) => (
                      <button
                        key={p.user_id}
                        type="button"
                        onClick={() => setResponsavel(p.user_id)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent ${
                          responsavel === p.user_id ? "bg-accent" : ""
                        }`}
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{p.full_name || "Usuário"}</span>
                        {responsavel === p.user_id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Após salvar, abrirá a tela de prazo para definir data, projeto/protocolo, marcações e categoria.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!titulo.trim() || submitting || (mode === "create" && withDeadline && !responsavel)}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {mode === "create" ? (withDeadline ? "Continuar para o prazo" : "Criar") : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AtribuirMandamentalFlowDialog({
  open,
  onOpenChange,
  mandamental,
  profiles,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mandamental: Mandamental | null;
  profiles: TenantProfile[];
}) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const atribuir = useAtribuirMandamental();

  useEffect(() => {
    if (open) {
      setSelectedUser(null);
      setSearch("");
      setConfirmed(false);
    }
  }, [open, mandamental?.id]);

  if (!mandamental) return null;

  const filteredProfiles = profiles.filter((p) =>
    (p.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  // Passo 2: dialog de criar prazo
  if (confirmed && selectedUser) {
    return (
      <CreateDeadlineDialog
        open={open}
        onOpenChange={(o) => {
          if (!o) onOpenChange(false);
        }}
        defaultValues={{
          title: mandamental.titulo,
          description: mandamental.descricao || "",
          projectId: mandamental.project_id || "",
          advogadoResponsavelId: selectedUser,
        }}
        onCreated={async (deadlineId) => {
          await atribuir.mutateAsync({ id: mandamental.id, userId: selectedUser, deadlineId });
          onOpenChange(false);
        }}
      />
    );
  }

  // Passo 1: escolher usuário
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atribuir mandamental</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Selecione o responsável para <span className="font-medium text-foreground">{mandamental.titulo}</span>.
            Em seguida, você definirá o prazo, processo/protocolo e demais detalhes.
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="max-h-64 overflow-y-auto rounded-md border">
            {filteredProfiles.length === 0 && (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">Nenhum usuário</div>
            )}
            {filteredProfiles.map((p) => (
              <button
                key={p.user_id}
                onClick={() => setSelectedUser(p.user_id)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent ${
                  selectedUser === p.user_id ? "bg-accent" : ""
                }`}
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{p.full_name || "Usuário"}</span>
                {selectedUser === p.user_id && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!selectedUser} onClick={() => setConfirmed(true)}>
            Atribuir e definir prazo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}