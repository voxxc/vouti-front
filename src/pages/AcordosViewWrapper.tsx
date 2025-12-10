import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import AcordosView from './AcordosView';
import { Project, Task } from '@/types/project';

const AcordosViewWrapper = () => {
  const { id } = useParams();
  const { navigate } = useTenantNavigation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;

    const loadProjectData = async () => {
      try {
        // Buscar projeto
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (projectError || !projectData) {
          console.error('Error fetching project:', projectError);
          toast({
            title: "Erro",
            description: "Projeto não encontrado",
            variant: "destructive",
          });
          navigate('/projects');
          return;
        }

        // Buscar tarefas do tipo 'acordo'
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', id)
          .eq('task_type', 'acordo');

        if (tasksError) {
          console.error('Error fetching tasks:', tasksError);
        }

        const acordoTasks: Task[] = (tasksData || []).map(task => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          status: task.status as Task['status'],
          columnId: task.column_id,
          sectorId: task.sector_id,
          comments: [],
          files: [],
          history: [],
          type: 'acordo' as const,
          acordoDetails: (task.acordo_details && typeof task.acordo_details === 'object') ? task.acordo_details as any : {},
          cardColor: (task.card_color || 'default') as Task['cardColor'],
          createdAt: new Date(task.created_at),
          updatedAt: new Date(task.updated_at)
        }));

        const loadedProject: Project = {
          id: projectData.id,
          name: projectData.name,
          client: projectData.client || '',
          description: projectData.description || '',
          tasks: [],
          acordoTasks,
          createdBy: projectData.created_by,
          createdAt: new Date(projectData.created_at),
          updatedAt: new Date(projectData.updated_at)
        };

        setProject(loadedProject);
        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar dados",
          variant: "destructive",
        });
        navigate('/projects');
      }
    };

    loadProjectData();
  }, [id, user, toast, navigate]);

  const handleUpdateProject = async (updatedProject: Project) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: updatedProject.name,
          description: updatedProject.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleBack = () => {
    navigate(`/project/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Carregando Acordos...</div>
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
    <AcordosView
      project={project}
      onUpdateProject={handleUpdateProject}
      onBack={handleBack}
      onLogout={handleLogout}
    />
  );
};

export default AcordosViewWrapper;