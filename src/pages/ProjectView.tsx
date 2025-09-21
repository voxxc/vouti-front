import { useState } from "react";
import { DragDropContext, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Plus } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import KanbanColumn from "@/components/Project/KanbanColumn";
import TaskCard from "@/components/Project/TaskCard";
import TaskModal from "@/components/Project/TaskModal";
import { Project, Task, TASK_STATUSES } from "@/types/project";
import { useToast } from "@/hooks/use-toast";

interface ProjectViewProps {
  onLogout: () => void;
  onBack: () => void;
  project: Project;
  onUpdateProject: (project: Project) => void;
}

const ProjectView = ({ onLogout, onBack, project, onUpdateProject }: ProjectViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const filteredTasks = project.tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTasksByStatus = (status: string) => {
    return filteredTasks.filter(task => task.status === status);
  };

  const handleDragEnd = (result: DropResult) => {
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

  const handleAddTask = (status: Task['status']) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: "Nova Tarefa",
      description: "Clique para editar a descrição",
      status,
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedProject = {
      ...project,
      tasks: [...project.tasks, newTask],
      updatedAt: new Date()
    };

    onUpdateProject(updatedProject);

    toast({
      title: "Tarefa criada",
      description: "Nova tarefa adicionada com sucesso!",
    });
  };

  return (
    <DashboardLayout onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="gap-2">
              <ArrowLeft size={16} />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
              <p className="text-muted-foreground">Cliente: {project.client}</p>
            </div>
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
                          <TaskCard task={task} onClick={handleTaskClick} />
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
        />
      </div>
    </DashboardLayout>
  );
};

export default ProjectView;