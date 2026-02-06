import { useState, useEffect } from "react";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Search, Plus, FolderOpen, Calendar, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectsOptimized, ProjectBasic } from "@/hooks/useProjectsOptimized";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";

const Projects = () => {
  const { navigate } = useTenantNavigation();
  const { stopLoading, navigationId } = useNavigationLoading();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    client: "",
    description: ""
  });

  const {
    projects,
    isBasicLoaded,
    isAdmin,
    createProject,
    deleteProject
  } = useProjectsOptimized();

  // Sinalizar que a página está pronta quando dados básicos carregarem
  useEffect(() => {
    if (isBasicLoaded) {
      stopLoading(navigationId);
    }
  }, [isBasicLoaded, stopLoading, navigationId]);

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.client) return;

    const result = await createProject({
      name: newProject.name,
      client: newProject.client,
      description: newProject.description
    });

    if (result) {
      setNewProject({ name: "", client: "", description: "" });
      setShowCreateForm(false);
    }
  };

  const handleCancelCreate = () => {
    setNewProject({ name: "", client: "", description: "" });
    setShowCreateForm(false);
  };

  const handleSelectProject = (project: ProjectBasic) => {
    navigate(`project/${project.id}`);
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteProject(projectId);
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Skeleton loading for initial load
  if (!isBasicLoaded) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-24" />
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-10 w-80" />
          <div className="rounded-lg border bg-card divide-y">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
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
            <Button variant="ghost" onClick={() => navigate('dashboard')} className="gap-2">
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

        {/* Projects List */}
        <div className="rounded-lg border bg-card divide-y">
          {filteredProjects.map((project) => (
            <div 
              key={project.id} 
              className="p-4 hover:bg-accent/50 transition-colors cursor-pointer flex items-center justify-between gap-4"
              onClick={() => handleSelectProject(project)}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="p-2 bg-law-blue/10 rounded-lg shrink-0">
                  <FolderOpen className="h-5 w-5 text-law-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {project.name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {project.client}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                    <Calendar className="h-3 w-3" />
                    Criado em {format(project.createdAt, "dd/MM/yyyy", { locale: ptBR })}
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
          ))}
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