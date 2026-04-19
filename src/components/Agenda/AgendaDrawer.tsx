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
        <div className="glass-surface sticky top-0 z-10 flex items-center justify-between gap-2 px-4 md:px-6 py-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="apple-h1 text-lg md:text-xl leading-tight">Agenda</span>
              <span className="apple-subtitle text-xs">Prazos e compromissos</span>
            </div>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-xl">
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </SheetClose>
        </div>

        {/* Content */}
        <div className="p-3 md:p-6 flex-1 overflow-y-auto">
          <AgendaContent initialDeadlineId={initialDeadlineId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
