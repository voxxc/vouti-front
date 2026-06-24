import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, MoreVertical, User, ClipboardList, CheckCircle2, Archive, Loader2, Pencil, UserPlus, Search, ExternalLink, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Revisional,
  useRevisionais,
  useCreateRevisional,
  useUpdateRevisional,
  useAtribuirRevisional,
  useArquivarRevisional,
  useReabrirRevisional,
  useDeleteRevisional,
} from "@/hooks/usePlanejadorRevisionais";
import { CreateDeadlineDialog } from "@/components/Agenda/CreateDeadlineDialog";

interface TenantProfile {
  user_id: string;
  full_name: string;
}

interface PlanejadorRevisionaisViewProps {
  profiles: TenantProfile[];
  onOpenDeadline?: (deadlineId: string) => void;
  searchQuery?: string;
}

export function PlanejadorRevisionaisView({ profiles, onOpenDeadline, searchQuery = "" }: PlanejadorRevisionaisViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { data: revisionais = [], isLoading } = useRevisionais();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Revisional | null>(null);
  const [assigning, setAssigning] = useState<Revisional | null>(null);
  const [viewing, setViewing] = useState<Revisional | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  // Mantém o viewer sincronizado quando a revisional for atualizada na lista
  const viewingSynced = useMemo(
    () => (viewing ? revisionais.find((r) => r.id === viewing.id) || null : null),
    [viewing, revisionais]
  );


  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return revisionais.filter((r) => {
      if (!q) return true;
      return (
        r.titulo.toLowerCase().includes(q) ||
        (r.cliente_nome || "").toLowerCase().includes(q) ||
        (r.descricao || "").toLowerCase().includes(q)
      );
    });
  }, [revisionais, searchQuery]);

  const pendentes = filtered.filter((r) => r.status === "pendente");
  const atribuidos = filtered.filter((r) => r.status === "atribuido");
  const arquivados = filtered.filter((r) => r.status === "arquivado");

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

  const columns: { id: string; label: string; color: string; icon: React.ReactNode; items: Revisional[] }[] = [
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
            <Plus className="h-4 w-4 mr-1" /> Novo Revisional
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
                  <div className={`text-xs text-center py-6 ${textMuted}`}>Nenhum revisional</div>
                )}
                {col.items.map((rev) => (
                  <RevisionalCard
                    key={rev.id}
                    rev={rev}
                    profiles={profiles}
                    cardBg={cardBg}
                    borderColor={borderColor}
                    text={text}
                    textMuted={textMuted}
                    onOpen={() => setViewing(rev)}
                    onOpenDeadline={onOpenDeadline}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <RevisionalFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
      />
      <RevisionalFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        mode="edit"
        revisional={editing}
      />
      <AtribuirFlowDialog
        open={!!assigning}
        onOpenChange={(o) => !o && setAssigning(null)}
        revisional={assigning}
        profiles={profiles}
      />
      <RevisionalViewerDialog
        open={!!viewingSynced}
        onOpenChange={(o) => !o && setViewing(null)}
        revisional={viewingSynced}
        profiles={profiles}
        onOpenDeadline={onOpenDeadline}
        onAssign={(rev) => {
          setViewing(null);
          setAssigning(rev);
        }}
      />
    </div>
  );
}

function RevisionalCard({
  rev,
  profiles,
  cardBg,
  borderColor,
  text,
  textMuted,
  onOpen,
  onOpenDeadline,
}: {
  rev: Revisional;
  profiles: TenantProfile[];
  cardBg: string;
  borderColor: string;
  text: string;
  textMuted: string;
  onOpen: () => void;
  onOpenDeadline?: (id: string) => void;
}) {
  const assignedName = rev.assigned_to
    ? profiles.find((p) => p.user_id === rev.assigned_to)?.full_name || "Usuário"
    : null;
  const createdName = profiles.find((p) => p.user_id === rev.created_by)?.full_name || "—";

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
          <p className={`text-sm font-medium ${text} line-clamp-2 break-words`}>{rev.titulo}</p>
          {rev.cliente_nome && (
            <p className={`text-xs mt-0.5 ${textMuted} truncate`}>{rev.cliente_nome}</p>
          )}
          {rev.descricao && (
            <p className={`text-xs mt-1 ${textMuted} line-clamp-2`}>{rev.descricao}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`text-[10px] ${textMuted}`}>
              {format(new Date(rev.created_at), "dd MMM", { locale: ptBR })} · {createdName}
            </span>
            {assignedName && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                <User className="h-3 w-3" /> {assignedName}
              </span>
            )}
          </div>
          {rev.status === "atribuido" && rev.deadline_id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onOpenDeadline?.(rev.deadline_id!);
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

function RevisionalViewerDialog({
  open,
  onOpenChange,
  revisional,
  profiles,
  onOpenDeadline,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  revisional: Revisional | null;
  profiles: TenantProfile[];
  onOpenDeadline?: (id: string) => void;
  onAssign: (rev: Revisional) => void;
}) {
  const update = useUpdateRevisional();
  const arquivar = useArquivarRevisional();
  const reabrir = useReabrirRevisional();
  const remover = useDeleteRevisional();

  const [editMode, setEditMode] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [cliente, setCliente] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    if (open && revisional) {
      setEditMode(false);
      setTitulo(revisional.titulo);
      setCliente(revisional.cliente_nome || "");
      setDescricao(revisional.descricao || "");
    }
  }, [open, revisional?.id]);

  if (!revisional) return null;

  const assignedName = revisional.assigned_to
    ? profiles.find((p) => p.user_id === revisional.assigned_to)?.full_name || "Usuário"
    : null;
  const createdName = profiles.find((p) => p.user_id === revisional.created_by)?.full_name || "—";

  const statusMeta: Record<string, { label: string; color: string }> = {
    pendente: { label: "Pendente", color: "#f59e0b" },
    atribuido: { label: "Atribuído", color: "#22c55e" },
    arquivado: { label: "Arquivado", color: "#64748b" },
  };
  const st = statusMeta[revisional.status] || statusMeta.pendente;

  const handleSave = async () => {
    if (!titulo.trim()) return;
    const dirty =
      titulo.trim() !== revisional.titulo ||
      (cliente.trim() || null) !== (revisional.cliente_nome || null) ||
      (descricao.trim() || null) !== (revisional.descricao || null);
    if (!dirty) {
      setEditMode(false);
      return;
    }
    await update.mutateAsync({
      id: revisional.id,
      titulo: titulo.trim(),
      cliente_nome: cliente.trim() || null,
      descricao: descricao.trim() || null,
    });
    setEditMode(false);
  };

  const handleCancel = () => {
    setTitulo(revisional.titulo);
    setCliente(revisional.cliente_nome || "");
    setDescricao(revisional.descricao || "");
    setEditMode(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="flex-1">
              {editMode ? "Editar Revisional" : "Detalhes do Revisional"}
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
              <div className="text-base font-semibold break-words">{revisional.titulo}</div>
            </div>
            {revisional.cliente_nome && (
              <div>
                <div className="text-xs text-muted-foreground">Cliente</div>
                <div className="text-sm">{revisional.cliente_nome}</div>
              </div>
            )}
            {revisional.descricao && (
              <div>
                <div className="text-xs text-muted-foreground">Descrição</div>
                <div className="text-sm whitespace-pre-wrap">{revisional.descricao}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">Criado por</div>
                <div>{createdName}</div>
                <div className="text-muted-foreground">
                  {format(new Date(revisional.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>
              {assignedName && (
                <div>
                  <div className="text-muted-foreground">Atribuído a</div>
                  <div className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" /> {assignedName}
                  </div>
                  {revisional.assigned_at && (
                    <div className="text-muted-foreground">
                      {format(new Date(revisional.assigned_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  )}
                </div>
              )}
            </div>
            {revisional.status === "atribuido" && revisional.deadline_id && (
              <button
                onClick={() => onOpenDeadline?.(revisional.deadline_id!)}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> Abrir prazo vinculado
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
                    if (confirm("Excluir este revisional?")) {
                      remover.mutate(revisional.id);
                      onOpenChange(false);
                    }
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Excluir
                </Button>
                {revisional.status !== "arquivado" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      arquivar.mutate(revisional.id);
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
                      reabrir.mutate(revisional.id);
                      onOpenChange(false);
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" /> Reabrir
                  </Button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {revisional.status === "pendente" && (
                  <Button variant="secondary" size="sm" onClick={() => onAssign(revisional)}>
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

function RevisionalFormDialog({
  open,
  onOpenChange,
  mode,
  revisional,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "create" | "edit";
  revisional?: Revisional | null;
}) {
  const create = useCreateRevisional();
  const update = useUpdateRevisional();
  const [titulo, setTitulo] = useState("");
  const [cliente, setCliente] = useState("");
  const [descricao, setDescricao] = useState("");

  // hidrata ao abrir
  useEffect(() => {
    if (open) {
      setTitulo(revisional?.titulo || "");
      setCliente(revisional?.cliente_nome || "");
      setDescricao(revisional?.descricao || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, revisional?.id]);

  const submitting = create.isPending || update.isPending;

  const handleSubmit = async () => {
    if (!titulo.trim()) return;
    if (mode === "create") {
      await create.mutateAsync({ titulo: titulo.trim(), cliente_nome: cliente.trim() || undefined, descricao: descricao.trim() || undefined });
    } else if (revisional) {
      await update.mutateAsync({
        id: revisional.id,
        titulo: titulo.trim(),
        cliente_nome: cliente.trim() || null,
        descricao: descricao.trim() || null,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo Revisional" : "Editar Revisional"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Título</label>
            <Input
              autoFocus
              placeholder="Ex.: Revisional Cliente Xdasilva"
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
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!titulo.trim() || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {mode === "create" ? "Criar" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AtribuirFlowDialog({
  open,
  onOpenChange,
  revisional,
  profiles,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  revisional: Revisional | null;
  profiles: TenantProfile[];
}) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const atribuir = useAtribuirRevisional();

  useEffect(() => {
    if (open) {
      setSelectedUser(null);
      setSearch("");
      setConfirmed(false);
    }
  }, [open, revisional?.id]);

  if (!revisional) return null;

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
          title: revisional.titulo,
          description: revisional.descricao || "",
          projectId: revisional.project_id || "",
          advogadoResponsavelId: selectedUser,
        }}
        onCreated={async (deadlineId) => {
          await atribuir.mutateAsync({ id: revisional.id, userId: selectedUser, deadlineId });
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
          <DialogTitle>Atribuir revisional</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Selecione o responsável para <span className="font-medium text-foreground">{revisional.titulo}</span>.
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