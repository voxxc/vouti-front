import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Users } from 'lucide-react';
import { User } from '@/types/user';
import { Message, ChatRoom } from '@/types/communication';

interface InternalMessagingProps {
  currentUser: User;
  users: User[];
  messages: Message[];
  chatRooms: ChatRoom[];
  onSendMessage: (receiverId: string, content: string) => void;
}

export const InternalMessaging = ({ 
  currentUser, 
  users, 
  messages, 
  chatRooms, 
  onSendMessage 
}: InternalMessagingProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !messageText.trim()) return;

    onSendMessage(selectedUser.id, messageText.trim());
    setMessageText('');
  };

  const getUserMessages = (userId: string) => {
    return messages
      .filter(msg => 
        (msg.senderId === currentUser.id && msg.receiverId === userId) ||
        (msg.senderId === userId && msg.receiverId === currentUser.id)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const getUnreadCount = (userId: string) => {
    return messages.filter(msg => 
      msg.senderId === userId && 
      msg.receiverId === currentUser.id && 
      !msg.isRead
    ).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MessageCircle size={16} />
          Mensagens
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle size={20} />
            Mensagens da Equipe
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
          {/* User List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users size={16} />
                Equipe ({users.filter(u => u.id !== currentUser.id).length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[480px]">
                {users
                  .filter(user => user.id !== currentUser.id)
                  .map((user) => {
                    const unreadCount = getUnreadCount(user.id);
                    return (
                      <div
                        key={user.id}
                        className={`p-3 border-b cursor-pointer hover:bg-accent/50 transition-colors ${
                          selectedUser?.id === user.id ? 'bg-accent' : ''
                        }`}
                        onClick={() => setSelectedUser(user)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <div className="md:col-span-2">
            {selectedUser ? (
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={selectedUser.avatar} />
                      <AvatarFallback>{selectedUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {selectedUser.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col h-[480px]">
                  {/* Messages */}
                  <ScrollArea className="flex-1 mb-4">
                    <div className="space-y-3">
                      {getUserMessages(selectedUser.id).map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.senderId === currentUser.id ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              message.senderId === currentUser.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Textarea
                      placeholder={`Enviar mensagem para ${selectedUser.name}...`}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="flex-1 min-h-[80px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                    />
                    <Button type="submit" disabled={!messageText.trim()} className="self-end">
                      <Send size={16} />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full">
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Selecione um membro da equipe para iniciar uma conversa</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};