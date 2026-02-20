import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { FolderOpen, Plus, Search, X, ChevronRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantId } from "@/hooks/useTenantId";
import { useToast } from "@/hooks/use-toast";
import { ProjectDrawerContent } from "@/components/Project/ProjectDrawerContent";
import { cn } from "@/lib/utils";

interface CrmProject {
  id: string;
  name: string;
  client: string;
  description: string;
}

interface WhatsAppProjectsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsAppProjects({ open, onOpenChange }: WhatsAppProjectsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", client: "", description: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [projects, setProjects] = useState<CrmProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const { toast } = useToast();

  const fetchProjects = useCallback(async () => {
    if (!user || !tenantId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, client, description")
        .eq("tenant_id", tenantId)
        .eq("module", "crm")
        .order("name", { ascending: true });

      if (error) throw error;
      setProjects(
        (data || []).map((p) => ({
          id: p.id,
          name: p.name,
          client: p.client,
          description: p.description || "",
        }))
      );
    } catch (error) {
      console.error("[WhatsAppProjects] Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, tenantId]);

  useEffect(() => {
    if (open && user && tenantId) {
      fetchProjects();
    }
  }, [open, user, tenantId, fetchProjects]);

  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects;
    const term = searchTerm.toLowerCase();
    return projects.filter(
      (p) => p.name.toLowerCase().includes(term) || p.client.toLowerCase().includes(term)
    );
  }, [projects, searchTerm]);

  const handleCreateProject = async () => {
    if (!formData.name.trim() || !user || !tenantId) return;
    setIsCreating(true);
    try {
      const { error } = await supabase.from("projects").insert({
        name: formData.name,
        client: formData.client,
        description: formData.description,
        created_by: user.id,
        tenant_id: tenantId,
        module: "crm",
      });
      if (error) throw error;
      toast({ title: "Sucesso", description: "Projeto criado com sucesso!" });
      setFormData({ name: "", client: "", description: "" });
      setShowCreateForm(false);
      fetchProjects();
    } catch (error) {
      console.error("[WhatsAppProjects] Create error:", error);
      toast({ title: "Erro", description: "Erro ao criar projeto.", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSelectedProjectId(null);
    onOpenChange(false);
  };

  const isExpanded = !!selectedProjectId;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }} modal={false}>
      <SheetContent
        side="left-offset"
        className="p-0 flex flex-col !right-0 !w-auto"
      >
        <SheetTitle className="sr-only">Projetos</SheetTitle>

        {selectedProjectId ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-background">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedProjectId(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <FolderOpen className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Projetos</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <ProjectDrawerContent
                projectId={selectedProjectId}
                onClose={() => setSelectedProjectId(null)}
                module="crm"
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
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
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowCreateForm(false); setFormData({ name: "", client: "", description: "" }); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input placeholder="Nome do projeto *" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} className="h-9" />
                    <Input placeholder="Cliente (opcional)" value={formData.client} onChange={e => setFormData(prev => ({ ...prev, client: e.target.value }))} className="h-9" />
                    <Input placeholder="Descrição (opcional)" value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} className="h-9" />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={handleCreateProject} disabled={isCreating || !formData.name.trim()}>
                        {isCreating ? "Criando..." : "Criar Projeto"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowCreateForm(false); setFormData({ name: "", client: "", description: "" }); }}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" className="gap-2" onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4" />
                    Novo Projeto
                  </Button>
                )}

                <div className="relative max-w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar projetos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9" />
                </div>

                <div className="space-y-1">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="p-3 rounded-lg">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ))
                  ) : filteredProjects.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "Nenhum projeto encontrado" : "Nenhum projeto criado"}
                    </div>
                  ) : (
                    filteredProjects.map((project, index) => (
                      <button
                        key={project.id}
                        onClick={() => setSelectedProjectId(project.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg transition-colors",
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
                              {project.client}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
