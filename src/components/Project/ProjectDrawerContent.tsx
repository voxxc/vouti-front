import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FolderOpen, 
  Users, 
  Lock, 
  LockOpen, 
  FileText, 
  Layers,
  Columns3,
  History
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useProjectWorkspaces } from "@/hooks/useProjectWorkspaces";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { Project, Task, ProjectSector, KanbanColumn as KanbanColumnType } from "@/types/project";
import { User } from "@/types/user";
import { checkIfUserIsAdmin } from "@/lib/auth-helpers";

// Project components
import { ProjectWorkspaceTabs } from "./ProjectWorkspaceTabs";
import { ProjectProtocolosList } from "./ProjectProtocolosList";
import { ProjectProcessos } from "./ProjectProcessos";
import EditableProjectName from "./EditableProjectName";
import ProjectParticipants from "./ProjectParticipants";
import CreateSectorDialog from "./CreateSectorDialog";
import KanbanColumn from "./KanbanColumn";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import { ProjectClientDataDialog } from "./ProjectClientDataDialog";
import ProjectHistoryDrawer from "./ProjectHistoryDrawer";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { notifyTaskMovement } from "@/utils/notificationHelpers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Layers as LayersIcon, Plus, ChevronDown } from "lucide-react";

interface ProjectDrawerContentProps {
  projectId: string;
  onClose: () => void;
}

export function ProjectDrawerContent({ projectId, onClose }: ProjectDrawerContentProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { navigate } = useTenantNavigation();
  
  // State
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [sectors, setSectors] = useState<ProjectSector[]>([]);
  const [isColumnsLocked, setIsColumnsLocked] = useState(true);
  const [activeTab, setActiveTab] = useState<'protocolos' | 'processos' | 'colunas'>('protocolos');
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isCreateSectorOpen, setIsCreateSectorOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedColumnName, setSelectedColumnName] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Admin states
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClientDataOpen, setIsClientDataOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Workspaces hook
  const {
    workspaces,
    loading: workspacesLoading,
    activeWorkspaceId,
    defaultWorkspaceId,
    setActiveWorkspaceId,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace
  } = useProjectWorkspaces(projectId, project?.name || '');

  // Current user object
  const currentUser: User | undefined = user ? {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.email || '',
    role: 'advogado' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  } : undefined;

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.id) return;
      const isUserAdmin = await checkIfUserIsAdmin(user.id);
      setIsAdmin(isUserAdmin);
    };
    checkAdmin();
  }, [user?.id]);

  // Load project data
  useEffect(() => {
    if (!projectId || !user) return;
    loadProject();
  }, [projectId, user]);

  // Load columns when workspace changes
  useEffect(() => {
    if (activeWorkspaceId && project) {
      loadColumns();
    }
  }, [activeWorkspaceId, project?.id]);

  const loadProject = async () => {
    setLoading(true);
    try {
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId);

      // Fetch sectors
      const { data: sectorsData } = await supabase
        .from('project_sectors')
        .select('*')
        .eq('project_id', projectId)
        .order('sector_order');

      // Transform data
      const transformedProject: Project = {
        id: projectData.id,
        name: projectData.name,
        client: projectData.client,
        clienteId: projectData.cliente_id,
        description: projectData.description || '',
        tasks: (tasksData || []).map((task): Task => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          status: task.status as Task['status'],
          columnId: task.column_id || undefined,
          sectorId: task.sector_id || undefined,
          comments: [],
          files: [],
          history: [],
          type: task.task_type === 'acordo' ? 'acordo' : 'regular',
          cardColor: (task.card_color as Task['cardColor']) || 'default',
          createdAt: new Date(task.created_at),
          updatedAt: new Date(task.updated_at)
        })),
        acordoTasks: [],
        sectors: (sectorsData || []).map((sector): ProjectSector => ({
          id: sector.id,
          projectId: sector.project_id,
          name: sector.name,
          description: sector.description,
          sectorOrder: sector.sector_order,
          isDefault: sector.is_default,
          createdBy: sector.created_by,
          createdAt: new Date(sector.created_at),
          updatedAt: new Date(sector.updated_at)
        })),
        createdBy: projectData.created_by,
        createdAt: new Date(projectData.created_at),
        updatedAt: new Date(projectData.updated_at)
      };

      setProject(transformedProject);
      setSectors(transformedProject.sectors || []);
    } catch (error) {
      console.error('Error loading project:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar projeto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadColumns = async () => {
    if (!project) return;
    try {
      let query = supabase
        .from('project_columns')
        .select('*')
        .eq('project_id', project.id)
        .is('sector_id', null);

      if (activeWorkspaceId) {
        query = query.eq('workspace_id', activeWorkspaceId);
      } else {
        query = query.is('workspace_id', null);
      }

      const { data, error } = await query.order('column_order');
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

  const handleUpdateProject = async (updatedProject: Project) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: updatedProject.name,
          client: updatedProject.client,
          cliente_id: updatedProject.clienteId,
          description: updatedProject.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedProject.id);

      if (error) throw error;
      setProject(updatedProject);
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar projeto",
        variant: "destructive",
      });
    }
  };

  const handleClienteLinked = (clienteId: string | null) => {
    if (project) {
      setProject({ ...project, clienteId });
    }
  };

  const handleSectorClick = (sectorId: string) => {
    navigate(`/project/${projectId}/sector/${sectorId}`);
    onClose();
  };

  const handleSectorCreate = async (name: string, description: string) => {
    if (!currentUser || !project) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', currentUser.id)
        .single();

      const maxOrder = sectors.length > 0 
        ? Math.max(...sectors.map(s => s.sectorOrder)) 
        : 0;

      const { data, error } = await supabase
        .from('project_sectors')
        .insert({
          project_id: project.id,
          name,
          description,
          sector_order: maxOrder + 1,
          created_by: currentUser.id,
          tenant_id: profileData?.tenant_id
        })
        .select()
        .single();

      if (error) throw error;

      const newSector: ProjectSector = {
        id: data.id,
        projectId: data.project_id,
        name: data.name,
        description: data.description,
        sectorOrder: data.sector_order,
        isDefault: data.is_default,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      setSectors([...sectors, newSector]);
      setIsCreateSectorOpen(false);

      toast({
        title: "Setor criado",
        description: `Setor "${name}" foi criado com sucesso`,
      });
    } catch (error) {
      console.error('Error creating sector:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar setor",
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Projeto não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <EditableProjectName
              projectName={project.name}
              onUpdateName={(newName) => handleUpdateProject({ ...project, name: newName })}
            />
            <p className="text-sm text-muted-foreground truncate">{project.client}</p>
          </div>
        </div>
        {/* Admin buttons */}
        {isAdmin && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsClientDataOpen(true)}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden lg:inline">Dados</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              <span className="hidden lg:inline">Histórico</span>
            </Button>
          </div>
        )}
      </div>

      {/* Workspace Tabs */}
      {!workspacesLoading && (
        <div className="border-b">
          <ProjectWorkspaceTabs
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSelectWorkspace={setActiveWorkspaceId}
            onCreateWorkspace={createWorkspace}
            onUpdateWorkspace={updateWorkspace}
            onDeleteWorkspace={deleteWorkspace}
          />
        </div>
      )}

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <TabsList className="h-9">
            <TabsTrigger value="protocolos" className="gap-2 text-sm">
              <FileText className="h-4 w-4" />
              Processos
            </TabsTrigger>
            <TabsTrigger value="processos" className="gap-2 text-sm">
              <Layers className="h-4 w-4" />
              Casos
            </TabsTrigger>
            <TabsTrigger value="colunas" className="gap-2 text-sm">
              <Columns3 className="h-4 w-4" />
              Colunas
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsParticipantsOpen(true)}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden lg:inline">Participantes</span>
            </Button>
            {activeTab === 'colunas' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsColumnsLocked(!isColumnsLocked)}
                className="gap-2"
              >
                {isColumnsLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
              </Button>
            )}
            {/* Setores Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <LayersIcon className="h-4 w-4" />
                  <span className="hidden lg:inline">Setores</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {sectors.filter(s => !s.isDefault || s.name !== 'Acordos').map((sector) => (
                  <DropdownMenuItem
                    key={sector.id}
                    onClick={() => handleSectorClick(sector.id)}
                  >
                    {sector.name}
                  </DropdownMenuItem>
                ))}
                {sectors.filter(s => !s.isDefault || s.name !== 'Acordos').length === 0 && (
                  <DropdownMenuItem disabled>
                    Nenhum setor criado
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsCreateSectorOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Setor
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <TabsContent value="protocolos" className="h-full m-0 p-4">
            <ProjectProtocolosList
              projectId={project.id}
              workspaceId={activeWorkspaceId}
              defaultWorkspaceId={defaultWorkspaceId}
            />
          </TabsContent>

          <TabsContent value="processos" className="h-full m-0 p-4">
            <ProjectProcessos
              projectId={project.id}
              workspaceId={activeWorkspaceId}
              defaultWorkspaceId={defaultWorkspaceId}
            />
          </TabsContent>

          <TabsContent value="colunas" className="h-full m-0 p-4">
            <KanbanView
              project={project}
              columns={columns}
              isColumnsLocked={isColumnsLocked}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              currentUser={currentUser}
              activeWorkspaceId={activeWorkspaceId}
              onColumnsChange={setColumns}
              onProjectUpdate={handleUpdateProject}
              onTaskClick={(task, columnName) => {
                setSelectedTask(task);
                setSelectedColumnName(columnName);
                setIsModalOpen(true);
              }}
              loadColumns={loadColumns}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Modals */}
      <ProjectParticipants
        projectId={project.id}
        projectName={project.name}
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
      />

      <CreateSectorDialog
        isOpen={isCreateSectorOpen}
        onClose={() => setIsCreateSectorOpen(false)}
        onCreateSector={handleSectorCreate}
      />

      {selectedTask && (
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          columnName={selectedColumnName}
          onUpdateTask={async (updatedTask) => {
            const updatedTasks = project.tasks.map(t =>
              t.id === updatedTask.id ? updatedTask : t
            );
            handleUpdateProject({ ...project, tasks: updatedTasks });
            setSelectedTask(updatedTask);
          }}
          currentUser={currentUser}
          projectId={project.id}
        />
      )}

      {/* Admin Dialogs */}
      {isAdmin && (
        <ProjectClientDataDialog
          open={isClientDataOpen}
          onOpenChange={setIsClientDataOpen}
          projectId={project.id}
          clienteId={project.clienteId}
          onClienteLinked={handleClienteLinked}
        />
      )}

      {isAdmin && (
        <ProjectHistoryDrawer
          projectId={project.id}
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}
    </div>
  );
}

// Kanban view component (simplified for drawer)
interface KanbanViewProps {
  project: Project;
  columns: KanbanColumnType[];
  isColumnsLocked: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentUser?: User;
  activeWorkspaceId: string | null;
  onColumnsChange: (columns: KanbanColumnType[]) => void;
  onProjectUpdate: (project: Project) => void;
  onTaskClick: (task: Task, columnName: string) => void;
  loadColumns: () => void;
}

function KanbanView({
  project,
  columns,
  isColumnsLocked,
  searchTerm,
  currentUser,
  activeWorkspaceId,
  onColumnsChange,
  onProjectUpdate,
  onTaskClick,
  loadColumns
}: KanbanViewProps) {
  const { toast } = useToast();

  const regularTasks = project.tasks.filter(task => task.type !== 'acordo' && !task.sectorId);
  
  const filteredTasks = regularTasks.filter(task => {
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
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'COLUMN') {
      const reorderedColumns = Array.from(columns);
      const [movedColumn] = reorderedColumns.splice(source.index, 1);
      reorderedColumns.splice(destination.index, 0, movedColumn);

      const updatedColumns = reorderedColumns.map((col, index) => ({
        ...col,
        columnOrder: index
      }));

      onColumnsChange(updatedColumns);

      try {
        for (const col of updatedColumns) {
          await supabase
            .from('project_columns')
            .update({ column_order: col.columnOrder })
            .eq('id', col.id);
        }
      } catch (error) {
        console.error('Error updating column order:', error);
        loadColumns();
      }
      return;
    }

    const task = project.tasks.find(t => t.id === draggableId);
    if (!task) return;

    const sourceColumn = columns.find(c => c.id === source.droppableId);
    const destColumn = columns.find(c => c.id === destination.droppableId);

    try {
      await supabase
        .from('tasks')
        .update({ 
          column_id: destination.droppableId,
          updated_at: new Date().toISOString()
        })
        .eq('id', draggableId);

      const updatedTask = { ...task, columnId: destination.droppableId, updatedAt: new Date() };
      const updatedTasks = project.tasks.map(t => t.id === draggableId ? updatedTask : t);
      onProjectUpdate({ ...project, tasks: updatedTasks, updatedAt: new Date() });

      if (currentUser && sourceColumn && destColumn) {
        await notifyTaskMovement(project.id, task.title, sourceColumn.name, destColumn.name, currentUser.name);
      }

      toast({
        title: "Tarefa movida",
        description: `"${task.title}" foi movida para ${destColumn?.name}`,
      });
    } catch (error) {
      console.error('Error moving task:', error);
      toast({ title: "Erro", description: "Erro ao mover tarefa.", variant: "destructive" });
    }
  };

  const handleAddTask = async (columnId: string) => {
    if (!currentUser) return;

    try {
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
          workspace_id: activeWorkspaceId || null,
          task_type: 'regular',
          tenant_id: profileData?.tenant_id
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
        type: 'regular',
        cardColor: 'default',
        comments: [],
        files: [],
        history: [],
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      onProjectUpdate({
        ...project,
        tasks: [...project.tasks, newTask],
        updatedAt: new Date()
      });

      toast({ title: "Tarefa criada", description: "Nova tarefa adicionada!" });
    } catch (error) {
      console.error('Error adding task:', error);
      toast({ title: "Erro", description: "Erro ao criar tarefa.", variant: "destructive" });
    }
  };

  if (columns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Columns3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma coluna criada neste workspace</p>
        <p className="text-sm mt-2">Abra o projeto completo para criar colunas</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="columns" type="COLUMN" direction="horizontal">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex gap-4 pb-4 min-w-max"
          >
            {columns.map((column, index) => {
              const columnTasks = getTasksByColumn(column.id);
              return (
                <Draggable
                  key={column.id}
                  draggableId={column.id}
                  index={index}
                  isDragDisabled={isColumnsLocked}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={cn(
                        "w-64 flex-shrink-0",
                        snapshot.isDragging && "opacity-75"
                      )}
                    >
                      <KanbanColumn
                        id={column.id}
                        title={column.name}
                        taskCount={columnTasks.length}
                        color={column.color}
                        isDefault={column.isDefault}
                        onAddTask={() => handleAddTask(column.id)}
                        isColumnsLocked={isColumnsLocked}
                      >
                        {columnTasks.map((task, taskIndex) => (
                          <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                            {(taskProvided) => (
                              <div
                                ref={taskProvided.innerRef}
                                {...taskProvided.draggableProps}
                                {...taskProvided.dragHandleProps}
                              >
                                <TaskCard
                                  task={task}
                                  onClick={() => onTaskClick(task, column.name)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </KanbanColumn>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
