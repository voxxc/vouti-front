import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Droppable } from "@hello-pangea/dnd";

interface KanbanColumnProps {
  id: string;
  title: string;
  children: ReactNode;
  onAddTask: () => void;
  taskCount: number;
}

const KanbanColumn = ({ id, title, children, onAddTask, taskCount }: KanbanColumnProps) => {
  const getColumnStyle = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'border-l-4 border-l-yellow-400 bg-status-waiting/20';
      case 'todo':
        return 'border-l-4 border-l-blue-400 bg-status-todo/20';
      case 'progress':
        return 'border-l-4 border-l-orange-400 bg-status-progress/20';
      case 'done':
        return 'border-l-4 border-l-green-400 bg-status-done/20';
      default:
        return '';
    }
  };

  return (
    <Card className={`shadow-card border-0 ${getColumnStyle(id)} min-h-[500px]`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {title}
            <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">
              {taskCount}
            </span>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onAddTask}
            className="h-6 w-6"
          >
            <Plus className="h-3 w-3" />
          </Button>
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