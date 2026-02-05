 import { Sheet, SheetContent, SheetClose, SheetTitle } from "@/components/ui/sheet";
 import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCheck } from "lucide-react";
 import { ControladoriaContent } from "./ControladoriaContent";
 
 interface ControladoriaDrawerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function ControladoriaDrawer({ open, onOpenChange }: ControladoriaDrawerProps) {
   return (
     <Sheet open={open} onOpenChange={onOpenChange}>
       <SheetContent 
        side="inset"
        className="p-0 flex flex-col"
       >
         <SheetTitle className="sr-only">Controladoria</SheetTitle>
         
        {/* Header - X automático do SheetContent */}
        <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
           <div className="flex items-center gap-2">
             <FileCheck className="h-5 w-5 text-primary" />
             <span className="font-semibold text-lg">Controladoria</span>
           </div>
         </div>
 
         {/* Conteudo scrollavel */}
         <ScrollArea className="flex-1">
           <div className="p-6">
             <ControladoriaContent />
           </div>
         </ScrollArea>
       </SheetContent>
     </Sheet>
   );
 }