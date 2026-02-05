import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { FolderOpen, Plus, Search, X, ChevronRight } from "lucide-react";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { useProjectsOptimized, ProjectBasic } from "@/hooks/useProjectsOptimized";
import { cn } from "@/lib/utils";

interface ProjectsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreateProjectFormData {
  name: string;
  client: string;
  description: string;
}

export function ProjectsDrawer({ open, onOpenChange }: ProjectsDrawerProps) {
  const { navigate } = useTenantNavigation();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CreateProjectFormData>({
    name: "",
    client: "",
    description: ""
  });
  const [isCreating, setIsCreating] = useState(false);

  const {
    projects,
    isBasicLoaded,
    isDetailsLoaded,
    getProjectStats,
    createProject
  } = useProjectsOptimized();

  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects;
    const term = searchTerm.toLowerCase();
    return projects.filter(
      p => p.name.toLowerCase().includes(term) || p.client.toLowerCase().includes(term)
    );
  }, [projects, searchTerm]);

  const handleSelectProject = (project: ProjectBasic) => {
    navigate(`/project/${project.id}`);
    onOpenChange(false);
  };

  const handleCreateProject = async () => {
    if (!formData.name.trim() || !formData.client.trim()) return;
    
    setIsCreating(true);
    try {
      const result = await createProject(formData);
      if (result) {
        setFormData({ name: "", client: "", description: "" });
        setShowCreateForm(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelCreate = () => {
    setFormData({ name: "", client: "", description: "" });
    setShowCreateForm(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left-offset" className="p-0 flex flex-col">
        <SheetTitle className="sr-only">Projetos</SheetTitle>
        
        <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
          <FolderOpen className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Projetos</span>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            {showCreateForm ? (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Novo Projeto</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCancelCreate}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Nome do projeto *"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="h-9"
                />
                <Input
                  placeholder="Cliente *"
                  value={formData.client}
                  onChange={e => setFormData(prev => ({ ...prev, client: e.target.value }))}
                  className="h-9"
                />
                <Input
                  placeholder="Descrição (opcional)"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="h-9"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleCreateProject}
                    disabled={isCreating || !formData.name.trim() || !formData.client.trim()}
                  >
                    {isCreating ? "Criando..." : "Criar Projeto"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelCreate}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="w-full justify-start gap-2"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="h-4 w-4" />
                Novo Projeto
              </Button>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar projetos..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="space-y-1">
              {!isBasicLoaded ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-lg">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "Nenhum projeto encontrado" : "Nenhum projeto criado"}
                </div>
              ) : (
                filteredProjects.map((project, index) => {
                  const stats = getProjectStats(project.id);
                  return (
                    <button
                      key={project.id}
                      onClick={() => handleSelectProject(project)}
                      className={cn(
                        "w-full text-left p-3 transition-colors",
                        "hover:bg-accent/50 focus:bg-accent/50 focus:outline-none",
                        "group",
                        index < filteredProjects.length - 1 && "border-b border-border/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                            {project.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {project.client} • {project.taskCount} {project.taskCount === 1 ? 'tarefa' : 'tarefas'}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                      </div>
                      <div className="mt-2">
                        {isDetailsLoaded ? (
                          <div className="flex items-center gap-2">
                            <Progress value={stats.progressPercentage} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground w-8 text-right">
                              {stats.progressPercentage}%
                            </span>
                          </div>
                        ) : (
                          <Skeleton className="h-1.5 w-full" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <Button
              variant="ghost"
              className="w-full justify-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                navigate("/projects");
                onOpenChange(false);
              }}
            >
              Ver todos os projetos
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}