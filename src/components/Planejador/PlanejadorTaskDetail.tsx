import { useState, useRef, useEffect } from "react";
import { PlanejadorTask } from "@/hooks/usePlanejadorTasks";
import { PlanejadorTaskChat } from "./PlanejadorTaskChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  X, Play, CheckCircle, Calendar, User, Clock, FileText, ListChecks, Users, Tag, ArrowLeft,
  Plus, Trash2, Download, Upload, ChevronDown, ChevronRight, Search, UserCircle, Scale, CalendarClock, Unlink,
  Milestone, Info, Activity, Pencil, Flag,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePlanejadorSubtasks } from "@/hooks/usePlanejadorSubtasks";
import { usePlanejadorFiles } from "@/hooks/usePlanejadorFiles";
import { usePlanejadorParticipants } from "@/hooks/usePlanejadorParticipants";
import { usePlanejadorLabels, usePlanejadorLabelAssignments } from "@/hooks/usePlanejadorLabels";
import { usePlanejadorEtapas } from "@/hooks/usePlanejadorEtapas";
import { usePlanejadorActivityLog, logPlanejadorActivity } from "@/hooks/usePlanejadorActivityLog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";
import { EditarPrazoDialog } from "@/components/Agenda/EditarPrazoDialog";
import { ClienteDetails } from "@/components/CRM/ClienteDetails";
import { Deadline } from "@/types/agenda";
import { Cliente } from "@/types/cliente";

interface PlanejadorTaskDetailProps {
  task: PlanejadorTask;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<PlanejadorTask>) => void;
  onDelete: (id: string) => void;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400' },
  in_progress: { label: 'Em andamento', color: 'bg-blue-500/20 text-blue-400' },
  completed: { label: 'Concluído', color: 'bg-emerald-500/20 text-emerald-400' },
};

const LABEL_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#6b7280'];

const ACTION_LABELS: Record<string, string> = {
  created: 'Tarefa criada',
  status_changed: 'Status alterado',
  subtask_created: 'Subtarefa criada',
  subtask_completed: 'Subtarefa concluída',
  subtask_deleted: 'Subtarefa removida',
  etapa_created: 'Etapa criada',
  etapa_completed: 'Etapa concluída',
  etapa_deleted: 'Etapa removida',
  cliente_linked: 'Cliente vinculado',
  cliente_unlinked: 'Cliente desvinculado',
  processo_linked: 'Caso vinculado',
  processo_unlinked: 'Caso desvinculado',
  participant_added: 'Participante adicionado',
  participant_removed: 'Participante removido',
};

export function PlanejadorTaskDetail({ task, onClose, onUpdate, onDelete }: PlanejadorTaskDetailProps) {
  const [titulo, setTitulo] = useState(task.titulo);
  const [descricao, setDescricao] = useState(task.descricao || "");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskPrazo, setNewSubtaskPrazo] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [processoSearch, setProcessoSearch] = useState("");
  const [newEtapaTitle, setNewEtapaTitle] = useState("");
  const [activeTab, setActiveTab] = useState<'detalhes' | 'info'>('detalhes');
  const [editingPrazoDeadline, setEditingPrazoDeadline] = useState<Deadline | null>(null);
  const [editPrazoOpen, setEditPrazoOpen] = useState(false);
  const [clienteInfoOpen, setClienteInfoOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // ESC closes task detail first, not the drawer behind
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        if (clienteInfoOpen) {
          setClienteInfoOpen(false);
        } else if (participantsOpen) {
          setParticipantsOpen(false);
        } else if (editPrazoOpen) {
          setEditPrazoOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc, true);
    return () => window.removeEventListener('keydown', handleEsc, true);
  }, [onClose, participantsOpen, editPrazoOpen]);

  const { user, userRole } = useAuth();
  const { tenantId } = useTenantId();
  const status = STATUS_MAP[task.status] || STATUS_MAP.pending;

  // Hooks
  const subtasks = usePlanejadorSubtasks(task.id);
  const files = usePlanejadorFiles(task.id);
  const participants = usePlanejadorParticipants(task.id);
  const { labels, createLabel } = usePlanejadorLabels();
  const labelAssignments = usePlanejadorLabelAssignments(task.id);
  const etapas = usePlanejadorEtapas(task.id);
  const activityLog = usePlanejadorActivityLog(task.id);

  // Tenant profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['tenant-profiles', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Cliente vinculado
  const { data: clienteVinculado } = useQuery({
    queryKey: ['planejador-cliente', task.cliente_id],
    queryFn: async () => {
      if (!task.cliente_id) return null;
      const { data } = await supabase
        .from('clientes')
        .select('id, nome_pessoa_fisica, nome_pessoa_juridica, cpf, cnpj')
        .eq('id', task.cliente_id)
        .single();
      return data;
    },
    enabled: !!task.cliente_id,
  });

  // Cliente completo para dialog de info
  const { data: clienteCompleto } = useQuery({
    queryKey: ['planejador-cliente-completo', task.cliente_id, clienteInfoOpen],
    queryFn: async () => {
      if (!task.cliente_id) return null;
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', task.cliente_id)
        .single();
      return data as unknown as Cliente;
    },
    enabled: !!task.cliente_id && clienteInfoOpen,
  });


  const { data: clientesSearch = [] } = useQuery({
    queryKey: ['planejador-clientes-search', tenantId, clienteSearch],
    queryFn: async () => {
      if (!tenantId || !clienteSearch.trim()) return [];
      const term = `%${clienteSearch.trim()}%`;
      const { data } = await supabase
        .from('clientes')
        .select('id, nome_pessoa_fisica, nome_pessoa_juridica, cpf, cnpj')
        .eq('tenant_id', tenantId)
        .or(`nome_pessoa_fisica.ilike.${term},nome_pessoa_juridica.ilike.${term},cpf.ilike.${term},cnpj.ilike.${term}`)
        .limit(10);
      return data || [];
    },
    enabled: !!tenantId && clienteSearch.trim().length >= 2,
  });

  // Processo vinculado
  const { data: processoVinculado } = useQuery({
    queryKey: ['planejador-processo', task.processo_oab_id],
    queryFn: async () => {
      if (!task.processo_oab_id) return null;
      const { data } = await (supabase as any)
        .from('processos_oab')
        .select('id, numero_cnj, parte_ativa, parte_passiva, tribunal')
        .eq('id', task.processo_oab_id)
        .single();
      return data;
    },
    enabled: !!task.processo_oab_id,
  });

  // Busca processos
  const { data: processosSearch = [] } = useQuery({
    queryKey: ['planejador-processos-search', tenantId, processoSearch],
    queryFn: async () => {
      if (!tenantId || !processoSearch.trim()) return [];
      const term = `%${processoSearch.trim()}%`;
      const { data } = await (supabase as any)
        .from('processos_oab')
        .select('id, numero_cnj, parte_ativa, parte_passiva, tribunal')
        .eq('tenant_id', tenantId)
        .or(`numero_cnj.ilike.${term},parte_ativa.ilike.${term},parte_passiva.ilike.${term}`)
        .limit(10);
      return data || [];
    },
    enabled: !!tenantId && processoSearch.trim().length >= 2,
  });

  // Prazos relacionados ao processo
  const { data: prazosRelacionados = [] } = useQuery({
    queryKey: ['planejador-prazos', task.processo_oab_id, tenantId],
    queryFn: async () => {
      if (!task.processo_oab_id || !tenantId) return [];
      const { data } = await supabase
        .from('deadlines')
        .select('id, title, date, completed, description, advogado_responsavel_id, project_id, workspace_id, protocolo_etapa_id, processo_oab_id, user_id')
        .eq('processo_oab_id', task.processo_oab_id)
        .eq('tenant_id', tenantId)
        .order('date', { ascending: true });
      return data || [];
    },
    enabled: !!task.processo_oab_id && !!tenantId,
  });

  const handleTitleBlur = () => {
    if (titulo.trim() && titulo !== task.titulo) {
      onUpdate(task.id, { titulo: titulo.trim() });
    }
  };

  const handleDescBlur = () => {
    if (descricao !== (task.descricao || "")) {
      onUpdate(task.id, { descricao: descricao || null } as any);
    }
  };

  const toggleSection = (section: string) => {
    if (section === 'participantes') {
      setParticipantsOpen(true);
      return;
    }
    setExpandedSection(prev => prev === section ? null : section);
  };

  const logActivity = (action: string, details?: Record<string, any>) => {
    if (!user || !tenantId) return;
    logPlanejadorActivity({ taskId: task.id, userId: user.id, tenantId, action, details });
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    subtasks.create.mutate({
      titulo: newSubtaskTitle.trim(),
      prazo: newSubtaskPrazo || undefined,
    }, {
      onSuccess: () => logActivity('subtask_created', { titulo: newSubtaskTitle.trim() }),
    });
    setNewSubtaskTitle("");
    setNewSubtaskPrazo("");
  };

  const handleAddEtapa = () => {
    if (!newEtapaTitle.trim()) return;
    etapas.create.mutate(newEtapaTitle.trim(), {
      onSuccess: () => logActivity('etapa_created', { titulo: newEtapaTitle.trim() }),
    });
    setNewEtapaTitle("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) files.upload.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateLabel = () => {
    if (!newLabelName.trim()) return;
    createLabel.mutate({ name: newLabelName.trim(), color: newLabelColor });
    setNewLabelName("");
  };

  const handleStatusChange = (newStatus: string) => {
    const oldStatus = task.status;
    onUpdate(task.id, { status: newStatus });
    logActivity('status_changed', { from: oldStatus, to: newStatus });
  };

  const handleLinkCliente = (clienteId: string, nome: string) => {
    onUpdate(task.id, { cliente_id: clienteId } as any);
    setClienteSearch("");
    logActivity('cliente_linked', { cliente_id: clienteId, nome });
  };

  const handleUnlinkCliente = () => {
    onUpdate(task.id, { cliente_id: null } as any);
    logActivity('cliente_unlinked');
  };

  const handleLinkProcesso = (processoId: string, cnj: string) => {
    onUpdate(task.id, { processo_oab_id: processoId } as any);
    setProcessoSearch("");
    logActivity('processo_linked', { processo_id: processoId, cnj });
  };

  const handleUnlinkProcesso = () => {
    onUpdate(task.id, { processo_oab_id: null } as any);
    logActivity('processo_unlinked');
  };

  const handleEditPrazo = async (prazo: any) => {
    // Build a Deadline object for the EditarPrazoDialog
    // Fetch tagged users for this deadline
    const { data: tags } = await supabase
      .from('deadline_tags')
      .select('tagged_user_id')
      .eq('deadline_id', prazo.id);

    const taggedUsers = (tags || []).map((t: any) => {
      const profile = profiles.find((p: any) => p.user_id === t.tagged_user_id);
      return { userId: t.tagged_user_id, name: profile?.full_name || 'Usuário' };
    });

    // Fetch advogado name
    let advogadoResponsavel: any = undefined;
    if (prazo.advogado_responsavel_id) {
      const profile = profiles.find((p: any) => p.user_id === prazo.advogado_responsavel_id);
      advogadoResponsavel = { userId: prazo.advogado_responsavel_id, name: profile?.full_name || 'Usuário' };
    }

    const deadlineObj: Deadline = {
      id: prazo.id,
      title: prazo.title,
      description: prazo.description || '',
      date: new Date(prazo.date),
      projectId: prazo.project_id || '',
      projectName: '',
      clientName: '',
      completed: prazo.completed,
      advogadoResponsavel,
      taggedUsers,
      processoOabId: prazo.processo_oab_id,
      createdAt: new Date(),
      updatedAt: new Date(),
      workspaceId: prazo.workspace_id || '',
      protocoloEtapaId: prazo.protocolo_etapa_id || '',
    };

    setEditingPrazoDeadline(deadlineObj);
    setEditPrazoOpen(true);
  };

  const assignedLabelIds = labelAssignments.assignments.map(a => a.label_id);
  const participantUserIds = participants.participants.map(p => p.user_id);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const clienteNome = clienteVinculado
    ? (clienteVinculado.nome_pessoa_fisica || clienteVinculado.nome_pessoa_juridica || 'Cliente')
    : null;

  const getProfileName = (userId: string) => {
    const p = profiles.find((pr: any) => pr.user_id === userId);
    return p?.full_name || 'Usuário';
  };

  const etapaProgress = etapas.totalCount > 0 ? (etapas.completedCount / etapas.totalCount) * 100 : 0;

  const sidebarItems = [
    { key: 'subtarefas', icon: ListChecks, label: 'Subtarefas', count: `${subtasks.completedCount}/${subtasks.totalCount}` },
    { key: 'etapas', icon: Milestone, label: 'Etapas', count: `${etapas.completedCount}/${etapas.totalCount}` },
    { key: 'arquivos', icon: FileText, label: 'Arquivos', count: `${files.files.length}` },
    { key: 'participantes', icon: Users, label: 'Participantes', count: `${participants.participants.length}` },
    { key: 'marcadores', icon: Tag, label: 'Marcadores', count: `${assignedLabelIds.length}` },
    { key: 'cliente', icon: UserCircle, label: 'Cliente', count: clienteNome ? '1' : '0' },
    { key: 'processo', icon: Scale, label: 'Caso / Processo Judicial', count: processoVinculado ? '1' : '0' },
    { key: 'prazos', icon: CalendarClock, label: 'Prazos Relacionados', count: `${prazosRelacionados.length}` },
  ];

  const renderDetailsTab = () => (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* Title */}
      <Input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        onBlur={handleTitleBlur}
        className="text-lg font-bold border-0 px-0 h-auto focus-visible:ring-0 bg-transparent"
      />

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Descrição</label>
        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          onBlur={handleDescBlur}
          placeholder="Adicione uma descrição..."
          className="min-h-[80px] border-dashed resize-none"
        />
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 py-2 border-b border-border/50">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground w-28">Criado por</span>
          <span className="text-sm font-medium">{getProfileName(task.proprietario_id)}</span>
        </div>
        <div className="flex items-center gap-3 py-2 border-b border-border/50">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground w-28">Prazo</span>
          <span className="text-sm font-medium">
            {task.prazo ? format(new Date(task.prazo), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Sem prazo'}
          </span>
        </div>
        <div className="flex items-center gap-3 py-2 border-b border-border/50">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground w-28">Criado em</span>
          <span className="text-sm font-medium">
            {format(new Date(task.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>

      {/* Assigned Labels Pills */}
      {assignedLabelIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {labels.filter(l => assignedLabelIds.includes(l.id)).map(l => (
            <span key={l.id} className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: l.color }}>
              {l.name}
            </span>
          ))}
        </div>
      )}

      {/* Etapa progress bar */}
      {etapas.totalCount > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Milestone className="h-3.5 w-3.5" /> Progresso das etapas</span>
            <span>{etapas.completedCount}/{etapas.totalCount}</span>
          </div>
          <Progress value={etapaProgress} className="h-2" />
        </div>
      )}

      {/* Sidebar items - expandable */}
      <div className="space-y-1">
        {sidebarItems.map(({ key, icon: Icon, label, count }) => (
          <div key={key}>
            <button
              onClick={() => toggleSection(key)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors"
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
              <span className="text-xs opacity-60">{count}</span>
              {key !== 'participantes' && (
                expandedSection === key
                  ? <ChevronDown className="h-3.5 w-3.5" />
                  : <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>

            {/* SUBTAREFAS */}
            {key === 'subtarefas' && expandedSection === 'subtarefas' && (
              <div className="ml-4 mt-2 space-y-2">
                <div className="flex gap-2">
                  <Input value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} placeholder="Nova subtarefa..." className="h-8 text-sm" onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()} />
                  <Input type="date" value={newSubtaskPrazo} onChange={(e) => setNewSubtaskPrazo(e.target.value)} className="h-8 text-sm w-36" />
                  <Button size="sm" className="h-8 px-2" onClick={handleAddSubtask} disabled={subtasks.create.isPending}><Plus className="h-3.5 w-3.5" /></Button>
                </div>
                {subtasks.subtasks.map(st => (
                  <div key={st.id} className="flex items-center gap-2 py-1 group">
                    <Checkbox
                      checked={st.concluida}
                      onCheckedChange={(checked) => {
                        subtasks.toggle.mutate({ id: st.id, concluida: !!checked }, {
                          onSuccess: () => logActivity(checked ? 'subtask_completed' : 'status_changed', { subtask: st.titulo }),
                        });
                      }}
                    />
                    <span className={`text-sm flex-1 ${st.concluida ? 'line-through text-muted-foreground' : ''}`}>{st.titulo}</span>
                    {st.prazo && <span className="text-xs text-muted-foreground">{format(new Date(st.prazo), 'dd/MM', { locale: ptBR })}</span>}
                    <button onClick={() => { subtasks.remove.mutate(st.id); logActivity('subtask_deleted', { subtask: st.titulo }); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* ETAPAS */}
            {key === 'etapas' && expandedSection === 'etapas' && (
              <div className="ml-4 mt-2 space-y-2">
                <div className="flex gap-2">
                  <Input value={newEtapaTitle} onChange={(e) => setNewEtapaTitle(e.target.value)} placeholder="Nova etapa..." className="h-8 text-sm" onKeyDown={(e) => e.key === 'Enter' && handleAddEtapa()} />
                  <Button size="sm" className="h-8 px-2" onClick={handleAddEtapa} disabled={etapas.create.isPending}><Plus className="h-3.5 w-3.5" /></Button>
                </div>
                {etapas.etapas.map((et, idx) => (
                  <div key={et.id} className="flex items-center gap-2 py-1 group">
                    <Checkbox
                      checked={et.concluida}
                      onCheckedChange={(checked) => {
                        etapas.toggle.mutate({ id: et.id, concluida: !!checked }, {
                          onSuccess: () => logActivity(checked ? 'etapa_completed' : 'status_changed', { etapa: et.titulo }),
                        });
                      }}
                    />
                    <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                    <span className={`text-sm flex-1 ${et.concluida ? 'line-through text-muted-foreground' : ''}`}>{et.titulo}</span>
                    <button onClick={() => { etapas.remove.mutate(et.id); logActivity('etapa_deleted', { etapa: et.titulo }); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* ARQUIVOS */}
            {key === 'arquivos' && expandedSection === 'arquivos' && (
              <div className="ml-4 mt-2 space-y-2">
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => fileInputRef.current?.click()} disabled={files.upload.isPending}>
                  <Upload className="h-3.5 w-3.5" />{files.upload.isPending ? 'Enviando...' : 'Enviar arquivo'}
                </Button>
                {files.files.map(f => (
                  <div key={f.id} className="flex items-center gap-2 py-1 group">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1 truncate">{f.file_name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(f.file_size)}</span>
                    <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="p-0.5 hover:text-primary"><Download className="h-3.5 w-3.5" /></a>
                    <button onClick={() => files.remove.mutate(f.id)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* MARCADORES */}
            {key === 'marcadores' && expandedSection === 'marcadores' && (
              <div className="ml-4 mt-2 space-y-2">
                <div className="flex gap-2">
                  <Input value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} placeholder="Novo marcador..." className="h-8 text-sm" onKeyDown={(e) => e.key === 'Enter' && handleCreateLabel()} />
                  <div className="flex gap-1 items-center">
                    {LABEL_COLORS.map(c => (
                      <button key={c} onClick={() => setNewLabelColor(c)} className={`w-5 h-5 rounded-full transition-transform ${newLabelColor === c ? 'scale-125 ring-2 ring-offset-1 ring-offset-background ring-primary' : ''}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <Button size="sm" className="h-8 px-2" onClick={handleCreateLabel} disabled={createLabel.isPending}><Plus className="h-3.5 w-3.5" /></Button>
                </div>
                {labels.map(label => {
                  const isAssigned = assignedLabelIds.includes(label.id);
                  return (
                    <button key={label.id} onClick={() => { if (isAssigned) labelAssignments.unassign.mutate(label.id); else labelAssignments.assign.mutate(label.id); }} className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors ${isAssigned ? 'bg-accent' : 'hover:bg-accent/50'}`}>
                      <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                      <span className="flex-1 text-left">{label.name}</span>
                      {isAssigned && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* CLIENTE */}
            {key === 'cliente' && expandedSection === 'cliente' && (
              <div className="ml-4 mt-2 space-y-2">
                {clienteVinculado ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/50 border border-border">
                    <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{clienteNome}</p>
                      <p className="text-xs text-muted-foreground">{clienteVinculado.cpf || clienteVinculado.cnpj || ''}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => setClienteInfoOpen(true)} title="Ver dados cadastrais">
                      <Info className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={handleUnlinkCliente}>
                      <Unlink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input value={clienteSearch} onChange={(e) => setClienteSearch(e.target.value)} placeholder="Buscar cliente por nome ou documento..." className="h-8 text-sm pl-8" />
                    </div>
                    <div className="max-h-[240px] overflow-y-auto space-y-1">
                      {clientesSearch.map((c: any) => (
                        <button key={c.id} onClick={() => handleLinkCliente(c.id, c.nome_pessoa_fisica || c.nome_pessoa_juridica)} className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent/50 transition-colors">
                          <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="flex-1 text-left truncate">{c.nome_pessoa_fisica || c.nome_pessoa_juridica}</span>
                          <span className="text-xs text-muted-foreground">{c.cpf || c.cnpj || ''}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PROCESSO */}
            {key === 'processo' && expandedSection === 'processo' && (
              <div className="ml-4 mt-2 space-y-2">
                {processoVinculado ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/50 border border-border">
                    <Scale className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{processoVinculado.numero_cnj || 'Processo'}</p>
                      <p className="text-xs text-muted-foreground truncate">{[processoVinculado.parte_ativa, processoVinculado.parte_passiva].filter(Boolean).join(' x ')}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={handleUnlinkProcesso}>
                      <Unlink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input value={processoSearch} onChange={(e) => setProcessoSearch(e.target.value)} placeholder="Buscar por CNJ, partes..." className="h-8 text-sm pl-8" />
                    </div>
                    <div className="max-h-[240px] overflow-y-auto space-y-1">
                      {processosSearch.map((p: any) => (
                        <button key={p.id} onClick={() => handleLinkProcesso(p.id, p.numero_cnj || '')} className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent/50 transition-colors">
                          <Scale className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 text-left min-w-0">
                            <p className="truncate">{p.numero_cnj || 'Sem CNJ'}</p>
                            <p className="text-xs text-muted-foreground truncate">{[p.parte_ativa, p.parte_passiva].filter(Boolean).join(' x ')}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PRAZOS RELACIONADOS */}
            {key === 'prazos' && expandedSection === 'prazos' && (
              <div className="ml-4 mt-2 space-y-2">
                {!task.processo_oab_id ? (
                  <p className="text-xs text-muted-foreground py-2">Vincule um processo para ver os prazos relacionados.</p>
                ) : prazosRelacionados.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Nenhum prazo encontrado para este processo.</p>
                ) : (
                  prazosRelacionados.map((prazo: any) => (
                    <div key={prazo.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-accent/30">
                      <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{prazo.title}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(prazo.date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                      </div>
                      <Badge className={`text-xs border-0 ${prazo.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {prazo.completed ? 'Concluído' : 'Pendente'}
                      </Badge>
                      <button
                        onClick={() => handleEditPrazo(prazo)}
                        className="p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                        title="Editar prazo"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderInfoTab = () => (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* Subtarefa de (parent info) */}
      {task.is_subtask && task.parent_task_titulo && (
        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center gap-2">
          <Flag className="h-4 w-4 text-orange-400 shrink-0" />
          <div className="text-sm">
            <span className="text-muted-foreground">Subtarefa de: </span>
            <span className="font-medium text-foreground">{task.parent_task_titulo}</span>
          </div>
        </div>
      )}

      {/* General Info */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Info className="h-4 w-4" /> Informações Gerais</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Título</span>
            <p className="font-medium truncate">{task.titulo}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Status</span>
            <Badge className={`${status.color} border-0 text-xs`}>{status.label}</Badge>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Prioridade</span>
            <p className="font-medium capitalize">{task.prioridade || 'Normal'}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Criado por</span>
            <p className="font-medium">{getProfileName(task.proprietario_id)}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Criado em</span>
            <p className="font-medium">{format(new Date(task.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Atualizado em</span>
            <p className="font-medium">{format(new Date(task.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
        </div>
      </div>

      {/* Cliente */}
      {clienteVinculado && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><UserCircle className="h-4 w-4" /> Cliente Vinculado</h3>
          <div className="p-3 rounded-lg bg-accent/30 border border-border space-y-1">
            <p className="text-sm font-medium">{clienteNome}</p>
            {(clienteVinculado.cpf || clienteVinculado.cnpj) && (
              <p className="text-xs text-muted-foreground">{clienteVinculado.cpf || clienteVinculado.cnpj}</p>
            )}
          </div>
        </div>
      )}

      {/* Processo */}
      {processoVinculado && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Scale className="h-4 w-4" /> Processo Vinculado</h3>
          <div className="p-3 rounded-lg bg-accent/30 border border-border space-y-1">
            <p className="text-sm font-medium">{processoVinculado.numero_cnj || 'Sem CNJ'}</p>
            <p className="text-xs text-muted-foreground">{[processoVinculado.parte_ativa, processoVinculado.parte_passiva].filter(Boolean).join(' x ')}</p>
            {processoVinculado.tribunal && <p className="text-xs text-muted-foreground">Tribunal: {processoVinculado.tribunal}</p>}
          </div>
        </div>
      )}

      {/* Etapas */}
      {etapas.totalCount > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Milestone className="h-4 w-4" /> Etapas ({etapas.completedCount}/{etapas.totalCount})</h3>
          <Progress value={etapaProgress} className="h-2" />
          <div className="space-y-1">
            {etapas.etapas.map((et, idx) => (
              <div key={et.id} className="flex items-center gap-2 text-sm py-1">
                {et.concluida ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />}
                <span className={et.concluida ? 'line-through text-muted-foreground' : ''}>{idx + 1}. {et.titulo}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtarefas */}
      {subtasks.totalCount > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><ListChecks className="h-4 w-4" /> Subtarefas ({subtasks.completedCount}/{subtasks.totalCount})</h3>
          <div className="space-y-1">
            {subtasks.subtasks.map(st => (
              <div key={st.id} className="flex items-center gap-2 text-sm py-1 px-2 rounded-md bg-accent/20">
                {st.concluida ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />}
                <span className={`flex-1 ${st.concluida ? 'line-through text-muted-foreground' : ''}`}>{st.titulo}</span>
                {st.prazo && <span className="text-xs text-muted-foreground">{format(new Date(st.prazo), 'dd/MM/yyyy', { locale: ptBR })}</span>}
                <span className="text-[10px] text-muted-foreground/60">Vinculada à tarefa: {task.titulo}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participantes */}
      {participants.participants.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Participantes</h3>
          <div className="flex flex-wrap gap-2">
            {participants.participants.map(p => (
              <div key={p.user_id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/30 border border-border text-sm">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-3 w-3 text-primary" />
                </div>
                {getProfileName(p.user_id)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Activity className="h-4 w-4" /> Registro de Atividades</h3>
        {activityLog.entries.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Nenhuma atividade registrada ainda.</p>
        ) : (
          <div className="space-y-0 relative">
            <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />
            {activityLog.entries.map(entry => (
              <div key={entry.id} className="flex gap-3 py-2 relative">
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shrink-0 z-10">
                  <Activity className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{entry.user_id ? getProfileName(entry.user_id) : 'Sistema'}</span>
                    {' '}
                    <span className="text-muted-foreground">{ACTION_LABELS[entry.action] || entry.action}</span>
                  </p>
                  {entry.details && Object.keys(entry.details).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Object.entries(entry.details).filter(([k]) => !k.endsWith('_id')).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-stretch animate-in fade-in duration-200" onDoubleClick={(e) => { e.stopPropagation(); onClose(); }} onClick={(e) => e.stopPropagation()}>
        <div className="flex w-full max-w-6xl mx-auto my-4 rounded-2xl overflow-hidden shadow-2xl border border-border bg-background pointer-events-auto" onDoubleClick={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>

          {/* Left Panel */}
          <div className="w-[45%] flex flex-col border-r border-border">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div className="flex items-center gap-2">
                <Badge className={`${status.color} border-0 text-xs`}>{status.label}</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab('detalhes')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'detalhes' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Detalhes
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'info' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Info className="h-3.5 w-3.5" /> Info
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'detalhes' ? renderDetailsTab() : renderInfoTab()}

            {/* Bottom Actions */}
            <div className="px-5 py-3 border-t border-border flex items-center gap-2">
              {task.status !== 'in_progress' && task.status !== 'completed' && (
                <Button size="sm" variant="outline" onClick={() => handleStatusChange('in_progress')} className="gap-1.5">
                  <Play className="h-3.5 w-3.5" />
                  Iniciar
                </Button>
              )}
              {task.status !== 'completed' && (
                <Button size="sm" onClick={() => handleStatusChange('completed')} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Concluir
                </Button>
              )}
              <Button size="sm" variant="ghost" className="ml-auto text-destructive hover:text-destructive" onClick={() => { onDelete(task.id); onClose(); }}>
                Excluir
              </Button>
            </div>
          </div>

          {/* Right Panel - Chat */}
          <div className="w-[55%] flex flex-col">
            <PlanejadorTaskChat taskId={task.id} />
          </div>
        </div>
      </div>

      {/* Participants Dialog */}
      <Dialog open={participantsOpen} onOpenChange={(open) => { setParticipantsOpen(open); if (!open) setParticipantSearch(""); }}>
        <DialogContent className="max-w-md z-[90]">
          <DialogHeader>
            <DialogTitle>Participantes</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar usuário..." value={participantSearch} onChange={(e) => setParticipantSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {profiles.filter((p: any) => (p.full_name || '').toLowerCase().includes(participantSearch.toLowerCase())).map((profile: any) => {
              const isParticipant = participantUserIds.includes(profile.user_id);
              const isOwner = profile.user_id === task.proprietario_id;
              return (
                <div key={profile.user_id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-accent/50">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{profile.full_name || 'Usuário'}</p>
                    {isOwner && <span className="text-xs text-muted-foreground">Criador</span>}
                  </div>
                  {!isOwner && (
                    <Checkbox
                      checked={isParticipant}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          participants.add.mutate(profile.user_id, {
                            onSuccess: () => logActivity('participant_added', { user: profile.full_name }),
                          });
                        } else {
                          participants.remove.mutate(profile.user_id, {
                            onSuccess: () => logActivity('participant_removed', { user: profile.full_name }),
                          });
                        }
                      }}
                    />
                  )}
                  {isOwner && (
                    <Badge variant="secondary" className="text-xs">Criador</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Deadline Dialog */}
      {tenantId && (
        <EditarPrazoDialog
          deadline={editingPrazoDeadline}
          open={editPrazoOpen}
          onOpenChange={setEditPrazoOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['planejador-prazos'] });
            queryClient.invalidateQueries({ queryKey: ['planejador-tasks'] });
          }}
          tenantId={tenantId}
        />
      )}

      {/* Client Info Dialog */}
      <Dialog open={clienteInfoOpen} onOpenChange={setClienteInfoOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dados Cadastrais do Cliente</DialogTitle>
          </DialogHeader>
          {clienteCompleto ? (
            <ClienteDetails cliente={clienteCompleto} onEdit={() => {}} readOnly hideFinancialData={userRole !== 'admin'} />
          ) : (
            <p className="text-sm text-muted-foreground py-4">Carregando dados...</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
