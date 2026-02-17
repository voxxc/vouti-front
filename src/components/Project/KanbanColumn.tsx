import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Droppable } from "@hello-pangea/dnd";
import EditableColumnName from "./EditableColumnName";
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
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: string;
  title: string;
  children: ReactNode;
  onAddTask: () => void;
  taskCount: number;
  color?: string;
  isDefault?: boolean;
  onUpdateName?: (newName: string) => void;
  onDeleteColumn?: () => void;
  isDraggingColumn?: boolean;
  isColumnsLocked?: boolean;
  fullWidth?: boolean;
}

const KanbanColumn = ({ 
  id, 
  title, 
  children, 
  onAddTask, 
  taskCount,
  color = '#6366f1',
  isDefault = false,
  onUpdateName,
  onDeleteColumn,
  isDraggingColumn = false,
  isColumnsLocked = false,
  fullWidth = false
}: KanbanColumnProps) => {
  return (
    <div 
      className={cn(
        "bg-muted/50 rounded-lg p-3 flex flex-col max-h-[calc(100vh-220px)] flex-shrink-0 transition-opacity",
        fullWidth ? 'w-full min-w-[280px]' : 'w-64 min-w-64',
        isDraggingColumn && 'opacity-50 shadow-lg ring-2 ring-primary/30'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className={isColumnsLocked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}>
          <GripVertical className={cn("h-3.5 w-3.5", isColumnsLocked ? 'text-muted-foreground/30' : 'text-muted-foreground')} />
        </div>
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        {onUpdateName ? (
          <EditableColumnName
            columnName={title}
            onUpdateName={onUpdateName}
            isDefault={isDefault}
          />
        ) : (
          <h3 className="font-semibold text-xs truncate uppercase tracking-wide">{title}</h3>
        )}
        <Badge variant="secondary" className="ml-auto shrink-0 text-[10px] h-5">
          {taskCount}
        </Badge>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onAddTask}
            className="h-6 w-6"
          >
            <Plus className="h-3 w-3" />
          </Button>
          {!isDefault && onDeleteColumn && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir coluna?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. A coluna será excluída permanentemente.
                    {taskCount > 0 && (
                      <span className="block mt-2 text-destructive font-medium">
                        Atenção: Esta coluna possui {taskCount} tarefa(s).
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteColumn}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      
      {/* Cards Droppable */}
      <div className="flex-1 overflow-y-auto">
        <Droppable droppableId={id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "space-y-2 min-h-[100px] pr-1",
                snapshot.isDraggingOver && 'bg-primary/5 rounded'
              )}
            >
              {children}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
};

export default KanbanColumn;
