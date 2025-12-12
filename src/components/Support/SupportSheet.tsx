import { useState, useRef, useEffect } from 'react';
import { useSupportTickets, useSupportMessages, SupportTicket } from '@/hooks/useSupportTickets';
import { useTenantId } from '@/hooks/useTenantId';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Loader2,
  ArrowLeft,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportSheet({ open, onOpenChange }: SupportSheetProps) {
  const { tenantId } = useTenantId();
  const { tickets, loading, createTicket } = useSupportTickets(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newTicketDialog, setNewTicketDialog] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    
    setCreating(true);
    try {
      const ticket = await createTicket(newSubject, newMessage, tenantId || undefined);
      setNewTicketDialog(false);
      setNewSubject('');
      setNewMessage('');
      setSelectedTicket(ticket as SupportTicket);
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto': return 'bg-blue-500';
      case 'em_atendimento': return 'bg-yellow-500';
      case 'fechado': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:max-w-[400px] p-0">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center gap-2">
              {selectedTicket && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSelectedTicket(null)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <SheetTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {selectedTicket ? selectedTicket.subject : 'Suporte'}
              </SheetTitle>
            </div>
          </SheetHeader>
          
          {selectedTicket ? (
            <SupportChatView ticketId={selectedTicket.id} />
          ) : (
            <div className="flex flex-col h-[calc(100vh-80px)]">
              {/* New Ticket Button */}
              <div className="p-4 border-b">
                <Button 
                  className="w-full"
                  onClick={() => setNewTicketDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Ticket
                </Button>
              </div>

              {/* Tickets List */}
              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum ticket de suporte ainda.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Clique em "Novo Ticket" para iniciar uma conversa.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {tickets.map(ticket => (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{ticket.subject}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`${getStatusColor(ticket.status)} text-white text-xs`}>
                                {ticket.status === 'aberto' ? 'Aberto' : 
                                 ticket.status === 'em_atendimento' ? 'Em Atendimento' : 'Fechado'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(new Date(ticket.last_message_at), "dd/MM", { locale: ptBR })}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* New Ticket Dialog */}
      <Dialog open={newTicketDialog} onOpenChange={setNewTicketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Ticket de Suporte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Assunto</label>
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Descreva brevemente o problema..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mensagem</label>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Descreva seu problema em detalhes..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTicketDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateTicket}
              disabled={creating || !newSubject.trim() || !newMessage.trim()}
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Chat View Component
function SupportChatView({ ticketId }: { ticketId: string }) {
  const { messages, loading, sendMessage } = useSupportMessages(ticketId);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    setSending(true);
    try {
      await sendMessage(newMessage, 'user');
      setNewMessage('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col max-w-[85%] p-3 rounded-lg",
                message.sender_type === 'user'
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <span className="text-xs opacity-70 mt-1">
                {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex gap-2 p-4 border-t">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          disabled={sending}
        />
        <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
