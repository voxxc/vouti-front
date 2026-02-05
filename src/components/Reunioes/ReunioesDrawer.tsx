 import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Video } from "lucide-react";
 import { ReunioesContent } from "./ReunioesContent";
 
 interface ReunioesDrawerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function ReunioesDrawer({ open, onOpenChange }: ReunioesDrawerProps) {
   return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
       <SheetContent 
         side="inset"
         className="p-0 flex flex-col"
       >
         <SheetTitle className="sr-only">Reuniões</SheetTitle>
         
         {/* Header */}
         <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
           <Video className="h-5 w-5 text-primary" />
           <span className="font-semibold text-lg">Reuniões</span>
         </div>
 
         {/* Conteudo scrollavel */}
         <ScrollArea className="flex-1">
           <div className="p-6">
             <ReunioesContent />
           </div>
         </ScrollArea>
       </SheetContent>
     </Sheet>
   );
 }