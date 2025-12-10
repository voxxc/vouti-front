import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTenantId } from '@/hooks/useTenantId';

interface UserTagSelectorProps {
  selectedUsers: string[];
  onChange: (userIds: string[]) => void;
  excludeCurrentUser?: boolean;
}

interface User {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

const UserTagSelector = ({ selectedUsers, onChange, excludeCurrentUser = false }: UserTagSelectorProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { tenantId } = useTenantId();

  useEffect(() => {
    if (tenantId) {
      fetchUsers();
    }
  }, [tenantId]);

  const fetchUsers = async () => {
    if (!tenantId) return;
    
    try {
      let query = supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .eq('tenant_id', tenantId)
        .not('email', 'like', '%@metalsystem.local')
        .order('full_name');

      if (excludeCurrentUser) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.neq('user_id', user.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      onChange(selectedUsers.filter(id => id !== userId));
    } else {
      onChange([...selectedUsers, userId]);
    }
  };

  const handleRemoveUser = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedUsers.filter(id => id !== userId));
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  const selectedUserObjects = users.filter(u => selectedUsers.includes(u.user_id));

  return (
    <div className="space-y-2">
      <Label htmlFor="tagged-users">Marcar Usuários (Tags)</Label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10"
          >
            {selectedUsers.length === 0 ? (
              <span className="text-muted-foreground">Selecione usuários para marcar...</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {selectedUserObjects.map(user => (
                  <Badge
                    key={user.user_id}
                    variant="secondary"
                    className="gap-1"
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{user.full_name || user.email}</span>
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={(e) => handleRemoveUser(user.user_id, e)}
                    />
                  </Badge>
                ))}
              </div>
            )}
            <UserPlus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-full p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <ScrollArea className="h-60">
            <div className="p-2 space-y-1">
              {loading ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Carregando usuários...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Nenhum usuário encontrado
                </div>
              ) : (
                filteredUsers.map(user => {
                  const isSelected = selectedUsers.includes(user.user_id);
                  
                  return (
                    <Card
                      key={user.user_id}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
                      }`}
                      onClick={() => handleToggleUser(user.user_id)}
                    >
                      <CardContent className="p-2 flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.full_name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.full_name || 'Sem nome'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                        {isSelected && (
                          <Badge variant="default" className="ml-auto">
                            Selecionado
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
          
          <div className="p-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setOpen(false)}
            >
              Fechar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      
      <p className="text-xs text-muted-foreground">
        Usuários marcados receberão notificação e verão este prazo em suas agendas
      </p>
    </div>
  );
};

export default UserTagSelector;