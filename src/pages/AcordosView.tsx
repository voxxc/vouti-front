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
import { Project, Task } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { useTenantId } from "@/hooks/useTenantId";
import { supabase } from "@/integrations/supabase/client";

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
  const [selectedColumnName, setSelectedColumnName] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const { tenantId } = useTenantId();
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

  const handleDragEnd = async (result: DropResult) => {
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

    try {
      // Update task status in Supabase
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: destination.droppableId === 'acordos-feitos' ? 'done' : 'todo',
          updated_at: new Date().toISOString()
        })
        .eq('id', draggableId);

      if (error) throw error;

      // Nomes das colunas para o histórico
      const sourceColumnName = source.droppableId === 'acordos-feitos' ? 'Acordos Feitos' : 'Processos/Dívidas';
      const destColumnName = destination.droppableId === 'acordos-feitos' ? 'Acordos Feitos' : 'Processos/Dívidas';

      // Registrar movimentação no histórico
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('task_history')
          .insert({
            task_id: task.id,
            project_id: project.id,
            task_title: task.title,
            user_id: user.id,
            action: 'moved',
            details: `Card "${task.title}" movido de "${sourceColumnName}" para "${destColumnName}"`,
            tenant_id: tenantId
          });
      }

      const updatedTask = {
        ...task,
        status: (destination.droppableId === 'acordos-feitos' ? 'done' : 'todo') as Task['status'],
        updatedAt: new Date(),
        history: [
          ...task.history,
          {
            id: `history-${Date.now()}`,
            action: 'moved' as const,
            details: `Tarefa movida para ${destColumnName}`,
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
    } catch (error) {
      console.error('Error updating acordo task:', error);
      toast({
        title: "Erro",
        description: "Erro ao mover item.",
        variant: "destructive",
      });
    }
  };

  const handleTaskClick = (task: Task, columnName: string) => {
    setSelectedTask(task);
    setSelectedColumnName(columnName);
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
          acordo_details: updatedTask.type === 'acordo' ? (updatedTask.acordoDetails as any) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedTask.id);

      if (error) throw error;

      // Registrar edição no histórico
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('task_history')
          .insert({
            task_id: updatedTask.id,
            project_id: project.id,
            task_title: updatedTask.title,
            user_id: user.id,
            action: 'edited',
            details: `Card editado: "${updatedTask.title}" (Acordos)`,
            tenant_id: tenantId
          });
      }

      const updatedAcordoTasks = acordoTasks.map(t =>
        t.id === updatedTask.id ? updatedTask : t
      );

      const updatedProject = {
        ...project,
        acordoTasks: updatedAcordoTasks,
        updatedAt: new Date()
      };

      onUpdateProject(updatedProject);

      toast({
        title: "Sucesso",
        description: "Item atualizado com sucesso!",
      });
    } catch (error) {
      console.error('Error updating acordo task:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar item.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      // Buscar dados da tarefa ANTES de deletar para manter no histórico
      const taskToDelete = acordoTasks.find(t => t.id === taskId);
      const taskTitle = taskToDelete?.title || 'Item desconhecido';

      // Registrar exclusão no histórico ANTES de deletar
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('task_history')
          .insert({
            task_id: taskId,
            project_id: project.id,
            task_title: taskTitle,
            user_id: user.id,
            action: 'deleted',
            details: `Card excluído: "${taskTitle}" (Acordos)`,
            tenant_id: tenantId
          });
      }

      // Delete task from Supabase
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

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
    } catch (error) {
      console.error('Error deleting acordo task:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir item.",
        variant: "destructive",
      });
    }
  };

  const handleAddTask = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: "Novo Processo/Dívida",
          description: "Clique para editar os detalhes",
          status: 'todo',
          project_id: project.id,
          task_type: 'acordo',
          acordo_details: {},
          tenant_id: tenantId
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar criação no histórico
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('task_history')
          .insert({
            task_id: data.id,
            project_id: project.id,
            task_title: data.title,
            user_id: user.id,
            action: 'created',
            details: `Card criado: "${data.title}" na coluna "Processos/Dívidas" (Acordos)`,
            tenant_id: tenantId
          });
      }

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
          details: 'Processo/Dívida criado',
          user: project.createdBy,
          timestamp: new Date()
        }],
        type: 'acordo',
        acordoDetails: {},
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
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
    } catch (error) {
      console.error('Error creating acordo task:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar item.",
        variant: "destructive",
      });
    }
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
          <Button 
            variant="outline" 
            onClick={() => setIsParticipantsOpen(true)}
            className="gap-2"
          >
            <Users size={16} />
            Participantes
          </Button>
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

        {/* Two Columns for Acordos */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <KanbanColumn
              id="processos-dividas"
              title="Processos/Dívidas"
              taskCount={filteredTasks.filter(task => task.status !== 'done').length}
              onAddTask={handleAddTask}
              fullWidth
            >
              {filteredTasks
                .filter(task => task.status !== 'done')
                .map((task, index) => (
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
                        onClick={(t) => handleTaskClick(t, 'Processos/Dívidas')}
                        onDelete={handleDeleteTask}
                        onUpdateTask={handleUpdateTask}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
            </KanbanColumn>

            <KanbanColumn
              id="acordos-feitos"
              title="Acordos Feitos"
              taskCount={filteredTasks.filter(task => task.status === 'done').length}
              onAddTask={() => {}}
              fullWidth
            >
              {filteredTasks
                .filter(task => task.status === 'done')
                .map((task, index) => (
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
                        onClick={(t) => handleTaskClick(t, 'Acordos Feitos')}
                        onDelete={handleDeleteTask}
                        onUpdateTask={handleUpdateTask}
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
          columnName={selectedColumnName}
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

export default AcordosView;