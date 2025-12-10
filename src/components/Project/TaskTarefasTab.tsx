import { useState } from 'react';
import { Plus, Calendar, Trash2, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
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
  onGerarRelatorio?: () => void;
  hasVinculo: boolean;
}

export const TaskTarefasTab = ({ taskId, onGerarRelatorio, hasVinculo }: TaskTarefasTabProps) => {
  const { tarefas, loading, adicionarTarefa, removerTarefa } = useTaskTarefas(taskId);
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tarefaParaDeletar, setTarefaParaDeletar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    fase: '',
    dataExecucao: format(new Date(), 'yyyy-MM-dd'),
    observacoes: '',
  });

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      fase: '',
      dataExecucao: format(new Date(), 'yyyy-MM-dd'),
      observacoes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.titulo.trim()) {
      toast({ title: 'Titulo obrigatorio', variant: 'destructive' });
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

    setSaving(false);

    if (result) {
      toast({ title: 'Tarefa adicionada' });
      resetForm();
      setDialogOpen(false);
    } else {
      toast({ title: 'Erro ao adicionar tarefa', variant: 'destructive' });
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={() => handleDeleteClick(tarefa.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Adicionar
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
