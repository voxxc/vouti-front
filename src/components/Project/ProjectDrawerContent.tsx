import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Project, Task, ProjectSector } from "@/types/project";
import { User } from "@/types/user";
import ProjectView from "@/pages/ProjectView";
import AcordosView from "@/pages/AcordosView";
import SectorView from "@/pages/SectorView";

interface ProjectDrawerContentProps {
  projectId: string;
  onClose: () => void;
}

export function ProjectDrawerContent({ projectId, onClose }: ProjectDrawerContentProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerView, setDrawerView] = useState<'main' | 'acordos' | 'sector'>('main');
  const [activeSectorId, setActiveSectorId] = useState<string | null>(null);

  // Current user object
  const currentUser: User | undefined = user ? {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.email || '',
    role: 'advogado' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  } : undefined;

  // Navigation handlers
  const handleNavigateToAcordos = () => setDrawerView('acordos');

  const handleProjectNavigation = (path: string) => {
    if (path.includes('/sector/')) {
      const sectorId = path.split('/sector/')[1];
      setActiveSectorId(sectorId);
      setDrawerView('sector');
    }
  };

  const handleBackToMain = () => {
    setDrawerView('main');
    setActiveSectorId(null);
  };

  // Load project data
  useEffect(() => {
    if (!projectId || !user) return;
    loadProject();
  }, [projectId, user]);

  // Reset view when project changes
  useEffect(() => {
    setDrawerView('main');
    setActiveSectorId(null);
  }, [projectId]);

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

      // Fetch acordo tasks
      const { data: acordoTasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('task_type', 'acordo');

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
        acordoTasks: (acordoTasksData || []).map((task): Task => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          status: task.status as Task['status'],
          columnId: task.column_id || undefined,
          sectorId: task.sector_id || undefined,
          comments: [],
          files: [],
          history: [],
          type: 'acordo' as const,
          acordoDetails: (task.acordo_details && typeof task.acordo_details === 'object') ? task.acordo_details as any : {},
          cardColor: (task.card_color as Task['cardColor']) || 'default',
          createdAt: new Date(task.created_at),
          updatedAt: new Date(task.updated_at)
        })),
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

  // Acordos view
  if (drawerView === 'acordos') {
    return (
      <div className="flex-1 h-full overflow-auto">
        <div className="container max-w-7xl mx-auto px-6 py-8">
          <AcordosView
            project={project}
            onUpdateProject={handleUpdateProject}
            onBack={handleBackToMain}
            onLogout={() => {}}
          />
        </div>
      </div>
    );
  }

  // Sector view
  if (drawerView === 'sector' && activeSectorId) {
    const sector = project.sectors?.find(s => s.id === activeSectorId);
    if (!sector) {
      handleBackToMain();
      return null;
    }
    return (
      <div className="flex-1 h-full overflow-auto">
        <div className="container max-w-7xl mx-auto px-6 py-8">
          <SectorView
            onBack={handleBackToMain}
            project={project}
            sector={sector}
            onUpdateProject={handleUpdateProject}
            currentUser={currentUser}
          />
        </div>
      </div>
    );
  }

  // Main project view
  return (
    <div className="flex-1 h-full overflow-auto">
      <div className="container max-w-7xl mx-auto px-6 py-8">
        <ProjectView
          onLogout={() => {}}
          onBack={onClose}
          project={project}
          onUpdateProject={handleUpdateProject}
          onNavigateToAcordos={handleNavigateToAcordos}
          onProjectNavigation={handleProjectNavigation}
          currentUser={currentUser}
          users={[]}
          embedded={true}
        />
      </div>
    </div>
  );
}
