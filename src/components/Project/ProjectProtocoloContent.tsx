import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, isPast, isToday } from 'date-fns';
import { parseLocalDate } from '@/lib/dateUtils';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  ListChecks, 
  History,
  Plus,
  Trash2,
  Loader2,
  X,
  Calendar,
  User,
  CheckCircle2,
  Printer,
  Settings,
  Link2,
  Clock,
  AlertCircle,
  Info,
  MessageSquare,
  Pencil,
  Save,
  Scale,
  ExternalLink,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { supabase } from '@/integrations/supabase/client';
import { ProjectProtocolo, ProjectProtocoloEtapa, CreateEtapaData } from '@/hooks/useProjectProtocolos';
import { useProjectAdvogado } from '@/hooks/useProjectAdvogado';
import { useProtocoloVinculo } from '@/hooks/useProtocoloVinculo';
import { TarefaOAB } from '@/hooks/useTarefasOAB';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { EtapaModal } from './EtapaModal';
import { ConcluirEtapaModal } from './ConcluirEtapaModal';
import { RelatorioProtocolo } from './RelatorioProtocolo';
import { EditarAdvogadoProjectModal } from './EditarAdvogadoProjectModal';
import { ProtocoloVinculoTab } from './ProtocoloVinculoTab';
import { DeadlineComentarios } from '@/components/Agenda/DeadlineComentarios';
import { EditarPrazoDialog } from '@/components/Agenda/EditarPrazoDialog';
import { Deadline } from '@/types/agenda';
import { TaskComentarios } from './TaskComentarios';
import { Separator } from '@/components/ui/separator';
import { useTenantId } from '@/hooks/useTenantId';
import { parseISO, isValid } from 'date-fns';

export interface ProjectProtocoloContentProps {
  protocolo: ProjectProtocolo;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddEtapa: (protocoloId: string, data: CreateEtapaData) => Promise<void>;
  onUpdateEtapa: (id: string, data: any) => Promise<void>;
  onDeleteEtapa: (id: string) => Promise<void>;
  projectId?: string;
  onRefetch?: () => Promise<void>;
  onClose?: () => void;
}

const STATUS_LABELS: Record<ProjectProtocolo['status'], string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado'
};

const STATUS_COLORS: Record<ProjectProtocolo['status'], string> = {
  pendente: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  em_andamento: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  concluido: 'bg-green-500/10 text-green-600 border-green-500/20',
  cancelado: 'bg-muted text-muted-foreground border-muted'
};

export function ProjectProtocoloContent({
  protocolo,
  onUpdate,
  onDelete,
  onAddEtapa,
  onUpdateEtapa,
  onDeleteEtapa,
  projectId,
  onRefetch,
  onClose
}: ProjectProtocoloContentProps) {
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [newEtapaNome, setNewEtapaNome] = useState('');
  const [addingEtapa, setAddingEtapa] = useState(false);
  const [selectedEtapa, setSelectedEtapa] = useState<ProjectProtocoloEtapa | null>(null);
  const [togglingEtapaId, setTogglingEtapaId] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editDataPrevisao, setEditDataPrevisao] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');
  
  const [etapaToComplete, setEtapaToComplete] = useState<ProjectProtocoloEtapa | null>(null);
  const [showConcluirModal, setShowConcluirModal] = useState(false);
  const [showRelatorioModal, setShowRelatorioModal] = useState(false);
  const [showAdvogadoModal, setShowAdvogadoModal] = useState(false);
  
  const [prazosVinculados, setPrazosVinculados] = useState<any[]>([]);
  const [loadingPrazos, setLoadingPrazos] = useState(false);
  
  const [selectedDeadline, setSelectedDeadline] = useState<any | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [casoVinculadoData, setCasoVinculadoData] = useState<any | null>(null);
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);
  const [comentarioConclusao, setComentarioConclusao] = useState('');
  const [criarSubtarefa, setCriarSubtarefa] = useState(false);
  const [subtarefaDescricao, setSubtarefaDescricao] = useState('');
  const [cumprirEtapa, setCumprirEtapa] = useState(false);
  const [etapaJaConcluida, setEtapaJaConcluida] = useState(false);
  const [isEditPrazoOpen, setIsEditPrazoOpen] = useState(false);
  const [editingDeadlineObj, setEditingDeadlineObj] = useState<Deadline | null>(null);
  const [deleteDeadlineConfirm, setDeleteDeadlineConfirm] = useState<string | null>(null);
  const [reopenConfirmId, setReopenConfirmId] = useState<string | null>(null);
  const [reopenMotivo, setReopenMotivo] = useState('');
  const [completedByProfile, setCompletedByProfile] = useState<any | null>(null);
  
  const [tarefasProcesso, setTarefasProcesso] = useState<TarefaOAB[]>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { tenantId } = useTenantId();
  const { advogado, refetch: refetchAdvogado } = useProjectAdvogado(projectId || '');
  const { processoVinculado, refetch: refetchVinculo } = useProtocoloVinculo(
    protocolo?.id || null, 
    protocolo?.processoOabId
  );

  // Auto-open etapa from URL query param (deep navigation from notifications)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const etapaParam = searchParams.get('etapa');
    if (!etapaParam || !protocolo?.etapas?.length) return;
    const etapa = protocolo.etapas.find(e => e.id === etapaParam);
    if (etapa) {
      setSelectedEtapa(etapa);
      searchParams.delete('etapa');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, protocolo?.etapas]);

  const fetchPrazosVinculados = useCallback(async () => {
    if (!protocolo?.etapas?.length) return;
    
    setLoadingPrazos(true);
    const etapaIds = protocolo.etapas.map(e => e.id);
    
    const { data, error } = await supabase
      .from('deadlines')
      .select(`
        id, title, description, date, completed, protocolo_etapa_id, project_id, tenant_id,
        comentario_conclusao, concluido_por, concluido_em, deadline_number, processo_oab_id,
        projects (name, client),
        advogado:profiles!deadlines_advogado_responsavel_id_fkey (user_id, full_name, avatar_url),
        concluido_por_profile:profiles!deadlines_concluido_por_fkey (user_id, full_name, avatar_url),
        deadline_tags (tagged_user_id, tagged_user:profiles!deadline_tags_tagged_user_id_fkey (user_id, full_name, avatar_url))
      `)
      .in('protocolo_etapa_id', etapaIds)
      .order('created_at', { ascending: false });
    
    if (!error) setPrazosVinculados(data || []);
    setLoadingPrazos(false);
  }, [protocolo?.etapas]);

  useEffect(() => {
    fetchPrazosVinculados();
  }, [fetchPrazosVinculados]);

  useEffect(() => {
    const handler = () => {
      fetchPrazosVinculados();
    };
    window.addEventListener('deadline-created', handler);
    return () => window.removeEventListener('deadline-created', handler);
  }, [fetchPrazosVinculados]);

  const fetchTarefasProcesso = async () => {
    if (!protocolo?.processoOabId) {
      setTarefasProcesso([]);
      return;
    }
    
    const { data, error } = await supabase
      .from('processos_oab_tarefas')
      .select('*')
      .eq('processo_oab_id', protocolo.processoOabId)
      .order('data_execucao', { ascending: true });
    
    if (!error) setTarefasProcesso((data as TarefaOAB[]) || []);
  };

  useEffect(() => {
    fetchTarefasProcesso();
  }, [protocolo?.processoOabId]);

  const openDeadlineDetails = async (prazo: any) => {
    setSelectedDeadline(prazo);
    setIsDetailDialogOpen(true);
    
    // Fetch caso vinculado if protocolo has processoOabId
    if (protocolo?.processoOabId) {
      const { data } = await supabase
        .from('processos_oab')
        .select('id, numero_cnj, parte_ativa, parte_passiva, tribunal')
        .eq('id', protocolo.processoOabId)
        .single();
      setCasoVinculadoData(data || null);
    } else {
      setCasoVinculadoData(null);
    }
  };

  const toggleDeadlineCompletion = async (deadlineId: string, currentStatus: boolean) => {
    // Se está concluindo, usar campos completos de auditoria
    if (!currentStatus) {
      const updateData: any = {
        completed: true,
        comentario_conclusao: comentarioConclusao.trim() || null,
        concluido_por: user?.id || null,
        concluido_em: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('deadlines')
        .update(updateData)
        .eq('id', deadlineId);

      if (error) {
        toast({ title: "Erro", description: "Não foi possível concluir o prazo.", variant: "destructive" });
        return;
      }

      // Criar subtarefa se solicitado
      if (criarSubtarefa && subtarefaDescricao.trim()) {
        const prazoData = prazosVinculados.find(p => p.id === deadlineId);
        await supabase
          .from('deadline_subtarefas')
          .insert({
            deadline_id: deadlineId,
            descricao: subtarefaDescricao.trim(),
            criado_por: user?.id || '',
            tenant_id: prazoData?.tenant_id || null,
          });
      }

      // Cumprir etapa do protocolo se solicitado
      if (cumprirEtapa) {
        const prazoData = prazosVinculados.find(p => p.id === deadlineId);
        if (prazoData?.protocolo_etapa_id) {
          await supabase
            .from('project_protocolo_etapas')
            .update({
              status: 'concluido',
              data_conclusao: new Date().toISOString(),
              comentario_conclusao: comentarioConclusao.trim() || null,
            })
            .eq('id', prazoData.protocolo_etapa_id);
        }
      }

      const updatedFields = { completed: true, comentario_conclusao: comentarioConclusao.trim() || null, concluido_por: user?.id || null, concluido_em: new Date().toISOString() };
      setPrazosVinculados(prev => prev.map(p => p.id === deadlineId ? { ...p, ...updatedFields } : p));
      if (selectedDeadline?.id === deadlineId) {
        setSelectedDeadline((prev: any) => prev ? { ...prev, ...updatedFields, concluido_por_profile: { user_id: user?.id, full_name: user?.user_metadata?.full_name || 'Você' } } : null);
      }
      setConfirmCompleteId(null);
      setComentarioConclusao('');
      setCriarSubtarefa(false);
      setSubtarefaDescricao('');
      setCumprirEtapa(false);
      setEtapaJaConcluida(false);
      toast({ title: "Prazo concluído", description: "Prazo marcado como concluído com sucesso." });
    } else {
      // Reabrir prazo - registrar motivo no histórico
      const motivo = reopenMotivo.trim();
      if (!motivo) return;

      const { error } = await supabase
        .from('deadlines')
        .update({ completed: false, comentario_conclusao: null, concluido_por: null, concluido_em: null })
        .eq('id', deadlineId);

      if (error) {
        toast({ title: "Erro", description: "Não foi possível reabrir o prazo.", variant: "destructive" });
        return;
      }

      // Registrar motivo no histórico de comentários
      await supabase.from('deadline_comentarios').insert({
        deadline_id: deadlineId,
        user_id: user?.id || '',
        comentario: `🔄 Prazo reaberto. Motivo: ${motivo}`,
        tenant_id: tenantId || null,
      });

      const resetFields = { completed: false, comentario_conclusao: null, concluido_por: null, concluido_em: null, concluido_por_profile: null };
      setPrazosVinculados(prev => prev.map(p => p.id === deadlineId ? { ...p, ...resetFields } : p));
      if (selectedDeadline?.id === deadlineId) {
        setSelectedDeadline((prev: any) => prev ? { ...prev, ...resetFields } : null);
      }
      setReopenConfirmId(null);
      setReopenMotivo('');
      toast({ title: "Prazo reaberto", description: "Prazo marcado como pendente." });
    }
  };

  const safeParseDate = (dateString: string | null | undefined): Date => {
    if (!dateString) return new Date();
    try {
      const parsed = parseISO(dateString + 'T12:00:00');
      return isValid(parsed) ? parsed : new Date();
    } catch { return new Date(); }
  };

  const mapPrazoToDeadline = (prazo: any): Deadline => ({
    id: prazo.id,
    title: prazo.title,
    description: prazo.description || '',
    date: safeParseDate(prazo.date),
    projectId: prazo.project_id || projectId || '',
    projectName: prazo.projects?.name || '',
    clientName: prazo.projects?.client || '',
    completed: prazo.completed,
    advogadoResponsavel: prazo.advogado ? {
      userId: prazo.advogado.user_id,
      name: prazo.advogado.full_name,
      avatar: prazo.advogado.avatar_url,
    } : undefined,
    taggedUsers: (prazo.deadline_tags || []).filter((t: any) => t.tagged_user).map((t: any) => ({
      userId: t.tagged_user.user_id,
      name: t.tagged_user.full_name || 'Usuário',
      avatar: t.tagged_user.avatar_url,
    })),
    createdAt: new Date(prazo.created_at || Date.now()),
    updatedAt: new Date(prazo.updated_at || Date.now()),
    processoOabId: protocolo?.processoOabId || undefined,
    protocoloEtapaId: prazo.protocolo_etapa_id || undefined,
    deadlineNumber: prazo.deadline_number || undefined,
  });

  const handleEditDeadline = (prazo: any) => {
    setEditingDeadlineObj(mapPrazoToDeadline(prazo));
    setIsEditPrazoOpen(true);
  };

  const handleDeleteDeadline = async (deadlineId: string) => {
    const { error } = await supabase.from('deadlines').delete().eq('id', deadlineId);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível excluir o prazo.", variant: "destructive" });
      return;
    }
    setPrazosVinculados(prev => prev.filter(p => p.id !== deadlineId));
    if (selectedDeadline?.id === deadlineId) {
      setIsDetailDialogOpen(false);
      setSelectedDeadline(null);
    }
    setDeleteDeadlineConfirm(null);
    toast({ title: "Prazo excluído" });
  };

  useEffect(() => {
    if (selectedEtapa && protocolo?.etapas) {
      const updatedEtapa = protocolo.etapas.find(e => e.id === selectedEtapa.id);
      if (updatedEtapa) {
        if (updatedEtapa !== selectedEtapa) setSelectedEtapa(updatedEtapa);
      } else {
        setSelectedEtapa(null);
      }
    }
  }, [protocolo?.etapas, protocolo?.id, selectedEtapa?.id]);

  const etapasConcluidas = protocolo.etapas?.filter(e => e.status === 'concluido').length || 0;
  const totalEtapas = protocolo.etapas?.length || 0;
  const progressPercent = totalEtapas > 0 ? Math.round((etapasConcluidas / totalEtapas) * 100) : 0;

  const handleStatusChange = async (newStatus: ProjectProtocolo['status']) => {
    setSaving(true);
    try {
      await onUpdate(protocolo.id, { status: newStatus, dataConclusao: newStatus === 'concluido' ? new Date() : undefined });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await onDelete(protocolo.id);
      onClose?.();
    } finally {
      setSaving(false);
      setDeleteConfirm(false);
    }
  };

  const handleAddEtapa = async () => {
    if (!newEtapaNome.trim()) return;
    setAddingEtapa(true);
    try {
      await onAddEtapa(protocolo.id, { nome: newEtapaNome.trim() });
      setNewEtapaNome('');
    } finally { setAddingEtapa(false); }
  };

  const handleToggleEtapa = async (etapa: ProjectProtocoloEtapa) => {
    if (etapa.status !== 'concluido') {
      setEtapaToComplete(etapa);
      setShowConcluirModal(true);
    } else {
      setTogglingEtapaId(etapa.id);
      try {
        await onUpdateEtapa(etapa.id, { status: 'pendente', dataConclusao: undefined, comentarioConclusao: undefined });
      } finally { setTogglingEtapaId(null); }
    }
  };

  const handleConfirmConclusao = async (comentario: string) => {
    if (!etapaToComplete) return;
    setTogglingEtapaId(etapaToComplete.id);
    try {
      await onUpdateEtapa(etapaToComplete.id, { status: 'concluido', dataConclusao: new Date(), comentarioConclusao: comentario });
    } finally {
      setTogglingEtapaId(null);
      setEtapaToComplete(null);
    }
  };

  const handleDeleteEtapa = async (etapaId: string) => { await onDeleteEtapa(etapaId); };

  const startEditing = () => {
    setEditNome(protocolo.nome);
    setEditDescricao(protocolo.descricao || '');
    setEditDataPrevisao(protocolo.dataPrevisao ? format(protocolo.dataPrevisao, 'yyyy-MM-dd') : '');
    setEditObservacoes(protocolo.observacoes || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditNome(''); setEditDescricao(''); setEditDataPrevisao(''); setEditObservacoes('');
  };

  const saveEditing = async () => {
    if (!editNome.trim()) return;
    setSaving(true);
    try {
      await onUpdate(protocolo.id, {
        nome: editNome.trim(),
        descricao: editDescricao.trim() || null,
        dataPrevisao: editDataPrevisao ? new Date(editDataPrevisao + 'T12:00:00') : null,
        observacoes: editObservacoes.trim() || null
      });
      setIsEditing(false);
    } finally { setSaving(false); }
  };

  return (
    <>
      {/* Header with progress */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <Badge className={STATUS_COLORS[protocolo.status]}>
            {STATUS_LABELS[protocolo.status]}
          </Badge>
        </div>
        {totalEtapas > 0 && (
          <div className="flex items-center gap-3">
            <Progress value={progressPercent} className="flex-1 h-2" />
            <span className="text-sm text-muted-foreground">{progressPercent}%</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="resumo" className="flex-1 flex flex-col overflow-hidden" onValueChange={(val) => { if (val === 'prazos') fetchPrazosVinculados(); }}>
        <TabsList className="w-full h-auto bg-transparent p-0 justify-start gap-6 border-b shrink-0">
          <TabsTrigger value="resumo" className="bg-transparent px-0 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="etapas" className="bg-transparent px-0 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">
            Etapas
          </TabsTrigger>
          <TabsTrigger value="prazos" className="bg-transparent px-0 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">
            Prazos
          </TabsTrigger>
          <TabsTrigger value="vinculo" className="bg-transparent px-0 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">
            Vínculo
          </TabsTrigger>
          <TabsTrigger value="historico" className="bg-transparent px-0 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">
            Histórico
          </TabsTrigger>
          <TabsTrigger value="relatorio" className="bg-transparent px-0 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">
            Relatório
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="resumo" className="p-4 m-0 space-y-6">
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nome">Nome do Processo *</Label>
                  <Input id="edit-nome" value={editNome} onChange={(e) => setEditNome(e.target.value)} placeholder="Nome do processo" disabled={saving} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-descricao">Descrição</Label>
                  <Textarea id="edit-descricao" value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} placeholder="Descrição do processo" disabled={saving} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-previsao">Data de Previsão</Label>
                  <Input id="edit-previsao" type="date" value={editDataPrevisao} onChange={(e) => setEditDataPrevisao(e.target.value)} disabled={saving} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-observacoes">Observações</Label>
                  <Textarea id="edit-observacoes" value={editObservacoes} onChange={(e) => setEditObservacoes(e.target.value)} placeholder="Observações adicionais" disabled={saving} rows={3} />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={cancelEditing} disabled={saving}>
                    <X className="h-4 w-4 mr-2" /> Cancelar
                  </Button>
                  <Button className="flex-1" onClick={saveEditing} disabled={saving || !editNome.trim()}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-muted-foreground text-xs uppercase">Descrição</Label>
                  <p className="mt-1 text-sm">{protocolo.descricao || <span className="text-muted-foreground italic">Sem descrição</span>}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1"><Calendar className="h-3 w-3" /> Data de Início</Label>
                    <p className="mt-1 font-medium">{format(protocolo.dataInicio, "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                  {protocolo.dataPrevisao && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1"><Calendar className="h-3 w-3" /> Previsão</Label>
                      <p className="mt-1 font-medium">{format(protocolo.dataPrevisao, "dd/MM/yyyy", { locale: ptBR })}</p>
                    </div>
                  )}
                  {protocolo.dataConclusao && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Concluído em</Label>
                      <p className="mt-1 font-medium">{format(protocolo.dataConclusao, "dd/MM/yyyy", { locale: ptBR })}</p>
                    </div>
                  )}
                  {protocolo.responsavelNome && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1"><User className="h-3 w-3" /> Responsável</Label>
                      <p className="mt-1 font-medium">{protocolo.responsavelNome}</p>
                    </div>
                  )}
                </div>
                {protocolo.observacoes && (
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase">Observações</Label>
                    <p className="mt-1 text-sm">{protocolo.observacoes}</p>
                  </div>
                )}
                <Separator />
                <TaskComentarios taskId={protocolo.id} currentUserId={user?.id || ''} commentType="protocolo" contextTitle={protocolo.nome} relatedProjectId={projectId} />

                <div className="pt-4 border-t space-y-3">
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase mb-2 block">Alterar Status</Label>
                    <Select value={protocolo.status} onValueChange={(value) => handleStatusChange(value as ProjectProtocolo['status'])} disabled={saving}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={startEditing}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirm(true)} disabled={saving}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="etapas" className="p-4 m-0 space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Nova etapa..." value={newEtapaNome} onChange={(e) => setNewEtapaNome(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddEtapa()} disabled={addingEtapa} />
              <Button onClick={handleAddEtapa} disabled={addingEtapa || !newEtapaNome.trim()}>
                {addingEtapa ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            {(!protocolo.etapas || protocolo.etapas.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">
                <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Nenhuma etapa cadastrada</p>
                <p className="text-sm">Adicione etapas para acompanhar o progresso</p>
              </div>
            ) : (
              <div className="space-y-2">
                {protocolo.etapas.map((etapa) => (
                  <div key={etapa.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-accent/50 relative ${etapa.status === 'concluido' ? 'bg-green-500/5 border-green-500/20' : 'bg-card'}`}>
                    {togglingEtapaId === etapa.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Checkbox checked={etapa.status === 'concluido'} onCheckedChange={() => handleToggleEtapa(etapa)} onClick={(e) => e.stopPropagation()} />
                    )}
                    <div className="flex-1" onClick={() => setSelectedEtapa(etapa)}>
                      <p className={`font-medium ${etapa.status === 'concluido' ? 'line-through text-muted-foreground' : ''}`}>{etapa.nome}</p>
                      {etapa.descricao && <p className="text-sm text-muted-foreground">{etapa.descricao}</p>}
                      {etapa.dataConclusao && <p className="text-xs text-muted-foreground mt-1">Concluído em {format(etapa.dataConclusao, "dd/MM/yyyy", { locale: ptBR })}</p>}
                      {etapa.comentarioConclusao && <p className="text-xs text-green-600 mt-1 italic">"{etapa.comentarioConclusao}"</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteEtapa(etapa.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="vinculo" className="p-4 m-0">
            <ProtocoloVinculoTab
              protocoloId={protocolo.id}
              processoOabId={protocolo.processoOabId}
              workspaceId={protocolo.workspaceId}
              projectId={projectId}
              onVinculoChange={async () => {
                refetchVinculo();
                if (onRefetch) await onRefetch();
                fetchTarefasProcesso();
              }}
            />
          </TabsContent>

          <TabsContent value="prazos" className="p-4 m-0 space-y-4">
            {loadingPrazos ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : prazosVinculados.length === 0 && tarefasProcesso.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum prazo vinculado às etapas</p>
                <p className="text-xs mt-1">Crie prazos nas etapas do protocolo</p>
              </div>
            ) : (
              <div className="space-y-6">
                {prazosVinculados.length > 0 && (
                  <div className="space-y-4">
                    {prazosVinculados.filter(p => !p.completed).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                          Pendentes ({prazosVinculados.filter(p => !p.completed).length})
                        </h4>
                        <div className="space-y-2">
                          {prazosVinculados.filter(p => !p.completed).map(prazo => (
                            <div key={prazo.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{prazo.title}</p>
                                <p className="text-xs text-muted-foreground">{format(parseLocalDate(prazo.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                              </div>
                              <Badge variant={isPast(parseLocalDate(prazo.date)) && !isToday(parseLocalDate(prazo.date)) ? "destructive" : "outline"}>
                                {isPast(parseLocalDate(prazo.date)) && !isToday(parseLocalDate(prazo.date)) ? "Atrasado" : isToday(parseLocalDate(prazo.date)) ? "Hoje" : "Pendente"}
                              </Badge>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeadlineDetails(prazo)}>
                                <Info className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {prazosVinculados.filter(p => p.completed).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Concluídos ({prazosVinculados.filter(p => p.completed).length})
                        </h4>
                        <div className="space-y-2">
                          {prazosVinculados.filter(p => p.completed).map(prazo => (
                            <div key={prazo.id} className="flex items-center gap-3 p-3 rounded-lg border bg-green-500/5">
                              <Calendar className="h-4 w-4 text-green-500" />
                              <div className="flex-1">
                                <p className="text-sm font-medium line-through opacity-70">{prazo.title}</p>
                                <p className="text-xs text-muted-foreground">{format(parseLocalDate(prazo.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                              </div>
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Concluído</Badge>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeadlineDetails(prazo)}>
                                <Info className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {processoVinculado && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Tarefas do Processo ({tarefasProcesso.length})
                    </h4>
                    {tarefasProcesso.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">Nenhuma tarefa registrada no processo vinculado</p>
                    ) : (
                      <div className="space-y-2">
                        {tarefasProcesso.map(tarefa => (
                          <div key={tarefa.id} className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5">
                            <Calendar className="h-4 w-4 text-primary" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{tarefa.titulo}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(tarefa.data_execucao), "dd/MM/yyyy", { locale: ptBR })}
                                {tarefa.fase && ` • ${tarefa.fase}`}
                              </p>
                              {tarefa.descricao && <p className="text-xs mt-1 text-muted-foreground">{tarefa.descricao}</p>}
                            </div>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Processo</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="historico" className="p-4 m-0">
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Histórico em breve</p>
              <p className="text-sm">Aqui você verá todas as alterações do protocolo</p>
            </div>
          </TabsContent>

          <TabsContent value="relatorio" className="p-4 m-0 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                {advogado?.logoUrl ? (
                  <img src={advogado.logoUrl} alt="Logo" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center"><User className="w-6 h-6 text-muted-foreground" /></div>
                )}
                <div>
                  <p className="font-medium">{advogado?.nomeAdvogado || 'Perfil não configurado'}</p>
                  <p className="text-sm text-muted-foreground">{advogado?.emailAdvogado || 'Configure o perfil do advogado para o relatório'}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setShowAdvogadoModal(true)}>
                <Settings className="w-4 h-4 mr-2" /> Configurar
              </Button>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
              <h3 className="font-semibold">Preview do Relatório</h3>
              <p className="text-sm text-muted-foreground">O relatório incluirá:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Dados do advogado (logo, nome, contato)</li>
                {processoVinculado && <li>• Dados do processo vinculado</li>}
                <li>• Histórico do protocolo ({etapasConcluidas} etapa{etapasConcluidas !== 1 ? 's' : ''} concluída{etapasConcluidas !== 1 ? 's' : ''})</li>
                <li>• Comentários de conclusão de cada etapa</li>
              </ul>
              {!processoVinculado && (
                <p className="text-xs text-amber-600">Dica: Vincule um processo na aba "Vínculo" para incluir dados do processo no relatório.</p>
              )}
            </div>
            <Button className="w-full gap-2" onClick={() => setShowRelatorioModal(true)} disabled={etapasConcluidas === 0}>
              <Printer className="w-4 h-4" /> Visualizar e Imprimir Relatório
            </Button>
            {etapasConcluidas === 0 && (
              <p className="text-xs text-center text-muted-foreground">Conclua pelo menos uma etapa para gerar o relatório</p>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Modals */}
      <AlertDialog open={deleteConfirm} onOpenChange={(open) => { setDeleteConfirm(open); if (!open) setDeleteConfirmText(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir protocolo?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Esta ação não pode ser desfeita. O protocolo e todas as suas etapas serão excluídos permanentemente.</p>
                <p className="font-medium text-foreground">Para confirmar, digite: <span className="text-destructive">{protocolo.nome}</span></p>
                <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Digite o nome do processo" className="mt-2" />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving || deleteConfirmText !== protocolo.nome} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EtapaModal etapa={selectedEtapa} open={!!selectedEtapa} onOpenChange={(open) => !open && setSelectedEtapa(null)} onUpdate={onUpdateEtapa} onDelete={onDeleteEtapa} protocoloId={protocolo.id} projectId={projectId} />
      <ConcluirEtapaModal open={showConcluirModal} onOpenChange={setShowConcluirModal} etapaNome={etapaToComplete?.nome || ''} onConfirm={handleConfirmConclusao} />

      {projectId && (
        <RelatorioProtocolo open={showRelatorioModal} onOpenChange={setShowRelatorioModal} protocolo={protocolo} advogado={advogado} processoVinculado={processoVinculado} tarefasProcesso={tarefasProcesso} />
      )}
      {projectId && (
        <EditarAdvogadoProjectModal projectId={projectId} open={showAdvogadoModal} onOpenChange={(open) => { setShowAdvogadoModal(open); if (!open) refetchAdvogado(); }} />
      )}

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          {selectedDeadline && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> {selectedDeadline.title}</DialogTitle>
                {selectedDeadline.deadline_number && (
                  <p className="text-xs text-muted-foreground">Prazo nº {selectedDeadline.deadline_number}</p>
                )}
              </DialogHeader>
              <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className={`grid w-full ${selectedDeadline.completed ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <TabsTrigger value="info"><Info className="h-4 w-4 mr-2" /> Informações</TabsTrigger>
                  <TabsTrigger value="comments"><MessageSquare className="h-4 w-4 mr-2" /> Comentários</TabsTrigger>
                  {selectedDeadline.completed && (
                    <TabsTrigger value="conclusao"><CheckCircle2 className="h-4 w-4 mr-2" /> Conclusão</TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="info" className="flex-1 overflow-auto space-y-4 mt-4">
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase">Descrição</Label>
                    <p className="mt-1 text-sm">{selectedDeadline.description || 'Sem descrição'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase">Data</Label>
                      <p className="mt-1 font-medium">{format(parseLocalDate(selectedDeadline.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase">Projeto</Label>
                      <p className="mt-1">{selectedDeadline.projects?.name || 'Não vinculado'}</p>
                    </div>
                  </div>
                  {selectedDeadline.projects?.client && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase">Cliente</Label>
                      <p className="mt-1">{selectedDeadline.projects.client}</p>
                    </div>
                  )}
                  {selectedDeadline.advogado && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase">Responsável</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedDeadline.advogado.avatar_url} />
                          <AvatarFallback className="text-xs">{selectedDeadline.advogado.full_name?.charAt(0).toUpperCase() || 'A'}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{selectedDeadline.advogado.full_name}</span>
                      </div>
                    </div>
                  )}
                  {selectedDeadline.deadline_tags?.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase">Usuários Marcados</Label>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {selectedDeadline.deadline_tags.map((tag: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={tag.tagged_user?.avatar_url} />
                              <AvatarFallback className="text-xs">{tag.tagged_user?.full_name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{tag.tagged_user?.full_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Caso Vinculado */}
                  {casoVinculadoData && (
                    <div className="border rounded-lg p-3 bg-primary/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Scale className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium">Caso Vinculado</Label>
                      </div>
                      <div className="space-y-1 text-sm">
                        {casoVinculadoData.numero_cnj && (
                          <p><strong>CNJ:</strong> {casoVinculadoData.numero_cnj}</p>
                        )}
                        {casoVinculadoData.parte_ativa && (
                          <p><strong>Autor:</strong> {casoVinculadoData.parte_ativa}</p>
                        )}
                        {casoVinculadoData.parte_passiva && (
                          <p><strong>Réu:</strong> {casoVinculadoData.parte_passiva}</p>
                        )}
                        {casoVinculadoData.tribunal && (
                          <p><strong>Tribunal:</strong> {casoVinculadoData.tribunal}</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase">Status</Label>
                    <div className="mt-1">
                      <Badge variant={selectedDeadline.completed ? "default" : isPast(parseLocalDate(selectedDeadline.date)) && !isToday(parseLocalDate(selectedDeadline.date)) ? "destructive" : "secondary"} className={selectedDeadline.completed ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}>
                        {selectedDeadline.completed ? "Concluído" : isPast(parseLocalDate(selectedDeadline.date)) && !isToday(parseLocalDate(selectedDeadline.date)) ? "Atrasado" : isToday(parseLocalDate(selectedDeadline.date)) ? "Hoje" : "Pendente"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-4 border-t">
                    {!selectedDeadline.completed ? (
                      <Button onClick={async () => {
                        setConfirmCompleteId(selectedDeadline.id);
                        // Check if linked etapa is already completed
                        if (selectedDeadline.protocolo_etapa_id) {
                          const { data: etapaData } = await supabase
                            .from('project_protocolo_etapas')
                            .select('status')
                            .eq('id', selectedDeadline.protocolo_etapa_id)
                            .single();
                          const jaConcluida = etapaData?.status === 'concluido';
                          setEtapaJaConcluida(jaConcluida);
                          setCumprirEtapa(!jaConcluida);
                        } else {
                          setEtapaJaConcluida(true);
                          setCumprirEtapa(false);
                        }
                      }} className="flex-1">
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como Concluído
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => setReopenConfirmId(selectedDeadline.id)} className="flex-1">
                        <X className="h-4 w-4 mr-2" /> Reabrir Prazo
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditDeadline(selectedDeadline)}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDeadlineConfirm(selectedDeadline.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TabsContent>
                <TabsContent value="comments" className="flex-1 overflow-auto mt-4">
                  <DeadlineComentarios deadlineId={selectedDeadline.id} currentUserId={user?.id || ''} />
                </TabsContent>
                {selectedDeadline.completed && (
                  <TabsContent value="conclusao" className="flex-1 overflow-auto mt-4 space-y-4">
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase">Comentário de Conclusão</Label>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{selectedDeadline.comentario_conclusao || 'Nenhum comentário de conclusão registrado.'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase">Concluído por</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedDeadline.concluido_por_profile ? (
                          <>
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={selectedDeadline.concluido_por_profile.avatar_url} />
                              <AvatarFallback className="text-xs">{selectedDeadline.concluido_por_profile.full_name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{selectedDeadline.concluido_por_profile.full_name}</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Informação não disponível</span>
                        )}
                      </div>
                    </div>
                    {selectedDeadline.concluido_em && (
                      <div>
                        <Label className="text-muted-foreground text-xs uppercase">Data de Conclusão</Label>
                        <p className="mt-1 text-sm">{format(new Date(selectedDeadline.concluido_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmCompleteId} onOpenChange={(open) => {
        if (!open) {
          setConfirmCompleteId(null);
          setComentarioConclusao('');
          setCriarSubtarefa(false);
          setSubtarefaDescricao('');
          setCumprirEtapa(false);
          setEtapaJaConcluida(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Concluir Prazo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Comentário de conclusão <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Descreva o que foi feito para concluir este prazo..."
                value={comentarioConclusao}
                onChange={(e) => setComentarioConclusao(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="criar-subtarefa-proto"
                checked={criarSubtarefa}
                onCheckedChange={(v) => setCriarSubtarefa(v === true)}
              />
              <Label htmlFor="criar-subtarefa-proto" className="cursor-pointer text-sm">Criar subtarefa</Label>
            </div>
            {criarSubtarefa && (
              <div>
                <Label>Descrição da subtarefa</Label>
                <Textarea
                  placeholder="Descreva a subtarefa..."
                  value={subtarefaDescricao}
                  onChange={(e) => setSubtarefaDescricao(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>
            )}
            {confirmCompleteId && !etapaJaConcluida && (() => {
              const prazo = prazosVinculados.find(p => p.id === confirmCompleteId);
              return prazo?.protocolo_etapa_id ? (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cumprir-etapa-proto"
                    checked={cumprirEtapa}
                    onCheckedChange={(v) => setCumprirEtapa(v === true)}
                  />
                  <Label htmlFor="cumprir-etapa-proto" className="cursor-pointer text-sm">
                    Cumprir etapa do protocolo
                  </Label>
                </div>
              ) : null;
            })()}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setConfirmCompleteId(null);
                setComentarioConclusao('');
                setCriarSubtarefa(false);
                setSubtarefaDescricao('');
              }}>
                Cancelar
              </Button>
              <Button
                disabled={!comentarioConclusao.trim()}
                onClick={() => {
                  if (confirmCompleteId) {
                    const prazo = prazosVinculados.find(p => p.id === confirmCompleteId);
                    if (prazo) toggleDeadlineCompletion(confirmCompleteId, prazo.completed);
                  }
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Concluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete deadline confirmation */}
      <AlertDialog open={!!deleteDeadlineConfirm} onOpenChange={(open) => { if (!open) setDeleteDeadlineConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir prazo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O prazo será excluído permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteDeadlineConfirm && handleDeleteDeadline(deleteDeadlineConfirm)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen deadline with reason */}
      <AlertDialog open={!!reopenConfirmId} onOpenChange={(open) => { if (!open) { setReopenConfirmId(null); setReopenMotivo(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir prazo?</AlertDialogTitle>
            <AlertDialogDescription>Informe o motivo para reabrir este prazo. O motivo será registrado no histórico.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Motivo para reabertura..."
              value={reopenMotivo}
              onChange={(e) => setReopenMotivo(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!reopenMotivo.trim()}
              onClick={() => {
                if (reopenConfirmId) toggleDeadlineCompletion(reopenConfirmId, true);
              }}
            >
              Reabrir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditarPrazoDialog
        deadline={editingDeadlineObj}
        open={isEditPrazoOpen}
        onOpenChange={setIsEditPrazoOpen}
        onSuccess={() => {
          fetchPrazosVinculados();
          setIsDetailDialogOpen(false);
        }}
        tenantId={tenantId || ''}
      />
    </>
  );
}
