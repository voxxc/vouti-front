import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { FolderOpen } from "lucide-react";
import { ProjectDrawerContent } from "./ProjectDrawerContent";

interface ProjectDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
}

export function ProjectDrawer({ open, onOpenChange, projectId }: ProjectDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent 
        side="inset"
        className="p-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <SheetTitle className="sr-only">Projeto</SheetTitle>
        
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
