import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { PlanejadorTask, KanbanColumn, KANBAN_COLUMNS } from "@/hooks/usePlanejadorTasks";
import { PlanejadorTaskCard } from "./PlanejadorTaskCard";
import { ColumnConfig } from "./PlanejadorSettings";
import { endOfWeek, addWeeks, setHours } from "date-fns";
import { useMemo } from "react";

interface PlanejadorKanbanProps {
  tasksByColumn: Record<KanbanColumn, PlanejadorTask[]>;
  onTaskClick: (task: PlanejadorTask) => void;
  onMoveTask: (taskId: string, updates: Partial<PlanejadorTask>) => void;
  searchQuery: string;
  locked?: boolean;
  columnConfig?: ColumnConfig[];
}

function getDeadlineForColumn(column: KanbanColumn): string | null {
  const now = new Date();
  switch (column) {
    case 'hoje': return setHours(now, 18).toISOString();
    case 'esta_semana': return endOfWeek(now, { weekStartsOn: 1 }).toISOString();
    case 'proxima_semana': return endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }).toISOString();
    case 'duas_semanas': return endOfWeek(addWeeks(now, 2), { weekStartsOn: 1 }).toISOString();
    case 'sem_prazo': return null;
    case 'concluido': return null;
    case 'vencido': return null;
    default: return null;
  }
}

export function PlanejadorKanban({ tasksByColumn, onTaskClick, onMoveTask, searchQuery, locked = false, columnConfig }: PlanejadorKanbanProps) {
  const columns = useMemo(() => {
    if (!columnConfig || columnConfig.length === 0) {
      return KANBAN_COLUMNS.map(col => ({ ...col, visible: true }));
    }
    return [...columnConfig]
      .sort((a, b) => a.order - b.order)
      .filter(c => c.visible)
      .map(c => ({
        id: c.id,
        label: c.label,
        color: c.color,
      }));
  }, [columnConfig]);

  const handleDragEnd = (result: DropResult) => {
    if (locked || !result.destination) return;
    const destColumn = result.destination.droppableId as KanbanColumn;
    const taskId = result.draggableId;

    const updates: Partial<PlanejadorTask> = {};
    if (destColumn === 'concluido') {
      updates.status = 'completed';
    } else {
      updates.status = 'pending';
      const newDeadline = getDeadlineForColumn(destColumn);
      if (destColumn === 'sem_prazo') {
        updates.prazo = null;
      } else if (newDeadline) {
        updates.prazo = newDeadline;
      }
    }
    onMoveTask(taskId, updates);
  };

  const filterTasks = (tasks: PlanejadorTask[]) => {
    if (!searchQuery) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(t => t.titulo.toLowerCase().includes(q));
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full min-h-0">
        {columns.map((col) => {
          const tasks = filterTasks(tasksByColumn[col.id] || []);
          return (
            <div key={col.id} className="flex-shrink-0 w-72 flex flex-col min-h-0">
              {/* Column Header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
                <span className="text-sm font-semibold text-white truncate">{col.label}</span>
                <span className="text-xs text-white/40 font-medium">({tasks.length})</span>
              </div>

              {/* Column Body */}
              <Droppable droppableId={col.id} isDropDisabled={locked}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-h-[200px] rounded-xl p-2 space-y-2 transition-colors overflow-y-auto ${
                      snapshot.isDraggingOver
                        ? 'bg-white/10 ring-1 ring-white/20'
                        : 'bg-white/[0.03]'
                    }`}
                  >
                    {tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={locked}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={snapshot.isDragging ? 'opacity-90 rotate-1' : ''}
                          >
                            <PlanejadorTaskCard task={task} onClick={() => onTaskClick(task)} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {tasks.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex items-center justify-center h-20 text-white/20 text-xs">
                        Nenhuma tarefa
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
