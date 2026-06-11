import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Gavel } from "lucide-react";

interface AudienciasDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AudienciasDrawer({ open, onOpenChange }: AudienciasDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="inset"
        className="p-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <SheetTitle className="sr-only">Audiências</SheetTitle>

        <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">Audiências</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-6">
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
              <Gavel className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Nenhuma audiência detectada</h2>
            <p className="text-sm text-muted-foreground">
              Em breve as audiências identificadas automaticamente pelos andamentos
              dos processos aparecerão aqui.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}