 import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { DollarSign } from "lucide-react";
 import { FinancialContent } from "./FinancialContent";
 
 interface FinancialDrawerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function FinancialDrawer({ open, onOpenChange }: FinancialDrawerProps) {
   return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
       <SheetContent 
         side="inset"
         className="p-0 flex flex-col"
       >
         <SheetTitle className="sr-only">Financeiro</SheetTitle>
         
         {/* Header */}
         <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
           <DollarSign className="h-5 w-5 text-primary" />
           <span className="font-semibold text-lg">Financeiro</span>
         </div>
 
         {/* Conteudo scrollavel */}
         <ScrollArea className="flex-1">
           <div className="p-6">
             <FinancialContent />
           </div>
         </ScrollArea>
       </SheetContent>
     </Sheet>
   );
 }