import { useState } from "react";
import { PlanejadorTask } from "@/hooks/usePlanejadorTasks";
import { PlanejadorTaskChat } from "./PlanejadorTaskChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Play, CheckCircle, MoreHorizontal, Calendar, User, Clock, FileText, ListChecks, Users, Tag, Bell, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const SIDEBAR_ITEMS = [
  { icon: ListChecks, label: 'Subtarefas' },
  { icon: FileText, label: 'Arquivos' },
  { icon: Users, label: 'Participantes' },
  { icon: Tag, label: 'Marcadores' },
  { icon: Bell, label: 'Lembretes' },
];

export function PlanejadorTaskDetail({ task, onClose, onUpdate, onDelete }: PlanejadorTaskDetailProps) {
  const [titulo, setTitulo] = useState(task.titulo);
  const [descricao, setDescricao] = useState(task.descricao || "");
  const status = STATUS_MAP[task.status] || STATUS_MAP.pending;

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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-stretch animate-in fade-in duration-200">
      <div className="flex w-full max-w-6xl mx-auto my-4 rounded-2xl overflow-hidden shadow-2xl border border-border bg-background">
        
        {/* Left Panel - Task Details (45%) */}
        <div className="w-[45%] flex flex-col border-r border-border">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Badge className={`${status.color} border-0 text-xs`}>
                {status.label}
              </Badge>
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
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-28">Responsável</span>
                <span className="text-sm font-medium">{task.responsavel_id ? 'Atribuído' : 'Sem responsável'}</span>
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

            {/* Sidebar items */}
            <div className="space-y-1">
              {SIDEBAR_ITEMS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="px-5 py-3 border-t border-border flex items-center gap-2">
            {task.status !== 'in_progress' && task.status !== 'completed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdate(task.id, { status: 'in_progress' })}
                className="gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                Iniciar
              </Button>
            )}
            {task.status !== 'completed' && (
              <Button
                size="sm"
                onClick={() => onUpdate(task.id, { status: 'completed' })}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Concluir
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-destructive hover:text-destructive"
              onClick={() => { onDelete(task.id); onClose(); }}
            >
              Excluir
            </Button>
          </div>
        </div>

        {/* Right Panel - Chat (55%) */}
        <div className="w-[55%] flex flex-col">
          <PlanejadorTaskChat taskId={task.id} />
        </div>
      </div>
    </div>
  );
}
