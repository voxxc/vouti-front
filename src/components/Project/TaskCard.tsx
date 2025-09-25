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
import { Trash2, Calendar } from "lucide-react";
import { Task, TASK_STATUSES } from "@/types/project";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onClick?: (task: Task) => void;
}

const TaskCard = ({ task, onClick, onDelete }: TaskCardProps) => {
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(task);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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