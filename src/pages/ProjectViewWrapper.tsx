import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { Project, Task, ProjectSector } from '@/types/project';
import { useToast } from '@/hooks/use-toast';
import ProjectView from './ProjectView';
import SectorView from './SectorView';

const ProjectViewWrapper = () => {
  const { id } = useParams();
  const { navigate } = useTenantNavigation();
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
          navigate('projects');
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

        // Fetch comments, files, and history for each task
        const tasksWithData = await Promise.all((tasksData || []).map(async (task) => {
          // Fetch comments
          const { data: comments } = await supabase
            .from('task_comments')
            .select('*')
            .eq('task_id', task.id)
            .order('created_at', { ascending: true });

          // Buscar perfis dos autores dos comentários
          const commentUserIds = [...new Set((comments || []).map(c => c.user_id))];
          const { data: commentProfiles } = commentUserIds.length > 0 ? await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', commentUserIds) : { data: [] };
          const commentProfileMap = new Map((commentProfiles || []).map(p => [p.user_id, p.full_name]));

          // Fetch files
          const { data: files } = await supabase
            .from('task_files')
            .select('*')
            .eq('task_id', task.id)
            .order('created_at', { ascending: true });

          // Buscar perfis dos uploaders
          const fileUserIds = [...new Set((files || []).map(f => f.uploaded_by))];
          const { data: fileProfiles } = fileUserIds.length > 0 ? await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', fileUserIds) : { data: [] };
          const fileProfileMap = new Map((fileProfiles || []).map(p => [p.user_id, p.full_name]));

          // Fetch history
          const { data: history } = await supabase
            .from('task_history')
            .select('*')
            .eq('task_id', task.id)
            .order('created_at', { ascending: false });

          // Buscar perfis dos usuários do histórico
          const historyUserIds = [...new Set((history || []).map(h => h.user_id).filter(Boolean))];
          const { data: historyProfiles } = historyUserIds.length > 0 ? await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', historyUserIds) : { data: [] };
          const historyProfileMap = new Map((historyProfiles || []).map(p => [p.user_id, p.full_name]));

          return {
            ...task,
            comments: (comments || []).map(c => ({
              id: c.id,
              text: c.comment_text,
              author: commentProfileMap.get(c.user_id) || 'Usuario',
              createdAt: new Date(c.created_at),
              updatedAt: new Date(c.updated_at)
            })),
            files: (files || []).map(f => ({
              id: f.id,
              name: f.file_name,
              url: supabase.storage.from('task-attachments').getPublicUrl(f.file_path).data.publicUrl,
              size: f.file_size,
              type: f.file_type || '',
              uploadedBy: fileProfileMap.get(f.uploaded_by) || 'Usuario',
              uploadedAt: new Date(f.created_at)
            })),
            history: (history || []).map(h => ({
              id: h.id,
              action: h.action as any,
              details: h.details,
              user: h.user_id ? (historyProfileMap.get(h.user_id) || 'Usuario') : 'Sistema',
              timestamp: new Date(h.created_at)
            }))
          };
        }));

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
          tasks: tasksWithData.map((task): Task => ({
            id: task.id,
            title: task.title,
            description: task.description || '',
            status: task.status as 'waiting' | 'todo' | 'progress' | 'done',
            columnId: task.column_id || undefined,
            sectorId: task.sector_id || undefined,
            comments: task.comments,
            files: task.files,
            history: task.history,
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
        console.error('Error:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar projeto",
          variant: "destructive",
        });
        navigate('projects');
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
    navigate('auth');
  };

  const handleBack = () => {
    navigate('projects');
  };

  const handleNavigateToAcordos = () => {
    navigate(`project/${id}/acordos`);
  };

  const handleProjectNavigation = (path: string) => {
    navigate(`project/${path}`);
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