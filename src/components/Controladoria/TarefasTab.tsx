import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Calendar, ClipboardList, Trash2, Loader2, Printer, Pencil, CalendarPlus, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { useTarefasOAB, TarefaOAB } from '@/hooks/useTarefasOAB';
import { ProcessoOAB, OABCadastrada } from '@/hooks/useOABs';
import { RelatorioUnificado } from '@/components/Project/RelatorioUnificado';
import { TaskTarefa } from '@/types/taskTarefa';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantId } from '@/hooks/useTenantId';
import { cn } from '@/lib/utils';

interface TarefasTabProps {
  processo: ProcessoOAB;
  oab: OABCadastrada | null;
}

interface Projeto {
  id: string;
  name: string;
  client: string | null;
}

const FASES_SUGERIDAS = [
  'Peticao Inicial',
  'Contestacao',
  'Replica',
  'Audiencia',
  'Pericia',
  'Alegacoes Finais',
  'Sentenca',
  'Recurso',
  'Cumprimento de Sentenca',
  'Acordo',
  'Diligencia',
  'Outro',
];

// Helper para obter data local correta
const getLocalDateString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

export const TarefasTab = ({ processo, oab }: TarefasTabProps) => {
  const { tarefas, loading, adicionarTarefa, atualizarTarefa, removerTarefa } = useTarefasOAB(processo.id);
  const { toast } = useToast();
  const { tenantId } = useTenantId();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tarefaToDelete, setTarefaToDelete] = useState<TarefaOAB | null>(null);
  const [editingTarefa, setEditingTarefa] = useState<TarefaOAB | null>(null);
  const [relatorioOpen, setRelatorioOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Tarefas do card vinculado (admin)
  const [taskTarefas, setTaskTarefas] = useState<TaskTarefa[]>([]);

  // Form state - Criar tarefa
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fase, setFase] = useState('');
  const [dataExecucao, setDataExecucao] = useState(getLocalDateString());
  const [observacoes, setObservacoes] = useState('');

  // Form state - Editar tarefa
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editFase, setEditFase] = useState('');
  const [editDataExecucao, setEditDataExecucao] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');

  // State para modal de criar prazo
  const [prazoModalOpen, setPrazoModalOpen] = useState(false);
  const [prazoTitulo, setPrazoTitulo] = useState('');
  const [prazoDescricao, setPrazoDescricao] = useState('');
  const [prazoData, setPrazoData] = useState<Date>(new Date());
  const [prazoProjetoId, setPrazoProjetoId] = useState('');
  const [submittingPrazo, setSubmittingPrazo] = useState(false);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loadingProjetos, setLoadingProjetos] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Buscar user id
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  // Buscar projetos do tenant
  useEffect(() => {
    const fetchProjetos = async () => {
      if (!tenantId) return;
      setLoadingProjetos(true);
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, client')
          .eq('tenant_id', tenantId)
          .order('name');
        
        if (error) throw error;
        setProjetos(data || []);
      } catch (err) {
        console.error('Erro ao buscar projetos:', err);
      } finally {
        setLoadingProjetos(false);
      }
    };

    fetchProjetos();
  }, [tenantId]);

  // Buscar card vinculado e suas tarefas admin
  useEffect(() => {
    const buscarTarefasCardVinculado = async () => {
      if (!processo.id) return;

      const { data: task } = await supabase
        .from('tasks')
        .select('id')
        .eq('processo_oab_id', processo.id)
        .maybeSingle();

      if (task) {
        const { data: tarefasAdmin } = await supabase
          .from('task_tarefas')
          .select('*')
          .eq('task_id', task.id)
          .order('data_execucao', { ascending: false });

        setTaskTarefas((tarefasAdmin || []).map(t => ({ ...t, origem: 'card' as const })));
      } else {
        setTaskTarefas([]);
      }
    };

    buscarTarefasCardVinculado();
  }, [processo.id]);

  const resetForm = () => {
    setTitulo('');
    setDescricao('');
    setFase('');
    setDataExecucao(getLocalDateString());
    setObservacoes('');
  };

  const handleSubmit = async () => {
    if (!titulo.trim()) return;

    setSubmitting(true);
    const result = await adicionarTarefa({
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      fase: fase.trim() || undefined,
      data_execucao: dataExecucao,
      observacoes: observacoes.trim() || undefined,
    });
    setSubmitting(false);

    if (result) {
      resetForm();
      setDialogOpen(false);
    }
  };

  const handleEditClick = (tarefa: TarefaOAB) => {
    setEditingTarefa(tarefa);
    setEditTitulo(tarefa.titulo);
    setEditDescricao(tarefa.descricao || '');
    setEditFase(tarefa.fase || '');
    setEditDataExecucao(tarefa.data_execucao);
    setEditObservacoes(tarefa.observacoes || '');
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingTarefa || !editTitulo.trim()) return;

    setSubmitting(true);
    const result = await atualizarTarefa(editingTarefa.id, {
      titulo: editTitulo.trim(),
      descricao: editDescricao.trim() || undefined,
      fase: editFase.trim() || undefined,
      data_execucao: editDataExecucao,
      observacoes: editObservacoes.trim() || undefined,
    });
    setSubmitting(false);

    if (result) {
      setEditDialogOpen(false);
      setEditingTarefa(null);
    }
  };

  const handleDeleteClick = (tarefa: TarefaOAB) => {
    setTarefaToDelete(tarefa);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (tarefaToDelete) {
      await removerTarefa(tarefaToDelete.id);
      setDeleteDialogOpen(false);
      setTarefaToDelete(null);
    }
  };

  const handleCriarPrazoClick = (tarefa: TarefaOAB) => {
    // Pre-preencher com dados da tarefa
    setPrazoTitulo(tarefa.titulo);
    setPrazoDescricao(tarefa.descricao || tarefa.observacoes || '');
    setPrazoData(new Date());
    setPrazoProjetoId('');
    setPrazoModalOpen(true);
  };

  const handleCriarPrazoSubmit = async () => {
    if (!prazoTitulo.trim() || !prazoProjetoId || !userId || !tenantId) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatorios.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingPrazo(true);
    try {
      const { error } = await supabase
        .from('deadlines')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          title: prazoTitulo.trim(),
          description: prazoDescricao.trim() || null,
          date: format(prazoData, 'yyyy-MM-dd'),
          project_id: prazoProjetoId,
          processo_oab_id: processo.id,
        });

      if (error) throw error;

      toast({
        title: "Prazo criado",
        description: "O prazo foi adicionado a agenda com sucesso.",
      });
      
      setPrazoModalOpen(false);
      setPrazoTitulo('');
      setPrazoDescricao('');
      setPrazoProjetoId('');
    } catch (err) {
      console.error('Erro ao criar prazo:', err);
      toast({
        title: "Erro",
        description: "Nao foi possivel criar o prazo.",
        variant: "destructive",
      });
    } finally {
      setSubmittingPrazo(false);
    }
  };

  const formatData = (data: string) => {
    try {
      // Adicionar horario para evitar shift de timezone
      const date = new Date(data + 'T12:00:00');
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return data;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com botoes */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tarefas.length} tarefa(s) registrada(s)
        </p>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setRelatorioOpen(true)}
            disabled={tarefas.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Gerar Relatorio
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Tarefa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="titulo">Titulo *</Label>
                  <Input
                    id="titulo"
                    placeholder="Ex: Audiencia de Conciliacao"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fase">Fase Processual</Label>
                    <Input
                      id="fase"
                      placeholder="Selecione ou digite"
                      value={fase}
                      onChange={(e) => setFase(e.target.value)}
                      list="fases-lista"
                    />
                    <datalist id="fases-lista">
                      {FASES_SUGERIDAS.map((f) => (
                        <option key={f} value={f} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="data">Data de Execucao</Label>
                    <Input
                      id="data"
                      type="date"
                      value={dataExecucao}
                      onChange={(e) => setDataExecucao(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="descricao">Descricao</Label>
                  <Textarea
                    id="descricao"
                    placeholder="Detalhes da atividade realizada..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="observacoes">Observacoes</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Notas adicionais..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={2}
                  />
                </div>

                <Button onClick={handleSubmit} disabled={!titulo.trim() || submitting} className="w-full">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Registrar Tarefa'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Timeline de Tarefas */}
      <ScrollArea className="h-[calc(100vh-450px)]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : tarefas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="w-8 h-8 mx-auto mb-2" />
            <p>Nenhuma tarefa registrada</p>
            <p className="text-xs mt-1">Clique em "Nova Tarefa" para adicionar</p>
          </div>
        ) : (
          <div className="relative pl-6 pr-4 space-y-4">
            {/* Linha vertical da timeline */}
            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border" />
            
            {tarefas.map((tarefa) => (
              <div key={tarefa.id} className="relative">
                {/* Ponto na timeline */}
                <div className="absolute -left-3.5 top-2 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                
                <Card className="p-3 ml-2 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
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
                        <p className="text-sm text-muted-foreground mt-1">{tarefa.descricao}</p>
                      )}
                      {tarefa.observacoes && (
                        <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-primary/30 pl-2">
                          {tarefa.observacoes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary hover:text-primary"
                        onClick={() => handleCriarPrazoClick(tarefa)}
                        title="Criar Prazo na Agenda"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEditClick(tarefa)}
                        title="Editar Tarefa"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(tarefa)}
                        title="Excluir Tarefa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Dialog de edicao */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-titulo">Titulo *</Label>
              <Input
                id="edit-titulo"
                placeholder="Ex: Audiencia de Conciliacao"
                value={editTitulo}
                onChange={(e) => setEditTitulo(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-fase">Fase Processual</Label>
                <Input
                  id="edit-fase"
                  placeholder="Selecione ou digite"
                  value={editFase}
                  onChange={(e) => setEditFase(e.target.value)}
                  list="fases-lista-edit"
                />
                <datalist id="fases-lista-edit">
                  {FASES_SUGERIDAS.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-data">Data de Execucao</Label>
                <Input
                  id="edit-data"
                  type="date"
                  value={editDataExecucao}
                  onChange={(e) => setEditDataExecucao(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-descricao">Descricao</Label>
              <Textarea
                id="edit-descricao"
                placeholder="Detalhes da atividade realizada..."
                value={editDescricao}
                onChange={(e) => setEditDescricao(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-observacoes">Observacoes</Label>
              <Textarea
                id="edit-observacoes"
                placeholder="Notas adicionais..."
                value={editObservacoes}
                onChange={(e) => setEditObservacoes(e.target.value)}
                rows={2}
              />
            </div>

            <Button onClick={handleEditSubmit} disabled={!editTitulo.trim() || submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alteracoes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmacao de exclusao */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de criar prazo na agenda */}
      <Dialog open={prazoModalOpen} onOpenChange={setPrazoModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Prazo na Agenda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Info do processo vinculado */}
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Processo vinculado:</p>
              <p className="font-medium text-sm">{processo.numero_cnj}</p>
            </div>

            {/* Titulo */}
            <div className="space-y-1.5">
              <Label htmlFor="prazo-titulo">Titulo *</Label>
              <Input
                id="prazo-titulo"
                value={prazoTitulo}
                onChange={(e) => setPrazoTitulo(e.target.value)}
                placeholder="Titulo do prazo"
              />
            </div>

            {/* Data com Popover/Calendar compacto */}
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !prazoData && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {prazoData ? format(prazoData, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={prazoData}
                    onSelect={(d) => d && setPrazoData(d)}
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Projeto (obrigatorio) */}
            <div className="space-y-1.5">
              <Label>Projeto *</Label>
              <Select value={prazoProjetoId} onValueChange={setPrazoProjetoId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingProjetos ? "Carregando..." : "Selecione o projeto"} />
                </SelectTrigger>
                <SelectContent>
                  {projetos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.client ? `(${p.client})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descricao */}
            <div className="space-y-1.5">
              <Label htmlFor="prazo-descricao">Descricao</Label>
              <Textarea
                id="prazo-descricao"
                value={prazoDescricao}
                onChange={(e) => setPrazoDescricao(e.target.value)}
                placeholder="Detalhes do prazo..."
                rows={3}
              />
            </div>

            <Button 
              onClick={handleCriarPrazoSubmit} 
              disabled={!prazoTitulo.trim() || !prazoProjetoId || submittingPrazo} 
              className="w-full"
            >
              {submittingPrazo ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Prazo'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Relatorio Unificado */}
      <RelatorioUnificado
        open={relatorioOpen}
        onOpenChange={setRelatorioOpen}
        processo={processo}
        oab={oab}
        processoTarefas={tarefas}
        taskTarefas={taskTarefas}
      />
    </div>
  );
};
