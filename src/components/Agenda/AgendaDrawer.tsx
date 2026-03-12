import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgendaContent } from "./AgendaContent";

interface AgendaDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDeadlineId?: string;
}

export function AgendaDrawer({ open, onOpenChange, initialDeadlineId }: AgendaDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="inset"
        className="p-0 flex flex-col [&>button:last-of-type]:hidden"
      >
        <SheetTitle className="sr-only">Agenda</SheetTitle>

        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 md:px-6 py-3 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">Agenda</span>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </SheetClose>
        </div>

        {/* Content */}
        <div className="p-3 md:p-6 flex-1 overflow-y-auto">
          <AgendaContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}
