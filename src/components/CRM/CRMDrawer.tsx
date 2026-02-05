 import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Users } from "lucide-react";
 import { CRMContent } from "./CRMContent";
 
 interface CRMDrawerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function CRMDrawer({ open, onOpenChange }: CRMDrawerProps) {
   return (
     <Sheet open={open} onOpenChange={onOpenChange}>
       <SheetContent 
         side="inset"
         className="p-0 flex flex-col"
       >
         <SheetTitle className="sr-only">CRM - Clientes</SheetTitle>
         
         {/* Header */}
         <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
           <Users className="h-5 w-5 text-primary" />
           <span className="font-semibold text-lg">Clientes</span>
         </div>
 
         {/* Conteudo scrollavel */}
         <ScrollArea className="flex-1">
           <div className="p-6">
             <CRMContent />
           </div>
         </ScrollArea>
       </SheetContent>
     </Sheet>
   );
 }