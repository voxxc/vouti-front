 import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Calendar } from "lucide-react";
 import { AgendaContent } from "./AgendaContent";
 
 interface AgendaDrawerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function AgendaDrawer({ open, onOpenChange }: AgendaDrawerProps) {
   return (
     <Sheet open={open} onOpenChange={onOpenChange}>
       <SheetContent 
         side="inset"
         className="p-0 flex flex-col"
       >
         <SheetTitle className="sr-only">Agenda</SheetTitle>
         
         {/* Header */}
         <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
           <Calendar className="h-5 w-5 text-primary" />
           <span className="font-semibold text-lg">Agenda</span>
         </div>
 
         {/* Conteudo scrollavel */}
         <ScrollArea className="flex-1">
           <div className="p-6">
             <AgendaContent />
           </div>
         </ScrollArea>
       </SheetContent>
     </Sheet>
   );
 }