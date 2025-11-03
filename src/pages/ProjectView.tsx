import { useState, useEffect } from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Plus, Users, Lock, LockOpen } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import KanbanColumn from "@/components/Project/KanbanColumn";
import TaskCard from "@/components/Project/TaskCard";
import TaskModal from "@/components/Project/TaskModal";
import ProjectParticipants from "@/components/Project/ProjectParticipants";
import EditableProjectName from "@/components/Project/EditableProjectName";
import AddColumnButton from "@/components/Project/AddColumnButton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Project, Task, KanbanColumn as KanbanColumnType, ProjectSector } from "@/types/project";
import SetoresDropdown from "@/components/Project/SetoresDropdown";
import CreateSectorDialog from "@/components/Project/CreateSectorDialog";
import { User } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { notifyTaskMovement, notifyTaskCreated } from "@/utils/notificationHelpers";
import { supabase } from "@/integrations/supabase/client";

interface ProjectViewProps {
  onLogout: () => void;
  onBack: () => void;
  project: Project;
  onUpdateProject: (project: Project) => void;
  onNavigateToAcordos?: () => void;
  currentUser?: User;
  users?: User[];
  onProjectNavigation?: (projectId: string) => void;
}

const ProjectView = ({ 
  onLogout, 
  onBack, 
  project, 
  onUpdateProject, 
  onNavigateToAcordos,
  currentUser,
  users = [],
  onProjectNavigation
}: ProjectViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [isColumnsLocked, setIsColumnsLocked] = useState(false);
  const [sectors, setSectors] = useState<ProjectSector[]>([]);
  const [isCreateSectorOpen, setIsCreateSectorOpen] = useState(false);
  const { toast } = useToast();

  // Load columns from database
  useEffect(() => {
    loadColumns();
    loadSectors();
  }, [project.id]);

  const loadColumns = async () => {
    try {
      const { data, error } = await supabase
        .from('project_columns')
        .select('*')
        .eq('project_id', project.id)
        .is('sector_id', null)
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
      console.error('Error loading columns:', error);
    }
  };

  const loadSectors = async () => {
    try {
      const { data, error } = await supabase
        .from('project_sectors')
        .select('*')
        .eq('project_id', project.id)
        .order('is_default', { ascending: false })
        .order('sector_order');

      if (error) throw error;

      if (data) {
        const loadedSectors: ProjectSector[] = data.map(sector => ({
          id: sector.id,
          projectId: sector.project_id,
          name: sector.name,
          description: sector.description,
          sectorOrder: sector.sector_order,
          isDefault: sector.is_default,
          createdBy: sector.created_by,
          createdAt: new Date(sector.created_at),
          updatedAt: new Date(sector.updated_at)
        }));
        setSectors(loadedSectors);
      }
    } catch (error) {
      console.error('Error loading sectors:', error);
    }
  };

  const regularTasks = project.tasks.filter(task => task.type !== 'acordo' && !task.sectorId);
  
  const filteredTasks = regularTasks.filter(task => {
    const searchLower = searchTerm.toLowerCase();
    return (
      task.title.toLowerCase().includes(searchLower) ||
      task.description.toLowerCase().includes(searchLower) ||
      task.comments.some(comment => 
        comment.text.toLowerCase().includes(searchLower)
      )
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

    // Handle column reordering
    if (type === 'COLUMN') {
      const reorderedColumns = Array.from(columns);
      const [movedColumn] = reorderedColumns.splice(source.index, 1);
      reorderedColumns.splice(destination.index, 0, movedColumn);

      const updatedColumns = reorderedColumns.map((col, index) => ({
        ...col,
        columnOrder: index
      }));

      setColumns(updatedColumns);

      // Update column orders in database
      try {
        for (const col of updatedColumns) {
          await supabase
            .from('project_columns')
            .update({ column_order: col.columnOrder })
            .eq('id', col.id);
        }
      } catch (error) {
        console.error('Error updating column order:', error);
        loadColumns(); // Reload on error
      }
      return;
    }

    // Handle task movement
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

      const sourceColumn = columns.find(c => c.id === source.droppableId);
      const destColumn = columns.find(c => c.id === destination.droppableId);

      if (currentUser && sourceColumn && destColumn) {
        await notifyTaskMovement(
          project.id,
          task.title,
          sourceColumn.name,
          destColumn.name,
          currentUser.name
        );
      }

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

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      // Update task in Supabase
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

      const updatedProject = {
        ...project,
        tasks: updatedTasks,
        updatedAt: new Date()
      };

      onUpdateProject(updatedProject);

      toast({
        title: "Sucesso",
        description: "Tarefa atualizada com sucesso!",
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
      // Delete task from Supabase
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      const updatedTasks = project.tasks.filter(t => t.id !== taskId);
      const updatedProject = {
        ...project,
        tasks: updatedTasks,
        updatedAt: new Date()
      };
      onUpdateProject(updatedProject);
      
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

  const handleAddTask = async (columnId: string) => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: "Nova Tarefa",
          description: "Clique para editar a descrição",
          status: 'todo',
          column_id: columnId,
          project_id: project.id,
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
        comments: [],
        files: [],
        history: [{
          id: `history-${Date.now()}`,
          action: 'created',
          details: 'Tarefa criada',
          user: currentUser.name || project.createdBy,
          timestamp: new Date()
        }],
        type: 'regular',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      onUpdateProject({
        ...project,
        tasks: [...project.tasks, newTask],
        updatedAt: new Date()
      });

      if (currentUser) {
        await notifyTaskCreated(
          project.id,
          newTask.title,
          currentUser.name
        );
      }

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

  const handleUpdateProjectName = async (newName: string) => {
    try {
      // Update project name in Supabase
      const { error } = await supabase
        .from('projects')
        .update({ 
          name: newName,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

      if (error) throw error;

      const updatedProject = {
        ...project,
        name: newName,
        updatedAt: new Date()
      };
      onUpdateProject(updatedProject);

      toast({
        title: "Sucesso",
        description: "Nome do projeto atualizado!",
      });
    } catch (error) {
      console.error('Error updating project name:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar nome do projeto.",
        variant: "destructive",
      });
    }
  };

  const handleCreateSector = async (name: string, description: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const newSectorOrder = sectors.length;

      const { data, error } = await supabase
        .from('project_sectors')
        .insert({
          project_id: project.id,
          name,
          description,
          sector_order: newSectorOrder,
          is_default: false,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Criar 2 colunas padrão para o novo setor
      const { error: columnsError } = await supabase
        .from('project_columns')
        .insert([
          {
            project_id: project.id,
            sector_id: data.id,
            name: 'A Fazer',
            column_order: 0,
            color: '#f59e0b',
            is_default: true
          },
          {
            project_id: project.id,
            sector_id: data.id,
            name: 'Concluído',
            column_order: 1,
            color: '#10b981',
            is_default: true
          }
        ]);

      if (columnsError) throw columnsError;

      await loadSectors();

      toast({
        title: "Setor criado",
        description: `Setor "${name}" criado com sucesso!`,
      });

      // Navegar para o novo setor
      handleNavigateToSector(data.id);
    } catch (error) {
      console.error('Error creating sector:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar setor.",
        variant: "destructive",
      });
    }
  };

  const handleNavigateToSector = (sectorId: string) => {
    if (onProjectNavigation) {
      onProjectNavigation(`${project.id}/sector/${sectorId}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="gap-2">
              <ArrowLeft size={16} />
              Voltar
            </Button>
            <div>
              <EditableProjectName 
                projectName={project.name}
                onUpdateName={handleUpdateProjectName}
              />
              <p className="text-muted-foreground">{project.client}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsParticipantsOpen(true)}
              className="gap-2"
            >
              <Users size={16} />
              Participantes
            </Button>
            
            <SetoresDropdown
              sectors={sectors}
              onNavigateToSector={handleNavigateToSector}
              onCreateSector={() => setIsCreateSectorOpen(true)}
            />
            
            <Button 
              variant={isColumnsLocked ? "default" : "outline"}
              onClick={() => setIsColumnsLocked(!isColumnsLocked)}
              className="gap-2"
            >
              {isColumnsLocked ? <Lock size={16} /> : <LockOpen size={16} />}
              {isColumnsLocked ? "Desbloquear" : "Bloquear"} Colunas
            </Button>
          </div>
        </div>

        {/* Search and Actions */}
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
          <Button variant="professional" className="gap-2">
            <Plus size={16} />
            Nova Tarefa
          </Button>
        </div>

        {/* Kanban Board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <ScrollArea className="w-full">
            <Droppable droppableId="all-columns" direction="horizontal" type="COLUMN">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex gap-6 pb-4"
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
                                color={column.color}
                                isDefault={column.isDefault}
                                isDraggingColumn={columnSnapshot.isDragging}
                                isColumnsLocked={isColumnsLocked}
                                onAddTask={() => handleAddTask(column.id)}
                                onUpdateName={(newName) => handleUpdateColumnName(column.id, newName)}
                                onDeleteColumn={() => handleDeleteColumn(column.id)}
                              >
                                {tasks.map((task, index) => (
                                  <Draggable key={task.id} draggableId={task.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={snapshot.isDragging ? 'opacity-50' : ''}
                                      >
                                        <TaskCard 
                                          task={task} 
                                          onClick={handleTaskClick}
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

        <ProjectParticipants
          isOpen={isParticipantsOpen}
          onClose={() => setIsParticipantsOpen(false)}
          projectId={project.id}
          projectName={project.name}
        />

        <CreateSectorDialog
          isOpen={isCreateSectorOpen}
          onClose={() => setIsCreateSectorOpen(false)}
          onCreateSector={handleCreateSector}
        />
      </div>
    </DashboardLayout>
  );
};

export default ProjectView;