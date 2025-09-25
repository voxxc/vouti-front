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
import { Project, Task } from "@/types/project";
import { useToast } from "@/hooks/use-toast";

interface AcordosViewProps {
  onLogout: () => void;
  onBack: () => void;
  project: Project;
  onUpdateProject: (project: Project) => void;
}

interface AcordoTask extends Task {
  type: 'processo' | 'divida';
}

const AcordosView = ({ onLogout, onBack, project, onUpdateProject }: AcordosViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  // Filtrar apenas as tarefas relacionadas a acordos (você pode adicionar uma propriedade específica para isso)
  const acordoTasks = project.tasks.filter(task => 
    task.title.toLowerCase().includes('acordo') || 
    task.title.toLowerCase().includes('processo') || 
    task.title.toLowerCase().includes('dívida')
  );

  const filteredTasks = acordoTasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      title: "Item movido",
      description: `"${task.title}" foi atualizado com sucesso`,
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

  const handleAddTask = () => {
    const newTask: Task = {
      id: `acordo-${Date.now()}`,
      title: "Novo Processo/Dívida",
      description: "Clique para editar os detalhes",
      status: 'todo',
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
      title: "Item criado",
      description: "Novo processo/dívida adicionado com sucesso!",
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
    <DashboardLayout onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="gap-2">
              <ArrowLeft size={16} />
              Voltar ao Contrato
            </Button>
            <div>
              <EditableProjectName 
                projectName={`${project.name} - Acordos`}
                onUpdateName={handleUpdateProjectName}
              />
              <p className="text-muted-foreground">Setor de Acordos - Processos e Dívidas</p>
            </div>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar processos e dívidas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="professional" onClick={handleAddTask} className="gap-2">
            <Plus size={16} />
            Novo Processo/Dívida
          </Button>
        </div>

        {/* Single Column for Processos/Dívidas */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="max-w-md">
            <KanbanColumn
              id="processos-dividas"
              title="Processos/Dívidas"
              taskCount={filteredTasks.length}
              onAddTask={handleAddTask}
            >
              {filteredTasks.map((task, index) => (
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

export default AcordosView;