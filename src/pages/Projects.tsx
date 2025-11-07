import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Search, Plus, FolderOpen, Calendar, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { Project } from "@/types/project";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { checkIfUserIsAdmin } from "@/lib/auth-helpers";
import { calculateProjectProgress } from "@/utils/projectHelpers";
import { KanbanColumn } from "@/types/project";

const Projects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    client: "",
    description: ""
  });

  useEffect(() => {
    fetchProjects();
    checkIfAdmin();
  }, [user]);

  const checkIfAdmin = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const fetchProjects = async () => {
    if (!user) return;

    try {
      console.log('[Projects] Fetching projects for user:', user.id);
      
      // Verificar se o usuário é admin
      const isAdminUser = await checkIfUserIsAdmin(user.id);
      console.log('[Projects] User is admin:', isAdminUser);
      
      let query = supabase
        .from('projects')
        .select(`
          *,
          tasks (*)
        `)
        .order('created_at', { ascending: false });

      // Se NÃO for admin, filtrar por criador ou colaborador
      if (!isAdminUser) {
        const { data: collaboratorProjects } = await supabase
          .from('project_collaborators')
          .select('project_id')
          .eq('user_id', user.id);

        const collaboratorProjectIds = collaboratorProjects?.map(cp => cp.project_id) || [];
        
        console.log('[Projects] User is collaborator in:', collaboratorProjectIds);
        
        query = query.or(`created_by.eq.${user.id}${collaboratorProjectIds.length > 0 ? `,id.in.(${collaboratorProjectIds.join(',')})` : ''}`);
      } else {
        console.log('[Projects] Admin access: fetching ALL projects');
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('[Projects] Error fetching projects:', error);
        throw error;
      }

      console.log(`[Projects] Found ${data?.length || 0} projects`);

      const projectsWithTasks: Project[] = await Promise.all((data || []).map(async (project) => {
        // Fetch tasks with their comments, files, and history
        const tasks = await Promise.all((project.tasks || []).map(async (task: any) => {
          // Fetch comments
          const { data: comments } = await supabase
            .from('task_comments')
            .select('*')
            .eq('task_id', task.id)
            .order('created_at', { ascending: true });

          // Fetch files
          const { data: files } = await supabase
            .from('task_files')
            .select('*')
            .eq('task_id', task.id)
            .order('created_at', { ascending: true });

          // Fetch history
          const { data: history } = await supabase
            .from('task_history')
            .select('*')
            .eq('task_id', task.id)
            .order('created_at', { ascending: false });

          return {
            id: task.id,
            title: task.title,
            description: task.description || '',
            status: task.status,
            type: task.task_type || 'regular',
            columnId: task.column_id,
            cardColor: task.card_color || 'default',
            comments: (comments || []).map(c => ({
              id: c.id,
              text: c.comment_text,
              author: 'Usuário',
              createdAt: new Date(c.created_at),
              updatedAt: new Date(c.updated_at)
            })),
            files: (files || []).map(f => ({
              id: f.id,
              name: f.file_name,
              url: supabase.storage.from('task-attachments').getPublicUrl(f.file_path).data.publicUrl,
              size: f.file_size,
              type: f.file_type || '',
              uploadedBy: 'Usuário',
              uploadedAt: new Date(f.created_at)
            })),
            history: (history || []).map(h => ({
              id: h.id,
              action: h.action as any,
              details: h.details,
              user: 'Sistema',
              timestamp: new Date(h.created_at)
            })),
            createdAt: new Date(task.created_at),
            updatedAt: new Date(task.updated_at)
          };
        }));

        // Carregar colunas do projeto
        const { data: columnsData } = await supabase
          .from('project_columns')
          .select('*')
          .eq('project_id', project.id)
          .is('sector_id', null)
          .order('column_order');
        
        const columns: KanbanColumn[] = (columnsData || []).map(col => ({
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

        return {
          id: project.id,
          name: project.name,
          client: project.client,
          clienteId: project.cliente_id,
          description: project.description || '',
          createdBy: project.created_by,
          createdAt: new Date(project.created_at),
          updatedAt: new Date(project.updated_at),
          tasks: tasks,
          acordoTasks: [],
          columns: columns
        };
      }));

      setProjects(projectsWithTasks);
    } catch (error) {
      console.error('[Projects] Error in fetchProjects:', error);
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
    if (!user || !newProject.name || !newProject.client) return;

    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          name: newProject.name,
          client: newProject.client,
          description: newProject.description,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Projeto criado com sucesso!",
      });

      setNewProject({ name: "", client: "", description: "" });
      setShowCreateForm(false);
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

  const handleCancelCreate = () => {
    setNewProject({ name: "", client: "", description: "" });
    setShowCreateForm(false);
  };

  const handleSelectProject = (project: Project) => {
    navigate(`/project/${project.id}`);
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevenir navegação ao clicar no botão deletar
    
    if (!user) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Projeto deletado com sucesso!",
      });

      // Atualizar lista de projetos
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar projeto.",
        variant: "destructive",
      });
    }
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
    
    // Calcular progresso baseado na posição das colunas
    const columns = project.columns || [];
    const progressPercentage = calculateProjectProgress(project.tasks, columns);
    
    return { total, done, progress, progressPercentage };
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
          <Button variant="professional" onClick={() => setShowCreateForm(true)} className="gap-2">
            <Plus size={16} />
            Novo Cliente
          </Button>
        </div>

        {/* Create Project Form */}
        {showCreateForm && (
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle>Novo Cliente</CardTitle>
              <CardDescription>Preencha os dados do novo cliente jurídico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Nome do Cliente *</label>
                <Input
                  placeholder="Nome da empresa ou pessoa"
                  value={newProject.client}
                  onChange={(e) => setNewProject(prev => ({ ...prev, client: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Nome do Projeto *</label>
                <Input
                  placeholder="Descrição do caso ou projeto"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Descrição</label>
                <Input
                  placeholder="Detalhes adicionais (opcional)"
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleCreateProject}
                  disabled={!newProject.name || !newProject.client}
                  className="flex-1"
                >
                  Criar Cliente
                </Button>
                <Button variant="outline" onClick={handleCancelCreate}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
            const completionRate = stats.progressPercentage;
            
            return (
              <Card 
                key={project.id} 
                className="shadow-card border-0 hover:shadow-elegant transition-all duration-200 cursor-pointer"
                onClick={() => handleSelectProject(project)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-law-blue/10 rounded-lg">
                        <FolderOpen className="h-5 w-5 text-law-blue" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold leading-6">
                          {project.name}
                        </CardTitle>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          {format(project.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o projeto "{project.name}"? Esta ação não pode ser desfeita e todas as tarefas associadas serão perdidas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={(e) => handleDeleteProject(project.id, e)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
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
              <Button variant="professional" onClick={() => setShowCreateForm(true)} className="gap-2">
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