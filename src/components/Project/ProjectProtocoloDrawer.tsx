import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
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
  Save
} from 'lucide-react';
import { isPast, isToday } from 'date-fns';
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

interface ProjectProtocoloDrawerProps {
  protocolo: ProjectProtocolo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddEtapa: (protocoloId: string, data: CreateEtapaData) => Promise<void>;
  onUpdateEtapa: (id: string, data: any) => Promise<void>;
  onDeleteEtapa: (id: string) => Promise<void>;
  projectId?: string;
  onRefetch?: () => Promise<void>;
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

export function ProjectProtocoloDrawer({
  protocolo,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  onAddEtapa,
  onUpdateEtapa,
  onDeleteEtapa,
  projectId,
  onRefetch
}: ProjectProtocoloDrawerProps) {
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [newEtapaNome, setNewEtapaNome] = useState('');
  const [addingEtapa, setAddingEtapa] = useState(false);
  const [selectedEtapa, setSelectedEtapa] = useState<ProjectProtocoloEtapa | null>(null);
  const [togglingEtapaId, setTogglingEtapaId] = useState<string | null>(null);
  
  // Estados para modo de edição
  const [isEditing, setIsEditing] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editDataPrevisao, setEditDataPrevisao] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');
  
  // Estados para modal de conclusão
  const [etapaToComplete, setEtapaToComplete] = useState<ProjectProtocoloEtapa | null>(null);
  const [showConcluirModal, setShowConcluirModal] = useState(false);
  
  // Estados para relatório
  const [showRelatorioModal, setShowRelatorioModal] = useState(false);
  const [showAdvogadoModal, setShowAdvogadoModal] = useState(false);
  
  // Estados para prazos vinculados
  const [prazosVinculados, setPrazosVinculados] = useState<any[]>([]);
  const [loadingPrazos, setLoadingPrazos] = useState(false);
  
  // Estados para dialog de detalhes do prazo
  const [selectedDeadline, setSelectedDeadline] = useState<any | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);
  
  // Estados para tarefas do processo vinculado
  const [tarefasProcesso, setTarefasProcesso] = useState<TarefaOAB[]>([]);
  
  // Hooks de autenticação e toast
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Hook para perfil do advogado
  const { advogado, refetch: refetchAdvogado } = useProjectAdvogado(projectId || '');
  
  // Hook para vínculo com processo
  const { processoVinculado, refetch: refetchVinculo } = useProtocoloVinculo(
    protocolo?.id || null, 
    protocolo?.processoOabId
  );

  // Buscar prazos vinculados às etapas do protocolo
  const fetchPrazosVinculados = async () => {
    if (!protocolo?.etapas?.length || !open) return;
    
    setLoadingPrazos(true);
    const etapaIds = protocolo.etapas.map(e => e.id);
    
    const { data, error } = await supabase
      .from('deadlines')
      .select(`
        id, 
        title, 
        description,
        date, 
        completed, 
        protocolo_etapa_id,
        project_id,
        projects (name, client),
        advogado:profiles!deadlines_advogado_responsavel_id_fkey (
          user_id,
          full_name,
          avatar_url
        ),
        deadline_tags (
          tagged_user_id,
          tagged_user:profiles!deadline_tags_tagged_user_id_fkey (
            user_id,
            full_name,
            avatar_url
          )
        )
      `)
      .in('protocolo_etapa_id', etapaIds)
      .order('created_at', { ascending: false });
    
    if (!error) setPrazosVinculados(data || []);
    setLoadingPrazos(false);
  };

  useEffect(() => {
    fetchPrazosVinculados();
  }, [protocolo?.etapas, open]);

  // Buscar tarefas do processo vinculado
  const fetchTarefasProcesso = async () => {
    if (!protocolo?.processoOabId || !open) {
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
  }, [protocolo?.processoOabId, open]);

  // Funções para detalhes do prazo
  const openDeadlineDetails = (prazo: any) => {
    setSelectedDeadline(prazo);
    setIsDetailDialogOpen(true);
  };

  const toggleDeadlineCompletion = async (deadlineId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('deadlines')
      .update({ completed: !currentStatus })
      .eq('id', deadlineId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do prazo.",
        variant: "destructive",
      });
      return;
    }

    // Atualizar lista local
    setPrazosVinculados(prev => prev.map(p => 
      p.id === deadlineId ? { ...p, completed: !currentStatus } : p
    ));
    
    // Atualizar selectedDeadline se for o mesmo
    if (selectedDeadline?.id === deadlineId) {
      setSelectedDeadline((prev: any) => prev ? { ...prev, completed: !currentStatus } : null);
    }
    
    setConfirmCompleteId(null);
    
    toast({
      title: "Status atualizado",
      description: `Prazo marcado como ${!currentStatus ? 'concluído' : 'pendente'}.`,
    });
  };

  // Sincroniza selectedEtapa quando as etapas do protocolo mudam
  useEffect(() => {
    if (selectedEtapa && protocolo?.etapas) {
      const updatedEtapa = protocolo.etapas.find(e => e.id === selectedEtapa.id);
      if (updatedEtapa) {
        // Sempre sincroniza com a versão mais recente
        if (updatedEtapa !== selectedEtapa) {
          setSelectedEtapa(updatedEtapa);
        }
      } else {
        // Etapa foi deletada - fecha a modal
        setSelectedEtapa(null);
      }
    }
  }, [protocolo?.etapas, protocolo?.id, selectedEtapa?.id]);

  if (!protocolo) return null;

  const etapasConcluidas = protocolo.etapas?.filter(e => e.status === 'concluido').length || 0;
  const totalEtapas = protocolo.etapas?.length || 0;
  const progressPercent = totalEtapas > 0 ? Math.round((etapasConcluidas / totalEtapas) * 100) : 0;

  const handleStatusChange = async (newStatus: ProjectProtocolo['status']) => {
    setSaving(true);
    try {
      await onUpdate(protocolo.id, { 
        status: newStatus,
        dataConclusao: newStatus === 'concluido' ? new Date() : undefined
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await onDelete(protocolo.id);
      onOpenChange(false);
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
    } finally {
      setAddingEtapa(false);
    }
  };

  const handleToggleEtapa = async (etapa: ProjectProtocoloEtapa) => {
    if (etapa.status !== 'concluido') {
      // Vai concluir -> Abre modal para comentário obrigatório
      setEtapaToComplete(etapa);
      setShowConcluirModal(true);
    } else {
      // Já está concluído -> Reabre (sem modal)
      setTogglingEtapaId(etapa.id);
      try {
        await onUpdateEtapa(etapa.id, { 
          status: 'pendente',
          dataConclusao: undefined,
          comentarioConclusao: undefined
        });
      } finally {
        setTogglingEtapaId(null);
      }
    }
  };

  const handleConfirmConclusao = async (comentario: string) => {
    if (!etapaToComplete) return;
    
    setTogglingEtapaId(etapaToComplete.id);
    try {
      await onUpdateEtapa(etapaToComplete.id, {
        status: 'concluido',
        dataConclusao: new Date(),
        comentarioConclusao: comentario
      });
    } finally {
      setTogglingEtapaId(null);
      setEtapaToComplete(null);
    }
  };

  const handleDeleteEtapa = async (etapaId: string) => {
    await onDeleteEtapa(etapaId);
  };

  // Funções de edição do protocolo
  const startEditing = () => {
    setEditNome(protocolo.nome);
    setEditDescricao(protocolo.descricao || '');
    setEditDataPrevisao(protocolo.dataPrevisao ? format(protocolo.dataPrevisao, 'yyyy-MM-dd') : '');
    setEditObservacoes(protocolo.observacoes || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditNome('');
    setEditDescricao('');
    setEditDataPrevisao('');
    setEditObservacoes('');
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DrawerTitle className="text-xl">{protocolo.nome}</DrawerTitle>
                <Badge className={STATUS_COLORS[protocolo.status]}>
                  {STATUS_LABELS[protocolo.status]}
                </Badge>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
            {totalEtapas > 0 && (
              <div className="flex items-center gap-3 mt-3">
                <Progress value={progressPercent} className="flex-1 h-2" />
                <span className="text-sm text-muted-foreground">{progressPercent}%</span>
              </div>
            )}
          </DrawerHeader>

          <Tabs defaultValue="resumo" className="flex-1">
            <TabsList className="w-full justify-start rounded-none border-b px-4">
              <TabsTrigger value="resumo" className="gap-2">
                <FileText className="w-4 h-4" />
                Resumo
              </TabsTrigger>
              <TabsTrigger value="etapas" className="gap-2">
                <ListChecks className="w-4 h-4" />
                Etapas
                {totalEtapas > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {etapasConcluidas}/{totalEtapas}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="prazos" className="gap-2">
                <Clock className="w-4 h-4" />
                Prazos
                {prazosVinculados.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {prazosVinculados.filter(p => !p.completed).length}/{prazosVinculados.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="vinculo" className="gap-2">
                <Link2 className="w-4 h-4" />
                Vínculo
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <History className="w-4 h-4" />
                Histórico
              </TabsTrigger>
              <TabsTrigger value="relatorio" className="gap-2">
                <Printer className="w-4 h-4" />
                Relatório
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[50vh]">
              <TabsContent value="resumo" className="p-4 m-0 space-y-6">
                {isEditing ? (
                  // Modo de Edição
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-nome">Nome do Protocolo *</Label>
                      <Input
                        id="edit-nome"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        placeholder="Nome do protocolo"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-descricao">Descrição</Label>
                      <Textarea
                        id="edit-descricao"
                        value={editDescricao}
                        onChange={(e) => setEditDescricao(e.target.value)}
                        placeholder="Descrição do protocolo"
                        disabled={saving}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-previsao">Data de Previsão</Label>
                      <Input
                        id="edit-previsao"
                        type="date"
                        value={editDataPrevisao}
                        onChange={(e) => setEditDataPrevisao(e.target.value)}
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-observacoes">Observações</Label>
                      <Textarea
                        id="edit-observacoes"
                        value={editObservacoes}
                        onChange={(e) => setEditObservacoes(e.target.value)}
                        placeholder="Observações adicionais"
                        disabled={saving}
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={cancelEditing}
                        disabled={saving}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={saveEditing}
                        disabled={saving || !editNome.trim()}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Salvar Alterações
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Modo de Visualização
                  <>
                    {/* Botão Editar */}
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={startEditing}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </div>

                    {/* Descrição */}
                    {protocolo.descricao && (
                      <div>
                        <Label className="text-muted-foreground text-xs uppercase">Descrição</Label>
                        <p className="mt-1">{protocolo.descricao}</p>
                      </div>
                    )}

                    {/* Informações */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Data de Início
                        </Label>
                        <p className="mt-1 font-medium">
                          {format(protocolo.dataInicio, "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      
                      {protocolo.dataPrevisao && (
                        <div>
                          <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Previsão
                          </Label>
                          <p className="mt-1 font-medium">
                            {format(protocolo.dataPrevisao, "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      )}

                      {protocolo.dataConclusao && (
                        <div>
                          <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Concluído em
                          </Label>
                          <p className="mt-1 font-medium">
                            {format(protocolo.dataConclusao, "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      )}

                      {protocolo.responsavelNome && (
                        <div>
                          <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Responsável
                          </Label>
                          <p className="mt-1 font-medium">{protocolo.responsavelNome}</p>
                        </div>
                      )}
                    </div>

                    {/* Observações */}
                    {protocolo.observacoes && (
                      <div>
                        <Label className="text-muted-foreground text-xs uppercase">Observações</Label>
                        <p className="mt-1 text-sm">{protocolo.observacoes}</p>
                      </div>
                    )}

                    {/* Ações */}
                    <div className="pt-4 border-t space-y-3">
                      <div>
                        <Label className="text-muted-foreground text-xs uppercase mb-2 block">Alterar Status</Label>
                        <Select 
                          value={protocolo.status} 
                          onValueChange={(value) => handleStatusChange(value as ProjectProtocolo['status'])}
                          disabled={saving}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="em_andamento">Em Andamento</SelectItem>
                            <SelectItem value="concluido">Concluído</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={() => setDeleteConfirm(true)}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Protocolo
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="etapas" className="p-4 m-0 space-y-4">
                {/* Add Etapa */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Nova etapa..."
                    value={newEtapaNome}
                    onChange={(e) => setNewEtapaNome(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddEtapa()}
                    disabled={addingEtapa}
                  />
                  <Button 
                    onClick={handleAddEtapa} 
                    disabled={addingEtapa || !newEtapaNome.trim()}
                  >
                    {addingEtapa ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Etapas List */}
                {(!protocolo.etapas || protocolo.etapas.length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma etapa cadastrada</p>
                    <p className="text-sm">Adicione etapas para acompanhar o progresso</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {protocolo.etapas.map((etapa) => (
                      <div 
                        key={etapa.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-accent/50 relative ${
                          etapa.status === 'concluido' ? 'bg-green-500/5 border-green-500/20' : 'bg-card'
                        }`}
                      >
                        {togglingEtapaId === etapa.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Checkbox
                            checked={etapa.status === 'concluido'}
                            onCheckedChange={() => handleToggleEtapa(etapa)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div 
                          className="flex-1"
                          onClick={() => setSelectedEtapa(etapa)}
                        >
                          <p className={`font-medium ${etapa.status === 'concluido' ? 'line-through text-muted-foreground' : ''}`}>
                            {etapa.nome}
                          </p>
                          {etapa.descricao && (
                            <p className="text-sm text-muted-foreground">{etapa.descricao}</p>
                          )}
                          {etapa.dataConclusao && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Concluído em {format(etapa.dataConclusao, "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
                          {etapa.comentarioConclusao && (
                            <p className="text-xs text-green-600 mt-1 italic">
                              "{etapa.comentarioConclusao}"
                            </p>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEtapa(etapa.id);
                          }}
                        >
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
                    // Recarrega a lista de protocolos para atualizar o processoOabId
                    if (onRefetch) await onRefetch();
                    // Também recarrega as tarefas do processo vinculado
                    fetchTarefasProcesso();
                  }}
                />
              </TabsContent>

              <TabsContent value="prazos" className="p-4 m-0 space-y-4">
                {loadingPrazos ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : prazosVinculados.length === 0 && tarefasProcesso.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum prazo vinculado às etapas</p>
                    <p className="text-xs mt-1">Crie prazos nas etapas do protocolo</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Prazos das Etapas */}
                    {prazosVinculados.length > 0 && (
                      <div className="space-y-4">
                        {/* Prazos Pendentes */}
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
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(prazo.date), "dd/MM/yyyy", { locale: ptBR })}
                                    </p>
                                  </div>
                                  <Badge variant={isPast(new Date(prazo.date)) && !isToday(new Date(prazo.date)) ? "destructive" : "outline"}>
                                    {isPast(new Date(prazo.date)) && !isToday(new Date(prazo.date)) ? "Atrasado" : isToday(new Date(prazo.date)) ? "Hoje" : "Pendente"}
                                  </Badge>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openDeadlineDetails(prazo)}
                                  >
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Prazos Concluídos */}
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
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(prazo.date), "dd/MM/yyyy", { locale: ptBR })}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                    Concluído
                                  </Badge>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openDeadlineDetails(prazo)}
                                  >
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tarefas do Processo Vinculado */}
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
                                  {tarefa.descricao && (
                                    <p className="text-xs mt-1 text-muted-foreground">{tarefa.descricao}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                  Processo
                                </Badge>
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
                {/* Configurar Perfil do Advogado */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    {advogado?.logoUrl ? (
                      <img src={advogado.logoUrl} alt="Logo" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">
                        {advogado?.nomeAdvogado || 'Perfil não configurado'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {advogado?.emailAdvogado || 'Configure o perfil do advogado para o relatório'}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setShowAdvogadoModal(true)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Configurar
                  </Button>
                </div>

                {/* Preview resumido */}
                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <h3 className="font-semibold">Preview do Relatório</h3>
                  <p className="text-sm text-muted-foreground">
                    O relatório incluirá:
                  </p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Dados do advogado (logo, nome, contato)</li>
                    {processoVinculado && <li>• Dados do processo vinculado</li>}
                    <li>• Histórico do protocolo ({etapasConcluidas} etapa{etapasConcluidas !== 1 ? 's' : ''} concluída{etapasConcluidas !== 1 ? 's' : ''})</li>
                    <li>• Comentários de conclusão de cada etapa</li>
                  </ul>
                  {!processoVinculado && (
                    <p className="text-xs text-amber-600">
                      Dica: Vincule um processo na aba "Vínculo" para incluir dados do processo no relatório.
                    </p>
                  )}
                </div>

                {/* Botão Gerar Relatório */}
                <Button 
                  className="w-full gap-2" 
                  onClick={() => setShowRelatorioModal(true)}
                  disabled={etapasConcluidas === 0}
                >
                  <Printer className="w-4 h-4" />
                  Visualizar e Imprimir Relatório
                </Button>
                
                {etapasConcluidas === 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    Conclua pelo menos uma etapa para gerar o relatório
                  </p>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir protocolo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O protocolo "{protocolo.nome}" e todas as suas etapas serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EtapaModal
        etapa={selectedEtapa}
        open={!!selectedEtapa}
        onOpenChange={(open) => !open && setSelectedEtapa(null)}
        onUpdate={onUpdateEtapa}
        onDelete={onDeleteEtapa}
        protocoloId={protocolo.id}
        projectId={projectId}
      />

      {/* Modal de Conclusão Obrigatória */}
      <ConcluirEtapaModal
        open={showConcluirModal}
        onOpenChange={setShowConcluirModal}
        etapaNome={etapaToComplete?.nome || ''}
        onConfirm={handleConfirmConclusao}
      />

      {/* Modal de Relatório */}
      {projectId && (
        <RelatorioProtocolo
          open={showRelatorioModal}
          onOpenChange={setShowRelatorioModal}
          protocolo={protocolo}
          advogado={advogado}
          processoVinculado={processoVinculado}
          tarefasProcesso={tarefasProcesso}
        />
      )}

      {/* Modal de Edição do Advogado */}
      {projectId && (
        <EditarAdvogadoProjectModal
          projectId={projectId}
          open={showAdvogadoModal}
          onOpenChange={(open) => {
            setShowAdvogadoModal(open);
            if (!open) refetchAdvogado();
          }}
        />
      )}

      {/* Dialog de Detalhes do Prazo */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          {selectedDeadline && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {selectedDeadline.title}
                </DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info">
                    <Info className="h-4 w-4 mr-2" />
                    Informações
                  </TabsTrigger>
                  <TabsTrigger value="comments">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Comentários
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="flex-1 overflow-auto space-y-4 mt-4">
                  {/* Descrição */}
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase">Descrição</Label>
                    <p className="mt-1 text-sm">{selectedDeadline.description || 'Sem descrição'}</p>
                  </div>
                  
                  {/* Data e Projeto */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase">Data</Label>
                      <p className="mt-1 font-medium">
                        {format(new Date(selectedDeadline.date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase">Projeto</Label>
                      <p className="mt-1">{selectedDeadline.projects?.name || 'Não vinculado'}</p>
                    </div>
                  </div>
                  
                  {/* Cliente */}
                  {selectedDeadline.projects?.client && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase">Cliente</Label>
                      <p className="mt-1">{selectedDeadline.projects.client}</p>
                    </div>
                  )}
                  
                  {/* Advogado Responsável */}
                  {selectedDeadline.advogado && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase">Responsável</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedDeadline.advogado.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {selectedDeadline.advogado.full_name?.charAt(0).toUpperCase() || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{selectedDeadline.advogado.full_name}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Usuários Marcados */}
                  {selectedDeadline.deadline_tags?.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase">Usuários Marcados</Label>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {selectedDeadline.deadline_tags.map((tag: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={tag.tagged_user?.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {tag.tagged_user?.full_name?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{tag.tagged_user?.full_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Status */}
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase">Status</Label>
                    <div className="mt-1">
                      <Badge 
                        variant={selectedDeadline.completed ? "default" : isPast(new Date(selectedDeadline.date)) && !isToday(new Date(selectedDeadline.date)) ? "destructive" : "secondary"}
                        className={selectedDeadline.completed ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}
                      >
                        {selectedDeadline.completed 
                          ? "Concluído" 
                          : isPast(new Date(selectedDeadline.date)) && !isToday(new Date(selectedDeadline.date))
                            ? "Atrasado" 
                            : isToday(new Date(selectedDeadline.date))
                              ? "Hoje"
                              : "Pendente"
                        }
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Ações */}
                  <div className="flex gap-2 pt-4 border-t">
                    {!selectedDeadline.completed ? (
                      <Button 
                        onClick={() => setConfirmCompleteId(selectedDeadline.id)}
                        className="flex-1"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marcar como Concluído
                      </Button>
                    ) : (
                      <Button 
                        variant="outline"
                        onClick={() => toggleDeadlineCompletion(selectedDeadline.id, selectedDeadline.completed)}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reabrir Prazo
                      </Button>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="comments" className="flex-1 overflow-auto mt-4">
                  <DeadlineComentarios 
                    deadlineId={selectedDeadline.id} 
                    currentUserId={user?.id || ''} 
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* AlertDialog de confirmação para concluir prazo */}
      <AlertDialog 
        open={!!confirmCompleteId} 
        onOpenChange={(open) => !open && setConfirmCompleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Conclusão do Prazo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar este prazo como concluído?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmCompleteId) {
                const prazo = prazosVinculados.find(p => p.id === confirmCompleteId);
                if (prazo) toggleDeadlineCompletion(confirmCompleteId, prazo.completed);
              }
            }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
