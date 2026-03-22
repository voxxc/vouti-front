import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { PlanejadorTask } from "@/hooks/usePlanejadorTasks";
import { PlanejadorTaskChat } from "./PlanejadorTaskChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  X, Play, CheckCircle, Calendar, User, Clock, FileText, ListChecks, Users, Tag, ArrowLeft,
  Plus, Trash2, Download, Upload, ChevronDown, ChevronRight, Search, UserCircle, Scale, CalendarClock, Unlink,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePlanejadorSubtasks } from "@/hooks/usePlanejadorSubtasks";
import { usePlanejadorFiles } from "@/hooks/usePlanejadorFiles";
import { usePlanejadorParticipants } from "@/hooks/usePlanejadorParticipants";
import { usePlanejadorLabels, usePlanejadorLabelAssignments } from "@/hooks/usePlanejadorLabels";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const status = STATUS_MAP[task.status] || STATUS_MAP.pending;

  // Hooks
  const subtasks = usePlanejadorSubtasks(task.id);
  const files = usePlanejadorFiles(task.id);
  const participants = usePlanejadorParticipants(task.id);
  const { labels, createLabel } = usePlanejadorLabels();
  const labelAssignments = usePlanejadorLabelAssignments(task.id);

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

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    subtasks.create.mutate({
      titulo: newSubtaskTitle.trim(),
      prazo: newSubtaskPrazo || undefined,
    });
    setNewSubtaskTitle("");
    setNewSubtaskPrazo("");
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

  const assignedLabelIds = labelAssignments.assignments.map(a => a.label_id);
  const participantUserIds = participants.participants.map(p => p.user_id);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const sidebarItems = [
    {
      key: 'subtarefas',
      icon: ListChecks,
      label: 'Subtarefas',
      count: `${subtasks.completedCount}/${subtasks.totalCount}`,
    },
    { key: 'arquivos', icon: FileText, label: 'Arquivos', count: `${files.files.length}` },
    { key: 'participantes', icon: Users, label: 'Participantes', count: `${participants.participants.length}` },
    { key: 'marcadores', icon: Tag, label: 'Marcadores', count: `${assignedLabelIds.length}` },
  ];

  return createPortal(
    <>
      <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-stretch animate-in fade-in duration-200 pointer-events-auto" onDoubleClick={(e) => { e.stopPropagation(); onClose(); }}>
        <div className="flex w-full max-w-6xl mx-auto my-4 rounded-2xl overflow-hidden shadow-2xl border border-border bg-background" onDoubleClick={(e) => e.stopPropagation()}>

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

            {/* Scrollable Content */}
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
                  <span className="text-sm text-muted-foreground w-28">Proprietário</span>
                  <span className="text-sm font-medium">Você</span>
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
                          <Input
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            placeholder="Nova subtarefa..."
                            className="h-8 text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                          />
                          <Input
                            type="date"
                            value={newSubtaskPrazo}
                            onChange={(e) => setNewSubtaskPrazo(e.target.value)}
                            className="h-8 text-sm w-36"
                          />
                          <Button size="sm" className="h-8 px-2" onClick={handleAddSubtask} disabled={subtasks.create.isPending}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {subtasks.subtasks.map(st => (
                          <div key={st.id} className="flex items-center gap-2 py-1 group">
                            <Checkbox
                              checked={st.concluida}
                              onCheckedChange={(checked) => subtasks.toggle.mutate({ id: st.id, concluida: !!checked })}
                            />
                            <span className={`text-sm flex-1 ${st.concluida ? 'line-through text-muted-foreground' : ''}`}>
                              {st.titulo}
                            </span>
                            {st.prazo && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(st.prazo), 'dd/MM', { locale: ptBR })}
                              </span>
                            )}
                            <button
                              onClick={() => subtasks.remove.mutate(st.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ARQUIVOS */}
                    {key === 'arquivos' && expandedSection === 'arquivos' && (
                      <div className="ml-4 mt-2 space-y-2">
                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-8"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={files.upload.isPending}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {files.upload.isPending ? 'Enviando...' : 'Enviar arquivo'}
                        </Button>
                        {files.files.map(f => (
                          <div key={f.id} className="flex items-center gap-2 py-1 group">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm flex-1 truncate">{f.file_name}</span>
                            <span className="text-xs text-muted-foreground">{formatFileSize(f.file_size)}</span>
                            <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="p-0.5 hover:text-primary">
                              <Download className="h-3.5 w-3.5" />
                            </a>
                            <button
                              onClick={() => files.remove.mutate(f.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* MARCADORES */}
                    {key === 'marcadores' && expandedSection === 'marcadores' && (
                      <div className="ml-4 mt-2 space-y-2">
                        {/* Create new label */}
                        <div className="flex gap-2">
                          <Input
                            value={newLabelName}
                            onChange={(e) => setNewLabelName(e.target.value)}
                            placeholder="Novo marcador..."
                            className="h-8 text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateLabel()}
                          />
                          <div className="flex gap-1 items-center">
                            {LABEL_COLORS.map(c => (
                              <button
                                key={c}
                                onClick={() => setNewLabelColor(c)}
                                className={`w-5 h-5 rounded-full transition-transform ${newLabelColor === c ? 'scale-125 ring-2 ring-offset-1 ring-offset-background ring-primary' : ''}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <Button size="sm" className="h-8 px-2" onClick={handleCreateLabel} disabled={createLabel.isPending}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {/* Existing labels */}
                        {labels.map(label => {
                          const isAssigned = assignedLabelIds.includes(label.id);
                          return (
                            <button
                              key={label.id}
                              onClick={() => {
                                if (isAssigned) labelAssignments.unassign.mutate(label.id);
                                else labelAssignments.assign.mutate(label.id);
                              }}
                              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors ${
                                isAssigned ? 'bg-accent' : 'hover:bg-accent/50'
                              }`}
                            >
                              <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                              <span className="flex-1 text-left">{label.name}</span>
                              {isAssigned && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-5 py-3 border-t border-border flex items-center gap-2">
              {task.status !== 'in_progress' && task.status !== 'completed' && (
                <Button size="sm" variant="outline" onClick={() => onUpdate(task.id, { status: 'in_progress' })} className="gap-1.5">
                  <Play className="h-3.5 w-3.5" />
                  Iniciar
                </Button>
              )}
              {task.status !== 'completed' && (
                <Button size="sm" onClick={() => onUpdate(task.id, { status: 'completed' })} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
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
                    {isOwner && <span className="text-xs text-muted-foreground">Proprietário</span>}
                  </div>
                  {!isOwner && (
                    <Checkbox
                      checked={isParticipant}
                      onCheckedChange={(checked) => {
                        if (checked) participants.add.mutate(profile.user_id);
                        else participants.remove.mutate(profile.user_id);
                      }}
                    />
                  )}
                  {isOwner && (
                    <Badge variant="secondary" className="text-xs">Dono</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>,
    document.body
  );
}
