import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMessages, Message } from '@/hooks/useMessages';
import { User as UserType } from '@/types/user';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import NewConversationModal from './NewConversationModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface InternalMessagingProps {
  currentUser: UserType;
  users: UserType[];
}

const InternalMessaging: React.FC<InternalMessagingProps> = ({
  currentUser,
  users
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, sendMessage, deleteMessage, getUserMessages, getUnreadCount, markAsRead } = useMessages(currentUser.id);
  const totalUnread = messages.filter(m => m.receiver_id === currentUser.id && !m.is_read).length;

  const selectedUserMessages = selectedUser ? getUserMessages(selectedUser.id) : [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedUserMessages.length]);

  const handleSendMessage = async (message: string, attachments: File[]) => {
    if (!selectedUser) return;

    try {
      await sendMessage(selectedUser.id, message, 'direct', undefined, attachments, replyingTo?.id);
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;

    try {
      await deleteMessage(messageToDelete);
      setMessageToDelete(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleUserSelect = (user: UserType) => {
    setSelectedUser(user);
    setReplyingTo(null);
    // Mark messages from this user as read
    const userMessages = getUserMessages(user.id);
    userMessages
      .filter(msg => msg.sender_id === user.id && !msg.is_read)
      .forEach(msg => markAsRead(msg.id));
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const getReplyContent = (replyToId: string | undefined) => {
    if (!replyToId) return undefined;
    const originalMessage = messages.find(m => m.id === replyToId);
    return originalMessage?.content;
  };

  const otherUsers = users.filter(user => user.id !== currentUser.id);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageCircle className="h-5 w-5" />
          {totalUnread > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] max-h-[600px] p-0 overflow-hidden">
        <div className="flex h-full overflow-hidden">
          {/* Users List */}
          <div className="w-1/3 border-r bg-muted/20 flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-4 border-b shrink-0">
              <DialogTitle className="text-base">Mensagens</DialogTitle>
            </DialogHeader>
            <div className="p-2 shrink-0">
              <NewConversationModal
                users={users}
                onSelectUser={handleUserSelect}
                currentUserId={currentUser.id}
              />
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2">
                {otherUsers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {users.length === 0 ? 'Carregando usuários...' : 'Nenhum outro usuário disponível'}
                  </div>
                ) : (
                  otherUsers.map((user) => {
                    const unreadCount = getUnreadCount(user.id);
                    return (
                      <div
                        key={user.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedUser?.id === user.id 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleUserSelect(user)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                          </div>
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b bg-muted/10 shrink-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedUser.avatar} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedUser.name}</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {selectedUserMessages.map((message) => {
                      const isFromCurrentUser = message.sender_id === currentUser.id;
                      return (
                        <MessageBubble
                          key={message.id}
                          messageId={message.id}
                          content={message.content}
                          isFromCurrentUser={isFromCurrentUser}
                          createdAt={message.created_at}
                          replyToContent={getReplyContent(message.reply_to_id)}
                          onDelete={isFromCurrentUser ? () => setMessageToDelete(message.id) : undefined}
                          onReply={() => handleReply(message)}
                        />
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t shrink-0">
                  <MessageInput 
                    onSend={handleSendMessage}
                    replyingTo={replyingTo ? { id: replyingTo.id, content: replyingTo.content } : undefined}
                    onCancelReply={() => setReplyingTo(null)}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione um usuário para iniciar uma conversa</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={!!messageToDelete} onOpenChange={() => setMessageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mensagem será permanentemente deletada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default InternalMessaging;
