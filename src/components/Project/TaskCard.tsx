import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Calendar } from "lucide-react";
import { Task } from "@/types/project";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onClick?: (task: Task) => void;
}

const TaskCard = ({ task, onEdit, onDelete, onClick }: TaskCardProps) => {
  return (
    <Card 
      className="shadow-card border-0 hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing hover:cursor-pointer" 
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(task);
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium leading-5">
            {task.title}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {task.description && (
          <p className="text-xs text-muted-foreground mb-3 leading-4">
            {task.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(task.updatedAt, "dd/MM", { locale: ptBR })}
          </div>
          
          <Badge 
            variant="secondary" 
            className={`text-xs px-2 py-0.5 ${
              task.status === 'waiting' ? 'bg-status-waiting text-yellow-800' :
              task.status === 'todo' ? 'bg-status-todo text-blue-800' :
              task.status === 'progress' ? 'bg-status-progress text-orange-800' :
              'bg-status-done text-green-800'
            }`}
          >
            {task.status === 'waiting' ? 'Espera' :
             task.status === 'todo' ? 'A Fazer' :
             task.status === 'progress' ? 'Progresso' : 'Feito'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCard;