import { useState, useEffect } from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Lock, LockOpen } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import KanbanColumn from "@/components/Project/KanbanColumn";
import TaskCard from "@/components/Project/TaskCard";
import TaskModal from "@/components/Project/TaskModal";
import AddColumnButton from "@/components/Project/AddColumnButton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Project, Task, KanbanColumn as KanbanColumnType, ProjectSector } from "@/types/project";
import { User } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SectorViewProps {
  onBack: () => void;
  project: Project;
  sector: ProjectSector;
  onUpdateProject: (project: Project) => void;
  currentUser?: User;
}

const SectorView = ({ 
  onBack, 
  project, 
  sector,
  onUpdateProject,
  currentUser
}: SectorViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [isColumnsLocked, setIsColumnsLocked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSectorColumns();
  }, [sector.id]);

  const loadSectorColumns = async () => {
    try {
      const { data, error } = await supabase
        .from('project_columns')
        .select('*')
        .eq('sector_id', sector.id)
        .order('column_order');

      if (error) throw error;

      if (data) {
        const loadedColumns: KanbanColumnType[] = data.map(col => ({
          id: col.id,
          projectId: col.project_id,
          sectorId: col.sector_id,
          name: col.name,
          columnOrder: col.column_order,
          color: col.color,
          isDefault: col.is_default,
          createdAt: new Date(col.created_at),
          updatedAt: new Date(col.updated_at)
        }));
        setColumns(loadedColumns);
      }
    } catch (error) {
      console.error('Error loading sector columns:', error);
    }
  };

  const sectorTasks = project.tasks.filter(task => task.sectorId === sector.id);
  
  const filteredTasks = sectorTasks.filter(task => {
    const searchLower = searchTerm.toLowerCase();
    return (
      task.title.toLowerCase().includes(searchLower) ||
      task.description.toLowerCase().includes(searchLower)
    );
  });

  const getTasksByColumn = (columnId: string) => {
    return filteredTasks.filter(task => task.columnId === columnId);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === 'COLUMN') {
      const reorderedColumns = Array.from(columns);
      const [movedColumn] = reorderedColumns.splice(source.index, 1);
      reorderedColumns.splice(destination.index, 0, movedColumn);

      const updatedColumns = reorderedColumns.map((col, index) => ({
        ...col,
        columnOrder: index
      }));

      setColumns(updatedColumns);

      try {
        for (const col of updatedColumns) {
          await supabase
            .from('project_columns')
            .update({ column_order: col.columnOrder })
            .eq('id', col.id);
        }
      } catch (error) {
        console.error('Error updating column order:', error);
        loadSectorColumns();
      }
      return;
    }

    const task = project.tasks.find(t => t.id === draggableId);
    if (!task) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          column_id: destination.droppableId,
          updated_at: new Date().toISOString()
        })
        .eq('id', draggableId);

      if (error) throw error;

      const updatedTask = {
        ...task,
        columnId: destination.droppableId,
        updatedAt: new Date()
      };

      const updatedTasks = project.tasks.map(t =>
        t.id === draggableId ? updatedTask : t
      );

      onUpdateProject({
        ...project,
        tasks: updatedTasks,
        updatedAt: new Date()
      });

      const destColumn = columns.find(c => c.id === destination.droppableId);

      toast({
        title: "Tarefa movida",
        description: `"${task.title}" foi movida para ${destColumn?.name}`,
      });
    } catch (error) {
      console.error('Error moving task:', error);
      toast({
        title: "Erro",
        description: "Erro ao mover tarefa.",
        variant: "destructive",
      });
    }
  };

  const handleAddTask = async (columnId: string) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: "Nova Tarefa",
          description: "Clique para editar",
          status: 'todo',
          project_id: project.id,
          sector_id: sector.id,
          column_id: columnId,
          task_type: 'regular'
        })
        .select()
        .single();

      if (error) throw error;

      const newTask: Task = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        status: data.status as Task['status'],
        columnId: data.column_id,
        sectorId: data.sector_id,
        comments: [],
        files: [],
        history: [{
          id: `history-${Date.now()}`,
          action: 'created',
          details: 'Tarefa criada',
          user: currentUser?.name || project.createdBy,
          timestamp: new Date()
        }],
        type: 'regular',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      onUpdateProject({
        ...project,
        tasks: [...project.tasks, newTask]
      });

      toast({
        title: "Tarefa criada",
        description: "Nova tarefa adicionada com sucesso!",
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar tarefa.",
        variant: "destructive",
      });
    }
  };

  const handleAddColumn = async (name: string, color: string) => {
    try {
      const maxOrder = Math.max(...columns.map(c => c.columnOrder), -1);
      
      const { data, error } = await supabase
        .from('project_columns')
        .insert({
          project_id: project.id,
          sector_id: sector.id,
          name,
          color,
          column_order: maxOrder + 1,
          is_default: false
        })
        .select()
        .single();

      if (error) throw error;

      const newColumn: KanbanColumnType = {
        id: data.id,
        projectId: data.project_id,
        sectorId: data.sector_id,
        name: data.name,
        columnOrder: data.column_order,
        color: data.color,
        isDefault: data.is_default,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      setColumns([...columns, newColumn]);

      toast({
        title: "Coluna criada",
        description: `Coluna "${name}" adicionada com sucesso!`,
      });
    } catch (error) {
      console.error('Error creating column:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar coluna.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: updatedTask.title,
          description: updatedTask.description,
          status: updatedTask.status,
          card_color: updatedTask.cardColor || 'default',
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedTask.id);

      if (error) throw error;

      const updatedTasks = project.tasks.map(t =>
        t.id === updatedTask.id ? updatedTask : t
      );

      onUpdateProject({
        ...project,
        tasks: updatedTasks,
        updatedAt: new Date()
      });

    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar tarefa.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      const updatedTasks = project.tasks.filter(t => t.id !== taskId);
      onUpdateProject({
        ...project,
        tasks: updatedTasks,
        updatedAt: new Date()
      });
      
      toast({
        title: "Tarefa excluída",
        description: "Tarefa removida com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir tarefa.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateColumnName = async (columnId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('project_columns')
        .update({ name: newName })
        .eq('id', columnId);

      if (error) throw error;

      setColumns(columns.map(col => 
        col.id === columnId ? { ...col, name: newName } : col
      ));

      toast({
        title: "Coluna atualizada",
        description: "Nome da coluna atualizado com sucesso!",
      });
    } catch (error) {
      console.error('Error updating column name:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar nome da coluna.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
      const tasksInColumn = project.tasks.filter(t => t.columnId === columnId);
      
      if (tasksInColumn.length > 0) {
        toast({
          title: "Erro",
          description: "Não é possível excluir uma coluna com tarefas. Mova ou delete as tarefas primeiro.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('project_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      setColumns(columns.filter(col => col.id !== columnId));

      toast({
        title: "Coluna excluída",
        description: "Coluna removida com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting column:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir coluna.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="gap-2">
              <ArrowLeft size={16} />
              Voltar ao Projeto
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{sector.name}</h1>
              <p className="text-muted-foreground">
                {sector.description || `Setor: ${sector.name}`}
              </p>
            </div>
          </div>
          <Button 
            variant={isColumnsLocked ? "default" : "outline"}
            onClick={() => setIsColumnsLocked(!isColumnsLocked)}
            className="gap-2"
          >
            {isColumnsLocked ? <Lock size={16} /> : <LockOpen size={16} />}
            {isColumnsLocked ? "Desbloquear" : "Bloquear"} Colunas
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <ScrollArea className="w-full">
            <Droppable droppableId="all-columns" direction="horizontal" type="COLUMN">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex gap-4 pb-4"
                >
                  {columns.map((column, columnIndex) => {
                    const tasks = getTasksByColumn(column.id);
                    return (
                      <Draggable
                        key={column.id}
                        draggableId={column.id}
                        index={columnIndex}
                        isDragDisabled={isColumnsLocked}
                      >
                        {(columnProvided, columnSnapshot) => (
                          <div
                            ref={columnProvided.innerRef}
                            {...columnProvided.draggableProps}
                          >
                            <div {...columnProvided.dragHandleProps}>
                              <KanbanColumn
                                id={column.id}
                                title={column.name}
                                taskCount={tasks.length}
                                onAddTask={() => handleAddTask(column.id)}
                                color={column.color}
                                isDefault={column.isDefault}
                                onUpdateName={(newName) => handleUpdateColumnName(column.id, newName)}
                                onDeleteColumn={() => handleDeleteColumn(column.id)}
                                isDraggingColumn={columnSnapshot.isDragging}
                                isColumnsLocked={isColumnsLocked}
                              >
                                {tasks.map((task, taskIndex) => (
                                  <Draggable
                                    key={task.id}
                                    draggableId={task.id}
                                    index={taskIndex}
                                  >
                                    {(taskProvided) => (
                                      <div
                                        ref={taskProvided.innerRef}
                                        {...taskProvided.draggableProps}
                                        {...taskProvided.dragHandleProps}
                                      >
                                        <TaskCard
                                          task={task}
                                          onClick={() => {
                                            setSelectedTask(task);
                                            setIsModalOpen(true);
                                          }}
                                          onDelete={handleDeleteTask}
                                          onUpdateTask={handleUpdateTask}
                                        />
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                              </KanbanColumn>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  <AddColumnButton onAddColumn={handleAddColumn} />
                </div>
              )}
            </Droppable>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DragDropContext>

        <TaskModal
          task={selectedTask}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUpdateTask={handleUpdateTask}
          currentUser={currentUser}
          projectId={project.id}
        />
      </div>
    </DashboardLayout>
  );
};

export default SectorView;
