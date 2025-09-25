import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Calendar, MessageSquare } from "lucide-react";
import { Task, TASK_STATUSES } from "@/types/project";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onClick?: (task: Task) => void;
  onUpdateTask?: (task: Task) => void;
}

const TaskCard = ({ task, onClick, onDelete, onUpdateTask }: TaskCardProps) => {
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(task);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleGenerateMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!task.acordoDetails || !onUpdateTask) return;
    
    const details = task.acordoDetails;
    let message = `Falamos com o jurídico do ${details.banco || '[BANCO/COOPERATIVA]'}, e informo a título de conhecimento:\n\n`;
    
    message += `CLIENTE: ${task.title}\n\n`;
    
    if (details.contratoProcesso) {
      message += `CONTRATO: ${details.contratoProcesso}\n\n`;
    }
    
    if (details.valorOriginal !== undefined) {
      message += `SALDO ORIGINAL: R$ ${details.valorOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
    }
    
    if (details.valorAtualizado !== undefined) {
      message += `SALDO DEVEDOR ATUALIZADO: R$ ${details.valorAtualizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
    }
    
    if (details.aVista !== undefined) {
      message += `PARA PAGAMENTO À VISTA: R$ ${details.aVista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
    }
    
    if (details.parcelado) {
      const entrada = details.parcelado.entrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const parcelas = details.parcelado.parcelas.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const quantidade = details.parcelado.quantidadeParcelas;
      message += `PARA PAGAMENTO PARCELADO: Entrada + R$ ${entrada} + ${quantidade}x de R$ ${parcelas}\n\n`;
    }
    
    if (details.honorarios !== undefined) {
      message += `Honorários do Banco: R$ ${details.honorarios.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    
    const newComment = {
      id: `comment-${Date.now()}`,
      text: message,
      author: 'Sistema',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const updatedTask = {
      ...task,
      comments: [...task.comments, newComment],
      updatedAt: new Date(),
      history: [
        ...task.history,
        {
          id: `history-${Date.now()}`,
          action: 'comment_added' as const,
          details: 'Mensagem automática gerada pelo sistema',
          user: 'Sistema',
          timestamp: new Date()
        }
      ]
    };
    
    onUpdateTask(updatedTask);
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow border-0 shadow-card group"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium leading-tight flex-1">
            {task.title}
          </CardTitle>
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir "{task.title}"?
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(task.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(task.updatedAt), "dd/MM", { locale: ptBR })}
          </div>
          
          <Badge 
            variant="outline" 
            className="text-xs px-2 py-0.5"
          >
            {TASK_STATUSES[task.status]}
          </Badge>
        </div>

        {/* Acordo Details */}
        {task.type === 'acordo' && task.acordoDetails && (
          <div className="space-y-1 text-xs border-t pt-2 mt-2">
            {task.acordoDetails.contratoProcesso && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contrato/Processo:</span>
                <span className="font-medium">{task.acordoDetails.contratoProcesso}</span>
              </div>
            )}
            {task.acordoDetails.valorOriginal !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor original:</span>
                <span className="font-medium">R$ {task.acordoDetails.valorOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {task.acordoDetails.valorAtualizado !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor atualizado:</span>
                <span className="font-medium">R$ {task.acordoDetails.valorAtualizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {task.acordoDetails.banco && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Banco:</span>
                <span className="font-medium">{task.acordoDetails.banco}</span>
              </div>
            )}
            {task.acordoDetails.aVista !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">À vista:</span>
                <span className="font-medium">R$ {task.acordoDetails.aVista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {task.acordoDetails.parcelado && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parcelado:</span>
                <span className="font-medium">
                  R$ {task.acordoDetails.parcelado.entrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} + 
                  {task.acordoDetails.parcelado.quantidadeParcelas}x R$ {task.acordoDetails.parcelado.parcelas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {task.acordoDetails.honorarios !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Honorários:</span>
                <span className="font-medium">R$ {task.acordoDetails.honorarios.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            
            {/* Botão Gerar Mensagem */}
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateMessage}
                className="w-full text-xs gap-1"
              >
                <MessageSquare className="h-3 w-3" />
                GERAR MENSAGEM
              </Button>
            </div>
          </div>
        )}

        {/* File and Comment Count */}
        {(task.files?.length > 0 || task.comments?.length > 0) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {task.files?.length > 0 && (
              <span>{task.files.length} arquivo{task.files.length !== 1 ? 's' : ''}</span>
            )}
            {task.comments?.length > 0 && (
              <span>{task.comments.length} comentário{task.comments.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskCard;