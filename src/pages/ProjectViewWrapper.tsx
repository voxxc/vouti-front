import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Project, Task } from '@/types/project';
import { useToast } from '@/hooks/use-toast';
import ProjectView from './ProjectView';

const ProjectViewWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

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

        // Transform data to match Project interface
        const transformedProject: Project = {
          id: projectData.id,
          name: projectData.name,
          client: projectData.client,
          description: projectData.description || '',
          tasks: (tasksData || []).map((task): Task => ({
            id: task.id,
            title: task.title,
            description: task.description || '',
            status: task.status as 'waiting' | 'todo' | 'progress' | 'done',
            comments: [],
            files: [],
            history: [],
            type: task.task_type === 'acordo' ? 'acordo' : 'regular',
            createdAt: new Date(task.created_at),
            updatedAt: new Date(task.updated_at)
          })),
          acordoTasks: [],
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

  return (
    <ProjectView
      onLogout={handleLogout}
      onBack={handleBack}
      project={project}
      onUpdateProject={handleUpdateProject}
      onNavigateToAcordos={handleNavigateToAcordos}
      currentUser={{
        id: user?.id || '',
        email: user?.email || '',
        name: user?.user_metadata?.full_name || user?.email || '',
        role: 'advogado',
        createdAt: new Date(),
        updatedAt: new Date()
      }}
    />
  );
};

export default ProjectViewWrapper;