import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FolderOpen, ExternalLink } from "lucide-react";
import { ProjectDrawerContent } from "./ProjectDrawerContent";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";

interface ProjectDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
}

export function ProjectDrawer({ open, onOpenChange, projectId }: ProjectDrawerProps) {
  const { navigate } = useTenantNavigation();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent 
        side="inset"
        className="p-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
          <SheetTitle className="text-lg font-semibold">Projeto</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              navigate("/projects");
              onOpenChange(false);
            }}
            title="Gerenciar projetos"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Conteudo do projeto */}
        {projectId ? (
          <ProjectDrawerContent 
            projectId={projectId} 
            onClose={() => onOpenChange(false)} 
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecione um projeto</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
