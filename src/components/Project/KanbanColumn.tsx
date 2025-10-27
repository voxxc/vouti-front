import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  isDraggingColumn = false
}: KanbanColumnProps) => {
  const borderColor = color;
  const bgColor = `${color}20`;

  return (
    <Card 
      className={`shadow-card border-0 min-h-[500px] min-w-[280px] transition-opacity ${
        isDraggingColumn ? 'opacity-50' : ''
      }`}
      style={{
        borderLeft: `4px solid ${borderColor}`,
        backgroundColor: bgColor
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {!isDefault && (
              <div className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            {onUpdateName ? (
              <EditableColumnName
                columnName={title}
                onUpdateName={onUpdateName}
                isDefault={isDefault}
              />
            ) : (
              <span className="text-sm font-semibold">{title}</span>
            )}
            <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs shrink-0">
              {taskCount}
            </span>
          </div>
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
      </CardHeader>
      
      <CardContent className="pt-0">
        <Droppable droppableId={id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-3 min-h-[400px] p-2 rounded-md transition-colors ${
                snapshot.isDraggingOver ? 'bg-muted/50' : ''
              }`}
            >
              {children}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );
};

export default KanbanColumn;