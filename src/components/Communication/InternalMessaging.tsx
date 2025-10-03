import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, User, Paperclip, Download, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMessages } from '@/hooks/useMessages';
import { User as UserType } from '@/types/user';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
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
  const [messageText, setMessageText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages, 
    sendMessage, 
    deleteMessage,
    getUserMessages, 
    getUnreadCount, 
    markAsRead,
    downloadAttachment 
  } = useMessages(currentUser.id);

  const totalUnread = messages.filter(m => m.receiver_id === currentUser.id && !m.is_read).length;

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current && selectedUser) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, selectedUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && selectedFiles.length === 0) || !selectedUser) return;

    try {
      await sendMessage(
        selectedUser.id, 
        messageText.trim() || '📎 Anexo(s)',
        'direct',
        undefined,
        selectedFiles
      );
      setMessageText('');
      setSelectedFiles([]);
      toast.success('Mensagem enviada!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;
    
    try {
      await deleteMessage(messageToDelete);
      toast.success('Mensagem deletada!');
      setMessageToDelete(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erro ao deletar mensagem');
    }
  };

  const handleUserSelect = (user: UserType) => {
    setSelectedUser(user);
    // Mark messages from this user as read
    const userMessages = getUserMessages(user.id);
    userMessages
      .filter(msg => msg.sender_id === user.id && !msg.is_read)
      .forEach(msg => markAsRead(msg.id));
  };

  const handleDownloadAttachment = async (filePath: string, fileName: string) => {
    try {
      await downloadAttachment(filePath, fileName);
      toast.success('Download iniciado!');
    } catch (error) {
      toast.error('Erro ao baixar arquivo');
    }
  };

  const otherUsers = users.filter(user => user.id !== currentUser.id);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="relative gap-2">
            <MessageCircle className="h-4 w-4" />
            Mensagens
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
        <DialogContent className="max-w-5xl h-[700px] p-0">
          <div className="flex h-full">
            {/* Users List */}
            <div className="w-1/3 border-r bg-muted/20">
              <DialogHeader className="p-4 border-b">
                <DialogTitle className="text-base">Conversas</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[calc(700px-80px)]">
                <div className="p-2">
                  {otherUsers.map((user) => {
                    const unreadCount = getUnreadCount(user.id);
                    const userMessages = getUserMessages(user.id);
                    const lastMessage = userMessages[userMessages.length - 1];
                    
                    return (
                      <div
                        key={user.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
                          selectedUser?.id === user.id 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleUserSelect(user)}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>
                              <User className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate">{user.name}</p>
                              {unreadCount > 0 && (
                                <Badge variant="destructive" className="h-5 text-xs ml-2">
                                  {unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            {lastMessage && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {lastMessage.sender_id === currentUser.id ? 'Você: ' : ''}
                                {lastMessage.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedUser ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b bg-muted/10">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedUser.avatar} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedUser.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
                    <div className="space-y-4">
                      {getUserMessages(selectedUser.id).map((message) => {
                        const isFromCurrentUser = message.sender_id === currentUser.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] group`}>
                              <div
                                className={`p-3 rounded-lg ${
                                  isFromCurrentUser
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm break-words">{message.content}</p>
                                
                                {/* Attachments */}
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {message.attachments.map((attachment) => (
                                      <div
                                        key={attachment.id}
                                        className={`flex items-center gap-2 text-xs p-2 rounded ${
                                          isFromCurrentUser
                                            ? 'bg-primary-foreground/10'
                                            : 'bg-background/50'
                                        }`}
                                      >
                                        <Paperclip className="h-3 w-3" />
                                        <span className="flex-1 truncate">{attachment.file_name}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => handleDownloadAttachment(attachment.file_path, attachment.file_name)}
                                        >
                                          <Download className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between mt-1 gap-2">
                                  <p className={`text-xs ${
                                    isFromCurrentUser 
                                      ? 'text-primary-foreground/70' 
                                      : 'text-muted-foreground'
                                  }`}>
                                    {format(new Date(message.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </p>
                                  
                                  {isFromCurrentUser && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => setMessageToDelete(message.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t bg-background">
                    {selectedFiles.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {selectedFiles.map((file, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {file.name}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => handleRemoveFile(index)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Input
                        placeholder="Digite sua mensagem..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        type="submit" 
                        size="sm" 
                        disabled={!messageText.trim() && selectedFiles.length === 0}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
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
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!messageToDelete} onOpenChange={() => setMessageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mensagem e seus anexos serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default InternalMessaging;
