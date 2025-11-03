import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Project, Task, ProjectSector } from '@/types/project';
import { useToast } from '@/hooks/use-toast';
import ProjectView from './ProjectView';
import SectorView from './SectorView';

const ProjectViewWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  
  const isSectorView = location.pathname.includes('/sector/');
  const sectorId = isSectorView ? location.pathname.split('/sector/')[1] : null;

  useEffect(() => {
    if (!id || !user) return;

    const fetchProject = async () => {
      try {
        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (projectError) {
          console.error('Error fetching project:', projectError);
          toast({
            title: "Erro",
            description: "Erro ao carregar projeto",
            variant: "destructive",
          });
          navigate('/projects');
          return;
        }

        // Fetch project tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', id);

        if (tasksError) {
          console.error('Error fetching tasks:', tasksError);
          toast({
            title: "Erro",
            description: "Erro ao carregar tarefas",
            variant: "destructive",
          });
        }

        // Fetch project sectors
        const { data: sectorsData, error: sectorsError } = await supabase
          .from('project_sectors')
          .select('*')
          .eq('project_id', id)
          .order('sector_order');

        if (sectorsError) {
          console.error('Error fetching sectors:', sectorsError);
        }

        // Transform data to match Project interface
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
            status: task.status as 'waiting' | 'todo' | 'progress' | 'done',
            columnId: task.column_id || undefined,
            sectorId: task.sector_id || undefined,
            comments: [],
            files: [],
            history: [],
            type: task.task_type === 'acordo' ? 'acordo' : 'regular',
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
        console.error('Error:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar projeto",
          variant: "destructive",
        });
        navigate('/projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, user, toast, navigate]);

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

      if (error) {
        console.error('Error updating project:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar projeto",
          variant: "destructive",
        });
        return;
      }

      setProject(updatedProject);
      toast({
        title: "Sucesso",
        description: "Projeto atualizado com sucesso",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar projeto",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleBack = () => {
    navigate('/projects');
  };

  const handleNavigateToAcordos = () => {
    navigate(`/project/${id}/acordos`);
  };

  const handleProjectNavigation = (path: string) => {
    navigate(`/project/${path}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Carregando projeto...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Projeto não encontrado</div>
      </div>
    );
  }

  const currentUser = {
    id: user?.id || '',
    email: user?.email || '',
    name: user?.user_metadata?.full_name || user?.email || '',
    role: 'advogado' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  if (isSectorView && sectorId) {
    const sector = project.sectors?.find(s => s.id === sectorId);
    
    if (!sector) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div>Setor não encontrado</div>
        </div>
      );
    }

    return (
      <SectorView
        onBack={handleBack}
        project={project}
        sector={sector}
        onUpdateProject={handleUpdateProject}
        currentUser={currentUser}
      />
    );
  }

  return (
    <ProjectView
      onLogout={handleLogout}
      onBack={handleBack}
      project={project}
      onUpdateProject={handleUpdateProject}
      onNavigateToAcordos={handleNavigateToAcordos}
      currentUser={currentUser}
      onProjectNavigation={handleProjectNavigation}
    />
  );
};

export default ProjectViewWrapper;