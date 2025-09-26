import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Plus, FolderOpen, Calendar, User } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { Project } from "@/types/project";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Projects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          tasks (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const projectsWithTasks: Project[] = (data || []).map(project => ({
        id: project.id,
        name: project.name,
        client: project.client,
        description: project.description || '',
        createdBy: project.created_by,
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at),
        tasks: (project.tasks || []).map((task: any) => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          status: task.status,
          type: task.task_type || 'regular',
          comments: [],
          files: [],
          history: [],
          createdAt: new Date(task.created_at),
          updatedAt: new Date(task.updated_at)
        })),
        acordoTasks: []
      }));

      setProjects(projectsWithTasks);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar projetos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!user) return;

    const projectName = prompt("Nome do projeto:");
    const clientName = prompt("Nome do cliente:");
    const description = prompt("Descrição:");

    if (!projectName || !clientName) return;

    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          name: projectName,
          client: clientName,
          description: description || '',
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Projeto criado com sucesso!",
      });

      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar projeto.",
        variant: "destructive",
      });
    }
  };

  const handleSelectProject = (project: Project) => {
    navigate(`/project/${project.id}`);
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProjectStats = (project: Project) => {
    const total = project.tasks.length;
    const done = project.tasks.filter(t => t.status === 'done').length;
    const progress = project.tasks.filter(t => t.status === 'progress').length;
    return { total, done, progress };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div>Carregando projetos...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
              <ArrowLeft size={16} />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">CLIENTES</h1>
              <p className="text-muted-foreground">Gerencie todos os seus clientes jurídicos</p>
            </div>
          </div>
          <Button variant="professional" onClick={handleCreateProject} className="gap-2">
            <Plus size={16} />
            Novo Cliente
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const stats = getProjectStats(project);
            const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
            
            return (
              <Card 
                key={project.id} 
                className="shadow-card border-0 hover:shadow-elegant transition-all duration-200 cursor-pointer"
                onClick={() => handleSelectProject(project)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-law-blue/10 rounded-lg">
                        <FolderOpen className="h-5 w-5 text-law-blue" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold leading-6">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <User className="h-3 w-3" />
                          {project.client}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        {format(project.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {project.description}
                  </p>
                  
                  {/* Progress Stats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{completionRate}%</span>
                    </div>
                    
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{stats.total} tarefas</span>
                        <span>{stats.progress} em andamento</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(project.updatedAt, "dd/MM/yy", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm ? "Nenhum projeto encontrado" : "Nenhum projeto ainda"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? "Tente ajustar os termos de busca"
                : "Comece criando seu primeiro projeto jurídico"
              }
            </p>
            {!searchTerm && (
              <Button variant="professional" onClick={handleCreateProject} className="gap-2">
                <Plus size={16} />
                Criar Primeiro Projeto
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Projects;