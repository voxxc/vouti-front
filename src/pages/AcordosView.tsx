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

// Removed interface AcordoTask - using Task directly

const AcordosView = ({ onLogout, onBack, project, onUpdateProject }: AcordosViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  // Filtrar apenas as tarefas de acordo usando o type
  const acordoTasks = project.acordoTasks || [];
  
  const filteredTasks = acordoTasks.filter(task => {
    const searchLower = searchTerm.toLowerCase();
    return (
      task.title.toLowerCase().includes(searchLower) ||
      task.description.toLowerCase().includes(searchLower) ||
      task.comments.some(comment => 
        comment.text.toLowerCase().includes(searchLower)
      )
    );
  });

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const task = acordoTasks.find(t => t.id === draggableId);
    if (!task) return;

    const updatedTask = {
      ...task,
      status: destination.droppableId as Task['status'],
      updatedAt: new Date(),
      history: [
        ...task.history,
        {
          id: `history-${Date.now()}`,
          action: 'moved' as const,
          details: `Tarefa movida para ${destination.droppableId}`,
          user: project.createdBy,
          timestamp: new Date()
        }
      ]
    };

    const updatedAcordoTasks = acordoTasks.map(t =>
      t.id === draggableId ? updatedTask : t
    );

    const updatedProject = {
      ...project,
      acordoTasks: updatedAcordoTasks,
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
    const updatedAcordoTasks = acordoTasks.map(t =>
      t.id === updatedTask.id ? updatedTask : t
    );

    const updatedProject = {
      ...project,
      acordoTasks: updatedAcordoTasks,
      updatedAt: new Date()
    };

    onUpdateProject(updatedProject);
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedAcordoTasks = acordoTasks.filter(t => t.id !== taskId);
    const updatedProject = {
      ...project,
      acordoTasks: updatedAcordoTasks,
      updatedAt: new Date()
    };
    onUpdateProject(updatedProject);
    
    toast({
      title: "Item excluído",
      description: "Processo/Dívida removido com sucesso!",
    });
  };

  const handleAddTask = () => {
    const newTask: Task = {
      id: `acordo-${Date.now()}`,
      title: "Novo Processo/Dívida",
      description: "Clique para editar os detalhes",
      status: 'todo',
      comments: [],
      files: [],
      history: [{
        id: `history-${Date.now()}`,
        action: 'created',
        details: 'Processo/Dívida criado',
        user: project.createdBy,
        timestamp: new Date()
      }],
      type: 'acordo',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedProject = {
      ...project,
      acordoTasks: [...(project.acordoTasks || []), newTask],
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
                      <TaskCard 
                        task={task} 
                        onClick={handleTaskClick}
                        onDelete={handleDeleteTask}
                      />
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