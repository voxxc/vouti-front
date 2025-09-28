import { useState } from "react";
import { DragDropContext, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Plus, Users } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import KanbanColumn from "@/components/Project/KanbanColumn";
import TaskCard from "@/components/Project/TaskCard";
import TaskModal from "@/components/Project/TaskModal";
import ProjectParticipants from "@/components/Project/ProjectParticipants";
import EditableProjectName from "@/components/Project/EditableProjectName";
import { Project, Task, TASK_STATUSES } from "@/types/project";
import { User } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { notifyTaskMovement, notifyTaskCreated, notifyCommentAdded } from "@/utils/notificationHelpers";
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
  const { toast } = useToast();

  const regularTasks = project.tasks.filter(task => task.type !== 'acordo');
  
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

  const getTasksByStatus = (status: string) => {
    return filteredTasks.filter(task => task.status === status);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const task = project.tasks.find(t => t.id === draggableId);
    if (!task) return;

    try {
      // Update task status in Supabase
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: destination.droppableId,
          updated_at: new Date().toISOString()
        })
        .eq('id', draggableId);

      if (error) throw error;

      const updatedTask = {
        ...task,
        status: destination.droppableId as Task['status'],
        updatedAt: new Date()
      };

      const updatedTasks = project.tasks.map(t =>
        t.id === draggableId ? updatedTask : t
      );

      const updatedProject = {
        ...project,
        tasks: updatedTasks,
        updatedAt: new Date()
      };

      onUpdateProject(updatedProject);

      // Send notification about task movement
      if (currentUser) {
        await notifyTaskMovement(
          project.id,
          task.title,
          source.droppableId,
          destination.droppableId,
          currentUser.name
        );
      }

      toast({
        title: "Tarefa movida",
        description: `"${task.title}" foi movida para ${TASK_STATUSES[destination.droppableId as keyof typeof TASK_STATUSES]}`,
      });
    } catch (error) {
      console.error('Error updating task status:', error);
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

  const handleAddTask = async (status: Task['status']) => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: "Nova Tarefa",
          description: "Clique para editar a descrição",
          status,
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

      const updatedProject = {
        ...project,
        tasks: [...project.tasks, newTask],
        updatedAt: new Date()
      };

      onUpdateProject(updatedProject);

      // Send notification about task creation
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
            <Button 
              variant="outline" 
              onClick={onNavigateToAcordos}
              className="gap-2"
            >
              Acordos
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(TASK_STATUSES).map(([status, title]) => {
              const tasks = getTasksByStatus(status);
              return (
                <KanbanColumn
                  key={status}
                  id={status}
                  title={title}
                  taskCount={tasks.length}
                  onAddTask={() => handleAddTask(status as Task['status'])}
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
              );
            })}
          </div>
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
      </div>
    </DashboardLayout>
  );
};

export default ProjectView;