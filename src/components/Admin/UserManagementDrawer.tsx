import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Plus, Search } from "lucide-react";
import { User } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface UserManagementDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  onAddUser: () => void;
  onEditUser: (userId: string, userData: Partial<User>) => void;
  onDeleteUser: (userId: string) => void;
  isLoading?: boolean;
}

export function UserManagementDrawer({
  open,
  onOpenChange,
  users,
  onAddUser,
  onEditUser,
  onDeleteUser,
  isLoading = false
}: UserManagementDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    // TODO: Abrir dialog de edição
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === 'admin' ? 'default' : 'secondary';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      advogado: 'Advogado',
      comercial: 'Comercial',
      financeiro: 'Financeiro',
      controller: 'Controller',
      agenda: 'Agenda',
      reunioes: 'Reuniões'
    };
    return labels[role] || role;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent 
        side="right-offset"
        className="p-0 flex flex-col"
      >
        <SheetTitle className="sr-only">Usuários</SheetTitle>
        
        {/* Barra decorativa no lado esquerdo */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary/20 via-border to-primary/20 pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
          <Users className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Usuários</span>
        </div>

        {/* Conteudo scrollavel */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            {/* Botão novo usuario */}
            <Button size="sm" className="gap-2" onClick={onAddUser}>
              <Plus className="h-4 w-4" />
              Novo Usuário
            </Button>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar usuários..." 
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Lista de usuarios */}
            <div className="space-y-1">
              {isLoading ? (
                // Skeleton loading
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                ))
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {searchQuery ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className="w-full text-left p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {user.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </div>
                      </div>
                      <Badge 
                        variant={getRoleBadgeVariant(user.role)} 
                        className="ml-2 shrink-0 text-xs"
                      >
                        {getRoleLabel(user.role)}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
