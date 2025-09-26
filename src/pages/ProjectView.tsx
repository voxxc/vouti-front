import { useState } from "react";
import { DragDropContext, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Plus } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import KanbanColumn from "@/components/Project/KanbanColumn";
import TaskCard from "@/components/Project/TaskCard";
import TaskModal from "@/components/Project/TaskModal";
import EditableProjectName from "@/components/Project/EditableProjectName";
import { Project, Task, TASK_STATUSES } from "@/types/project";
import { User } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { notifyTaskMovement, notifyTaskCreated, notifyCommentAdded } from "@/utils/notificationHelpers";

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
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    const updatedTasks = project.tasks.map(t =>
      t.id === updatedTask.id ? updatedTask : t
    );

    const updatedProject = {
      ...project,
      tasks: updatedTasks,
      updatedAt: new Date()
    };

    onUpdateProject(updatedProject);
  };

  const handleDeleteTask = (taskId: string) => {
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
  };

  const handleAddTask = async (status: Task['status']) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: "Nova Tarefa",
      description: "Clique para editar a descrição",
      status,
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
      createdAt: new Date(),
      updatedAt: new Date()
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
  };

  const handleUpdateProjectName = (newName: string) => {
    const updatedProject = {
      ...project,
      name: newName,
      updatedAt: new Date()
    };
    onUpdateProject(updatedProject);
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
              <p className="text-muted-foreground">Cliente: {project.client}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={onNavigateToAcordos}
            className="gap-2"
          >
            Acordos
          </Button>
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
      </div>
    </DashboardLayout>
  );
};

export default ProjectView;