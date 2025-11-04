import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PenSquare, User, Search } from 'lucide-react';
import { User as UserType } from '@/types/user';

// Normalize string by removing accents and converting to lowercase
const normalizeString = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

interface NewConversationModalProps {
  users: UserType[];
  onSelectUser: (user: UserType) => void;
  currentUserId: string;
}

const NewConversationModal = ({ users, onSelectUser, currentUserId }: NewConversationModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter users excluding current user
  const availableUsers = users.filter(user => user.id !== currentUserId);
  
  // Apply search filter with accent-insensitive matching
  const filteredUsers = searchQuery.trim() === '' 
    ? availableUsers 
    : availableUsers.filter(user => {
        const normalizedQuery = normalizeString(searchQuery);
        const normalizedName = normalizeString(user.name || '');
        const normalizedEmail = normalizeString(user.email || '');
        return normalizedName.includes(normalizedQuery) || normalizedEmail.includes(normalizedQuery);
      });

  console.log('NewConversationModal - Total users:', users.length);
  console.log('NewConversationModal - Available users (excluding current):', availableUsers.length);
  console.log('NewConversationModal - Filtered users:', filteredUsers.length);
  console.log('NewConversationModal - Search query:', searchQuery);
  console.log('NewConversationModal - Current user ID:', currentUserId);

  const handleSelectUser = (user: UserType) => {
    onSelectUser(user);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-full mb-2">
          <PenSquare className="h-4 w-4" />
          Nova Conversa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar Nova Conversa</DialogTitle>
          <DialogDescription>
            Busque e selecione um usuário para iniciar uma conversa direta.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users List */}
          <ScrollArea className="h-[400px] border rounded-md">
            <div className="space-y-2 p-2">
              {availableUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum usuário disponível</p>
                </div>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors border border-transparent hover:border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-primary/10">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum usuário encontrado para "{searchQuery}"</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewConversationModal;
