 import { Sheet, SheetContent, SheetClose, SheetTitle } from "@/components/ui/sheet";
 import { Button } from "@/components/ui/button";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { X, FileCheck } from "lucide-react";
 import { ControladoriaContent } from "./ControladoriaContent";
 
 interface ControladoriaDrawerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function ControladoriaDrawer({ open, onOpenChange }: ControladoriaDrawerProps) {
   return (
     <Sheet open={open} onOpenChange={onOpenChange}>
       <SheetContent 
         side="right" 
         className="w-full sm:max-w-none p-0 flex flex-col"
       >
         <SheetTitle className="sr-only">Controladoria</SheetTitle>
         
         {/* Header com botao X */}
         <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
           <div className="flex items-center gap-2">
             <FileCheck className="h-5 w-5 text-primary" />
             <span className="font-semibold text-lg">Controladoria</span>
           </div>
           <SheetClose asChild>
             <Button variant="ghost" size="icon" className="h-8 w-8">
               <X className="h-4 w-4" />
               <span className="sr-only">Fechar</span>
             </Button>
           </SheetClose>
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