import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Calendar, ClipboardList, Trash2, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface TarefasTabProps {
  processo: ProcessoOAB;
  oab: OABCadastrada | null;
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

export const TarefasTab = ({ processo, oab }: TarefasTabProps) => {
  const { tarefas, loading, adicionarTarefa, removerTarefa } = useTarefasOAB(processo.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tarefaToDelete, setTarefaToDelete] = useState<TarefaOAB | null>(null);
  const [relatorioOpen, setRelatorioOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Tarefas do card vinculado (admin)
  const [taskTarefas, setTaskTarefas] = useState<TaskTarefa[]>([]);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fase, setFase] = useState('');
  const [dataExecucao, setDataExecucao] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [observacoes, setObservacoes] = useState('');

  // Buscar card vinculado e suas tarefas admin
  useEffect(() => {
    const buscarTarefasCardVinculado = async () => {
      if (!processo.id) return;

      // Buscar card que tem processo_oab_id = processo.id
      const { data: task } = await supabase
        .from('tasks')
        .select('id')
        .eq('processo_oab_id', processo.id)
        .maybeSingle();

      if (task) {
        // Buscar tarefas admin desse card
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
    setDataExecucao(format(new Date(), 'yyyy-MM-dd'));
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

  const formatData = (data: string) => {
    try {
      return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
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
            
            {tarefas.map((tarefa, index) => (
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(tarefa)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

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
