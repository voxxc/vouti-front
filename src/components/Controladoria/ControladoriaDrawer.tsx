import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
 
         {/* Conteudo - scroll delegado para cada aba */}
         <div className="flex-1 min-h-0 overflow-hidden p-6">
           <ControladoriaContent />
         </div>
       </SheetContent>
     </Sheet>
   );
 }