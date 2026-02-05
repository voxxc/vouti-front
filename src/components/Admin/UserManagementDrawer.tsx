 import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Users } from "lucide-react";
 import UserManagement from "./UserManagement";
 import { User } from "@/types/user";
 
 interface UserManagementDrawerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   users: User[];
   onAddUser: () => void;
   onEditUser: (userId: string, userData: Partial<User>) => void;
   onDeleteUser: (userId: string) => void;
 }
 
 export function UserManagementDrawer({
   open,
   onOpenChange,
   users,
   onAddUser,
   onEditUser,
   onDeleteUser
 }: UserManagementDrawerProps) {
   return (
     <Sheet open={open} onOpenChange={onOpenChange}>
       <SheetContent 
         side="top"
         className="p-0 flex flex-col h-[85vh]"
       >
         <SheetTitle className="sr-only">Gerenciamento de Usuários</SheetTitle>
         
         {/* Header */}
         <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
           <Users className="h-5 w-5 text-primary" />
           <span className="font-semibold text-lg">Gerenciamento de Usuários</span>
         </div>
 
         {/* Conteudo scrollavel */}
         <ScrollArea className="flex-1">
           <div className="p-6">
             <UserManagement
               users={users}
               onAddUser={onAddUser}
               onEditUser={onEditUser}
               onDeleteUser={onDeleteUser}
             />
           </div>
         </ScrollArea>
       </SheetContent>
     </Sheet>
   );
 }