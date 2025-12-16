import { useState } from 'react';
import { Plus, Calendar, Trash2, FileText, Loader2, Pencil, CalendarPlus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useTaskTarefas } from '@/hooks/useTaskTarefas';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from '@/hooks/useTenantId';
import { supabase } from '@/integrations/supabase/client';
import AdvogadoSelector from '@/components/Controladoria/AdvogadoSelector';
import UserTagSelector from '@/components/Agenda/UserTagSelector';
import { notifyDeadlineAssigned, notifyDeadlineTagged } from '@/utils/notificationHelpers';
import { TaskTarefa } from '@/types/taskTarefa';

const FASES_SUGERIDAS = [
  'Analise Inicial',
  'Pesquisa Jurisprudencial',
  'Elaboracao de Peca',
  'Protocolo',
  'Audiencia',
  'Diligencia',
  'Recurso',
  'Acordo',
  'Execucao',
  'Encerramento',
];

interface TaskTarefasTabProps {
  taskId: string;
  projectId?: string;
  onGerarRelatorio?: () => void;
  hasVinculo: boolean;
}

export const TaskTarefasTab = ({ taskId, projectId, onGerarRelatorio, hasVinculo }: TaskTarefasTabProps) => {
  const { tarefas, loading, adicionarTarefa, atualizarTarefa, removerTarefa } = useTaskTarefas(taskId);
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenantId } = useTenantId();

  // Estados para criar tarefa
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tarefaParaDeletar, setTarefaParaDeletar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Estados para editar tarefa
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<TaskTarefa | null>(null);
  const [editFormData, setEditFormData] = useState({
    titulo: '',
    descricao: '',
    fase: '',
    dataExecucao: '',
    observacoes: '',
  });

  // Estados para criar prazo
  const [prazoDialogOpen, setPrazoDialogOpen] = useState(false);
  const [prazoSaving, setPrazoSaving] = useState(false);
  const [prazoFormData, setPrazoFormData] = useState({
    titulo: '',
    descricao: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    responsavelId: null as string | null,
    taggedUsers: [] as string[],
  });

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    fase: '',
    dataExecucao: format(new Date(), 'yyyy-MM-dd'),
    observacoes: '',
  });

  // State para criar prazo automaticamente
  const [criarPrazoAutomatico, setCriarPrazoAutomatico] = useState(false);
  const [novaTarefaResponsavelId, setNovaTarefaResponsavelId] = useState<string | null>(null);
  const [novaTarefaTaggedUsers, setNovaTarefaTaggedUsers] = useState<string[]>([]);

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      fase: '',
      dataExecucao: format(new Date(), 'yyyy-MM-dd'),
      observacoes: '',
    });
    setCriarPrazoAutomatico(false);
    setNovaTarefaResponsavelId(null);
    setNovaTarefaTaggedUsers([]);
  };

  const handleSubmit = async () => {
    if (!formData.titulo.trim()) {
      toast({ title: 'Titulo obrigatorio', variant: 'destructive' });
      return;
    }

    // Validar campos do prazo se checkbox marcado
    if (criarPrazoAutomatico && !projectId) {
      toast({ title: 'Projeto nao identificado', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const result = await adicionarTarefa({
      titulo: formData.titulo.trim(),
      descricao: formData.descricao.trim() || undefined,
      fase: formData.fase || undefined,
      data_execucao: formData.dataExecucao,
      observacoes: formData.observacoes.trim() || undefined,
    });

    if (result) {
      // Se marcou para criar prazo automaticamente
      if (criarPrazoAutomatico && projectId && user?.id && tenantId) {
        try {
          // 1. Criar deadline
          const { data: deadline, error } = await supabase
            .from('deadlines')
            .insert({
              title: formData.titulo.trim(),
              description: formData.descricao.trim() || formData.observacoes.trim() || null,
              date: formData.dataExecucao,
              project_id: projectId,
              user_id: user.id,
              advogado_responsavel_id: novaTarefaResponsavelId,
              tenant_id: tenantId,
              completed: false,
            })
            .select('id')
            .single();

          if (error) throw error;

          // 2. Inserir tags se houver
          if (novaTarefaTaggedUsers.length > 0 && deadline) {
            const tags = novaTarefaTaggedUsers.map(tagUserId => ({
              deadline_id: deadline.id,
              tagged_user_id: tagUserId,
              tenant_id: tenantId,
            }));
            await supabase.from('deadline_tags').insert(tags);
          }

          // 3. Notificacoes
          if (deadline) {
            if (novaTarefaResponsavelId && novaTarefaResponsavelId !== user.id) {
              await notifyDeadlineAssigned(
                deadline.id,
                formData.titulo.trim(),
                novaTarefaResponsavelId,
                user.id,
                tenantId,
                projectId
              );
            }

            if (novaTarefaTaggedUsers.length > 0) {
              await notifyDeadlineTagged(
                deadline.id,
                formData.titulo.trim(),
                novaTarefaTaggedUsers,
                user.id,
                tenantId,
                projectId
              );
            }
          }

          toast({ title: 'Tarefa e prazo criados' });
        } catch (err) {
          console.error('Erro ao criar prazo automatico:', err);
          toast({ 
            title: 'Tarefa criada',
            description: 'A tarefa foi adicionada, mas houve erro ao criar o prazo.',
            variant: 'destructive' 
          });
        }
      } else {
        toast({ title: 'Tarefa adicionada' });
      }

      resetForm();
      setDialogOpen(false);
    } else {
      toast({ title: 'Erro ao adicionar tarefa', variant: 'destructive' });
    }

    setSaving(false);
  };

  // Editar tarefa
  const handleEditClick = (tarefa: TaskTarefa) => {
    setEditingTarefa(tarefa);
    setEditFormData({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao || '',
      fase: tarefa.fase || '',
      dataExecucao: tarefa.data_execucao,
      observacoes: tarefa.observacoes || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingTarefa || !editFormData.titulo.trim()) {
      toast({ title: 'Titulo obrigatorio', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const result = await atualizarTarefa(editingTarefa.id, {
      titulo: editFormData.titulo.trim(),
      descricao: editFormData.descricao.trim() || undefined,
      fase: editFormData.fase || undefined,
      data_execucao: editFormData.dataExecucao,
      observacoes: editFormData.observacoes.trim() || undefined,
    });

    setSaving(false);

    if (result) {
      toast({ title: 'Tarefa atualizada' });
      setEditDialogOpen(false);
      setEditingTarefa(null);
    } else {
      toast({ title: 'Erro ao atualizar tarefa', variant: 'destructive' });
    }
  };

  // Criar prazo
  const handleCriarPrazoClick = (tarefa: TaskTarefa) => {
    setPrazoFormData({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao || '',
      data: tarefa.data_execucao || format(new Date(), 'yyyy-MM-dd'),
      responsavelId: null,
      taggedUsers: [],
    });
    setPrazoDialogOpen(true);
  };

  const handleCriarPrazo = async () => {
    if (!prazoFormData.titulo.trim() || !user?.id || !projectId) {
      toast({ title: 'Dados incompletos', variant: 'destructive' });
      return;
    }

    setPrazoSaving(true);

    try {
      // Criar deadline
      const { data: deadline, error } = await supabase
        .from('deadlines')
        .insert({
          title: prazoFormData.titulo.trim(),
          description: prazoFormData.descricao.trim() || null,
          date: prazoFormData.data,
          project_id: projectId,
          user_id: user.id,
          advogado_responsavel_id: prazoFormData.responsavelId,
          tenant_id: tenantId,
          completed: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Inserir tags de usuarios
      if (prazoFormData.taggedUsers.length > 0 && deadline) {
        const tags = prazoFormData.taggedUsers.map(userId => ({
          deadline_id: deadline.id,
          tagged_user_id: userId,
          tenant_id: tenantId,
        }));

        await supabase.from('deadline_tags').insert(tags);

        // Notificar usuarios marcados
        if (tenantId) {
          await notifyDeadlineTagged(
            deadline.id,
            prazoFormData.titulo.trim(),
            prazoFormData.taggedUsers,
            user.id,
            tenantId,
            projectId
          );
        }
      }

      // Notificar responsavel
      if (prazoFormData.responsavelId && prazoFormData.responsavelId !== user.id && tenantId) {
        await notifyDeadlineAssigned(
          deadline.id,
          prazoFormData.titulo.trim(),
          prazoFormData.responsavelId,
          user.id,
          tenantId,
          projectId
        );
      }

      toast({ title: 'Prazo criado na Agenda' });
      setPrazoDialogOpen(false);
    } catch (error) {
      console.error('Erro ao criar prazo:', error);
      toast({ title: 'Erro ao criar prazo', variant: 'destructive' });
    } finally {
      setPrazoSaving(false);
    }
  };

  const handleDeleteClick = (tarefaId: string) => {
    setTarefaParaDeletar(tarefaId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!tarefaParaDeletar) return;

    const success = await removerTarefa(tarefaParaDeletar);
    if (success) {
      toast({ title: 'Tarefa removida' });
    } else {
      toast({ title: 'Erro ao remover tarefa', variant: 'destructive' });
    }

    setDeleteDialogOpen(false);
    setTarefaParaDeletar(null);
  };

  const formatData = (data: string) => {
    try {
      return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return data;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Atividades ({tarefas.length})
        </h3>
        <div className="flex gap-2">
          {hasVinculo && onGerarRelatorio && (
            <Button variant="outline" size="sm" onClick={onGerarRelatorio}>
              <FileText className="h-4 w-4 mr-1" />
              Gerar Relatorio
            </Button>
          )}
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {tarefas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nenhuma atividade registrada</p>
          <p className="text-xs">Adicione tarefas para construir a timeline deste card</p>
        </div>
      ) : (
        <ScrollArea className="h-[280px]">
          <div className="relative pl-4 border-l-2 border-muted space-y-3">
            {tarefas.map((tarefa) => (
              <Card key={tarefa.id} className="relative group">
                <div className="absolute -left-[21px] top-4 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">
                          {formatData(tarefa.data_execucao)}
                        </span>
                        {tarefa.fase && (
                          <Badge variant="secondary" className="text-xs">
                            {tarefa.fase}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm">{tarefa.titulo}</p>
                      {tarefa.descricao && (
                        <p className="text-xs text-muted-foreground mt-1">{tarefa.descricao}</p>
                      )}
                      {tarefa.observacoes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Obs: {tarefa.observacoes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {projectId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-primary"
                          onClick={() => handleCriarPrazoClick(tarefa)}
                          title="Criar Prazo na Agenda"
                        >
                          <CalendarPlus className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleEditClick(tarefa)}
                        title="Editar Tarefa"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => handleDeleteClick(tarefa.id)}
                        title="Excluir Tarefa"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Dialog Nova Tarefa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Titulo *</label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Titulo da atividade"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Data *</label>
                <Input
                  type="date"
                  value={formData.dataExecucao}
                  onChange={(e) => setFormData({ ...formData, dataExecucao: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fase</label>
                <Select
                  value={formData.fase}
                  onValueChange={(value) => setFormData({ ...formData, fase: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {FASES_SUGERIDAS.map((fase) => (
                      <SelectItem key={fase} value={fase}>
                        {fase}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Descricao</label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descricao da atividade"
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Observacoes</label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observacoes adicionais"
                rows={2}
              />
            </div>

            {/* Separador - Criar Prazo */}
            {projectId && (
              <>
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="criar-prazo-admin" 
                      checked={criarPrazoAutomatico}
                      onCheckedChange={(checked) => {
                        setCriarPrazoAutomatico(checked === true);
                        if (checked && user?.id) {
                          setNovaTarefaResponsavelId(user.id);
                        }
                      }}
                    />
                    <label 
                      htmlFor="criar-prazo-admin" 
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Criar prazo na agenda automaticamente
                    </label>
                  </div>
                </div>

                {/* Campos do Prazo - Colapsavel */}
                <Collapsible open={criarPrazoAutomatico}>
                  <CollapsibleContent className="space-y-4 pt-2">
                    {/* Responsavel */}
                    <AdvogadoSelector
                      value={novaTarefaResponsavelId}
                      onChange={setNovaTarefaResponsavelId}
                    />

                    {/* Colaboradores */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Marcar Colaboradores</label>
                      <p className="text-xs text-muted-foreground">
                        Colaboradores marcados serao notificados sobre este prazo
                      </p>
                      <UserTagSelector
                        selectedUsers={novaTarefaTaggedUsers}
                        onChange={setNovaTarefaTaggedUsers}
                        excludeCurrentUser={false}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {criarPrazoAutomatico ? 'Adicionar e Criar Prazo' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Tarefa */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Titulo *</label>
              <Input
                value={editFormData.titulo}
                onChange={(e) => setEditFormData({ ...editFormData, titulo: e.target.value })}
                placeholder="Titulo da atividade"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Data *</label>
                <Input
                  type="date"
                  value={editFormData.dataExecucao}
                  onChange={(e) => setEditFormData({ ...editFormData, dataExecucao: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fase</label>
                <Select
                  value={editFormData.fase}
                  onValueChange={(value) => setEditFormData({ ...editFormData, fase: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {FASES_SUGERIDAS.map((fase) => (
                      <SelectItem key={fase} value={fase}>
                        {fase}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Descricao</label>
              <Textarea
                value={editFormData.descricao}
                onChange={(e) => setEditFormData({ ...editFormData, descricao: e.target.value })}
                placeholder="Descricao da atividade"
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Observacoes</label>
              <Textarea
                value={editFormData.observacoes}
                onChange={(e) => setEditFormData({ ...editFormData, observacoes: e.target.value })}
                placeholder="Observacoes adicionais"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Criar Prazo na Agenda */}
      <Dialog open={prazoDialogOpen} onOpenChange={setPrazoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Prazo na Agenda</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Titulo *</label>
              <Input
                value={prazoFormData.titulo}
                onChange={(e) => setPrazoFormData({ ...prazoFormData, titulo: e.target.value })}
                placeholder="Titulo do prazo"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Data *</label>
              <Input
                type="date"
                value={prazoFormData.data}
                onChange={(e) => setPrazoFormData({ ...prazoFormData, data: e.target.value })}
              />
            </div>

            <AdvogadoSelector
              value={prazoFormData.responsavelId}
              onChange={(value) => setPrazoFormData({ ...prazoFormData, responsavelId: value })}
            />

            <UserTagSelector
              selectedUsers={prazoFormData.taggedUsers}
              onChange={(users) => setPrazoFormData({ ...prazoFormData, taggedUsers: users })}
            />

            <div>
              <label className="text-sm font-medium">Descricao</label>
              <Textarea
                value={prazoFormData.descricao}
                onChange={(e) => setPrazoFormData({ ...prazoFormData, descricao: e.target.value })}
                placeholder="Descricao do prazo"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPrazoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarPrazo} disabled={prazoSaving}>
              {prazoSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Criar Prazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Deletar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
