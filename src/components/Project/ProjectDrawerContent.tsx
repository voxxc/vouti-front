import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Project, Task, ProjectSector } from "@/types/project";
import { User } from "@/types/user";
import ProjectView from "@/pages/ProjectView";

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

  // Current user object
  const currentUser: User | undefined = user ? {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.email || '',
    role: 'advogado' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  } : undefined;

  // Load project data
  useEffect(() => {
    if (!projectId || !user) return;
    loadProject();
  }, [projectId, user]);

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

  return (
    <div className="flex flex-col h-full overflow-auto">
      <ProjectView
        onLogout={() => {}}
        onBack={onClose}
        project={project}
        onUpdateProject={handleUpdateProject}
        currentUser={currentUser}
        users={[]}
        embedded={true}
      />
    </div>
  );
}
