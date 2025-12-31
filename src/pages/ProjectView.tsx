import { useState, useEffect } from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Plus, Users, Lock, LockOpen, FileText, History } from "lucide-react";
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
import { ProjectClientDataDialog } from "@/components/Project/ProjectClientDataDialog";
import ProjectHistoryDrawer from "@/components/Project/ProjectHistoryDrawer";
import { User } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { notifyTaskMovement, notifyTaskCreated } from "@/utils/notificationHelpers";
import { supabase } from "@/integrations/supabase/client";
import { calculateProjectProgress } from "@/utils/projectHelpers";
import { Progress } from "@/components/ui/progress";

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
  const [selectedColumnName, setSelectedColumnName] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isClientDataOpen, setIsClientDataOpen] = useState(false);
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [isColumnsLocked, setIsColumnsLocked] = useState(true);
  const [sectors, setSectors] = useState<ProjectSector[]>([]);
  const [isCreateSectorOpen, setIsCreateSectorOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { toast } = useToast();

  // Verificar se usuário é admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!currentUser?.id) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [currentUser?.id]);

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

    const sourceColumn = columns.find(c => c.id === source.droppableId);
    const destColumn = columns.find(c => c.id === destination.droppableId);

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

      // Registrar movimento no histórico
      if (currentUser && sourceColumn && destColumn) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', currentUser.id)
          .single();

        await supabase
          .from('task_history')
          .insert({
            task_id: draggableId,
            project_id: project.id,
            task_title: task.title,
            user_id: currentUser.id,
            action: 'moved',
            details: `Movido de "${sourceColumn.name}" para "${destColumn.name}"`,
            tenant_id: profileData?.tenant_id
          });

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

  const handleTaskClick = (task: Task, columnName: string) => {
    setSelectedTask(task);
    setSelectedColumnName(columnName);
    setIsModalOpen(true);
  };

  // Função para apenas atualizar estado local sem registrar histórico
  // Usada quando o modal carrega dados (comentários, arquivos, histórico)
  const handleRefreshTask = (updatedTask: Task) => {
    const updatedTasks = project.tasks.map(t =>
      t.id === updatedTask.id ? updatedTask : t
    );

    const updatedProject = {
      ...project,
      tasks: updatedTasks,
      updatedAt: new Date()
    };

    setSelectedTask(updatedTask);
    onUpdateProject(updatedProject);
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

      // Verificar se houve mudança real no conteúdo para registrar no histórico
      const originalTask = project.tasks.find(t => t.id === updatedTask.id);
      const hasRealChange = originalTask && (
        originalTask.title !== updatedTask.title ||
        originalTask.description !== updatedTask.description ||
        originalTask.cardColor !== updatedTask.cardColor
      );

      // Só registrar edição no histórico se houve mudança real
      if (currentUser && hasRealChange) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', currentUser.id)
          .single();

        await supabase
          .from('task_history')
          .insert({
            task_id: updatedTask.id,
            project_id: project.id,
            task_title: updatedTask.title,
            user_id: currentUser.id,
            action: 'edited',
            details: `Card editado: "${updatedTask.title}"`,
            tenant_id: profileData?.tenant_id
          });
      }

      const updatedTasks = project.tasks.map(t =>
        t.id === updatedTask.id ? updatedTask : t
      );

      const updatedProject = {
        ...project,
        tasks: updatedTasks,
        updatedAt: new Date()
      };

      // Atualizar selectedTask para refletir mudancas imediatamente no modal
      setSelectedTask(updatedTask);

      onUpdateProject(updatedProject);

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
      // Buscar info do card antes de deletar para registrar no histórico
      const taskToDelete = project.tasks.find(t => t.id === taskId);

      // Registrar exclusão no histórico ANTES de deletar
      if (currentUser && taskToDelete) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', currentUser.id)
          .single();

        await supabase
          .from('task_history')
          .insert({
            task_id: taskId,
            project_id: project.id,
            task_title: taskToDelete.title,
            user_id: currentUser.id,
            action: 'deleted',
            details: `Card excluído: "${taskToDelete.title}"`,
            tenant_id: profileData?.tenant_id
          });
      }

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
      // Buscar tenant_id do usuario atual
      const { data: profileData } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', currentUser.id)
        .single();

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: "Nova Tarefa",
          description: "Clique para editar a descrição",
          status: 'todo',
          column_id: columnId,
          project_id: project.id,
          task_type: 'regular',
          tenant_id: profileData?.tenant_id
        })
        .select()
        .single();

      if (error) throw error;

      // Buscar nome da coluna para registrar no histórico
      const columnName = columns.find(c => c.id === columnId)?.name || 'Coluna desconhecida';

      // Registrar criação no histórico
      await supabase
        .from('task_history')
        .insert({
          task_id: data.id,
          project_id: project.id,
          task_title: data.title,
          user_id: currentUser.id,
          action: 'created',
          details: `Card criado: "${data.title}" na coluna "${columnName}"`,
          tenant_id: profileData?.tenant_id
        });

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
          currentUser.name,
          project.name
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

      // 1. Verificar se usuário é admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      const isAdmin = !!adminRole;

      // 2. Criar ou buscar template
      let templateId: string;
      
      const { data: existingTemplate } = await supabase
        .from('sector_templates')
        .select('id')
        .eq('name', name)
        .eq('created_by', user.id)
        .maybeSingle();
      
      if (existingTemplate) {
        templateId = existingTemplate.id;
      } else {
        const { data: newTemplate, error: templateError } = await supabase
          .from('sector_templates')
          .insert({
            name,
            description,
            created_by: user.id
          })
          .select()
          .single();
        
        if (templateError) throw templateError;
        templateId = newTemplate.id;
      }
      
      // 3. Buscar projetos alvo
      let targetProjectIds: string[] = [];
      
      if (isAdmin) {
        // Admin: todos os projetos
        const { data: allProjects, error: projectsError } = await supabase
          .from('projects')
          .select('id');
        
        if (projectsError) throw projectsError;
        targetProjectIds = allProjects?.map(p => p.id) || [];
      } else {
        // Não-admin: projetos onde é owner ou colaborador
        const { data: ownedProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('created_by', user.id);
        
        const { data: collaboratorProjects } = await supabase
          .from('project_collaborators')
          .select('project_id')
          .eq('user_id', user.id);
        
        const ownedIds = ownedProjects?.map(p => p.id) || [];
        const collabIds = collaboratorProjects?.map(p => p.project_id) || [];
        targetProjectIds = [...new Set([...ownedIds, ...collabIds])];
      }

      // Garantir que o projeto atual está incluído
      if (!targetProjectIds.includes(project.id)) {
        targetProjectIds.push(project.id);
      }

      // 4. Verificar quais projetos já possuem esse template
      const { data: existingSectors } = await supabase
        .from('project_sectors')
        .select('project_id')
        .eq('template_id', templateId)
        .in('project_id', targetProjectIds);
      
      const existingProjectIds = existingSectors?.map(s => s.project_id) || [];
      const projectsToCreate = targetProjectIds.filter(id => !existingProjectIds.includes(id));

      if (projectsToCreate.length === 0) {
        toast({
          title: "Setor já existe",
          description: "Este setor já foi criado em todos os projetos.",
        });
        setIsCreateSectorOpen(false);
        return;
      }

      // 5. Criar setores nos projetos que ainda não têm
      const sectorsToCreate = projectsToCreate.map((projId, idx) => ({
        project_id: projId,
        template_id: templateId,
        name,
        description,
        sector_order: 999 + idx,
        is_default: false,
        created_by: user.id
      }));
      
      const { data: newSectors, error: sectorsError } = await supabase
        .from('project_sectors')
        .insert(sectorsToCreate)
        .select();
      
      if (sectorsError) throw sectorsError;
      
      // 6. Criar colunas padrão para cada setor criado
      const columnsToCreate = newSectors.flatMap(sector => [
        {
          project_id: sector.project_id,
          sector_id: sector.id,
          name: 'Em Espera',
          column_order: 0,
          color: '#eab308',
          is_default: true
        },
        {
          project_id: sector.project_id,
          sector_id: sector.id,
          name: 'A Fazer',
          column_order: 1,
          color: '#3b82f6',
          is_default: true
        },
        {
          project_id: sector.project_id,
          sector_id: sector.id,
          name: 'Andamento',
          column_order: 2,
          color: '#f97316',
          is_default: true
        },
        {
          project_id: sector.project_id,
          sector_id: sector.id,
          name: 'Concluído',
          column_order: 3,
          color: '#22c55e',
          is_default: true
        }
      ]);
      
      const { error: columnsError } = await supabase
        .from('project_columns')
        .insert(columnsToCreate);
      
      if (columnsError) throw columnsError;
      
      // 7. Recarregar setores do projeto atual
      await loadSectors();
      
      // 8. Navegar para o setor criado no projeto atual
      const currentProjectSector = newSectors.find(s => s.project_id === project.id);
      if (currentProjectSector) {
        handleNavigateToSector(currentProjectSector.id);
      }
      
      toast({
        title: "Setor criado!",
        description: `"${name}" foi criado em ${projectsToCreate.length} projeto(s).`,
      });
      
      setIsCreateSectorOpen(false);
    } catch (error) {
      console.error('Error creating sector:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar setor.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSector = async (sectorId: string) => {
    try {
      // Buscar template_id do setor
      const { data: sector } = await supabase
        .from('project_sectors')
        .select('template_id, name')
        .eq('id', sectorId)
        .single();
      
      if (!sector) {
        throw new Error('Setor não encontrado');
      }

      // Tentar deletar globalmente (via template)
      if (sector.template_id) {
        const { error: templateError } = await supabase
          .from('sector_templates')
          .delete()
          .eq('id', sector.template_id);
        
        if (!templateError) {
          // Sucesso: template deletado, CASCADE removeu todos os setores
          await loadSectors();
          
          toast({
            title: "Setor excluído globalmente",
            description: `"${sector.name}" foi removido de todos os projetos.`,
          });
          return;
        }
        
        // Se falhou (RLS), fazer fallback para deletar só do projeto atual
        console.log('Failed to delete template, falling back to single project deletion:', templateError);
      }
      
      // Fallback: deletar apenas do projeto atual
      // 1. Deletar tarefas do setor
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('sector_id', sectorId);
      
      if (tasksError) throw tasksError;
      
      // 2. Deletar colunas do setor
      const { error: columnsError } = await supabase
        .from('project_columns')
        .delete()
        .eq('sector_id', sectorId);
      
      if (columnsError) throw columnsError;
      
      // 3. Deletar o setor
      const { error: sectorError } = await supabase
        .from('project_sectors')
        .delete()
        .eq('id', sectorId);
      
      if (sectorError) throw sectorError;
      
      await loadSectors();
      
      toast({
        title: "Setor excluído",
        description: `"${sector.name}" foi removido deste projeto.`,
      });
    } catch (error) {
      console.error('Error deleting sector:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir setor.",
        variant: "destructive",
      });
    }
  };

  const handleNavigateToSector = (sectorId: string) => {
    if (onProjectNavigation) {
      onProjectNavigation(`${project.id}/sector/${sectorId}`);
    }
  };

  // Calcular progresso do projeto
  const projectProgress = calculateProjectProgress(project.tasks, columns);

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
            <div className="flex-1">
              <EditableProjectName 
                projectName={project.name}
                onUpdateName={handleUpdateProjectName}
              />
              <p className="text-muted-foreground">{project.client}</p>
              <div className="flex items-center gap-3 mt-2">
                <Progress value={projectProgress} className="w-48 h-2" />
                <span className="text-sm font-medium text-foreground">{projectProgress}% completo</span>
              </div>
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

            {isAdmin && (
              <Button 
                variant="outline" 
                onClick={() => setIsClientDataOpen(true)}
                className="gap-2"
              >
                <FileText size={16} />
                Dados
              </Button>
            )}

            {isAdmin && (
              <Button 
                variant="outline" 
                onClick={() => setIsHistoryOpen(true)}
                className="gap-2"
              >
                <History size={16} />
                Histórico
              </Button>
            )}
            
            <SetoresDropdown
              sectors={sectors}
              projectId={project.id}
              onNavigateToSector={handleNavigateToSector}
              onNavigateToAcordos={onNavigateToAcordos || (() => {})}
              onCreateSector={() => setIsCreateSectorOpen(true)}
              onDeleteSector={handleDeleteSector}
            />
            
              <Button 
                variant={isColumnsLocked ? "default" : "outline"}
                onClick={() => setIsColumnsLocked(!isColumnsLocked)}
                size="icon"
                className="rounded-full h-9 w-9"
                title={isColumnsLocked ? "Desbloquear colunas" : "Bloquear colunas"}
              >
                {isColumnsLocked ? <Lock size={18} /> : <LockOpen size={18} />}
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
                  className="flex gap-3 pb-4"
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
                                          onClick={(t) => handleTaskClick(t, column.name)}
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
          onRefreshTask={handleRefreshTask}
          currentUser={currentUser}
          projectId={project.id}
          columnName={selectedColumnName}
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

        <ProjectClientDataDialog
          open={isClientDataOpen}
          onOpenChange={setIsClientDataOpen}
          projectId={project.id}
          clienteId={project.clienteId}
          onClienteLinked={(clienteId) => {
            onUpdateProject({
              ...project,
              clienteId
            });
          }}
        />

        <ProjectHistoryDrawer
          projectId={project.id}
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
};

export default ProjectView;