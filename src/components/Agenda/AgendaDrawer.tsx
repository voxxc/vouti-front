import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Calendar } from "lucide-react";
import { AgendaContent } from "./AgendaContent";

interface AgendaDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgendaDrawer({ open, onOpenChange }: AgendaDrawerProps) {
  return (
   <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent 
        side="inset"
        className="p-0 flex flex-col overflow-y-auto"
      >
        <SheetTitle className="sr-only">Agenda</SheetTitle>
        
        {/* Header */}
        <div className="flex items-center gap-2 px-6 py-4 border-b bg-background sticky top-0 z-10">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Agenda</span>
        </div>

        {/* Content */}
        <div className="p-6 flex-1">
          <AgendaContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}
