import { useState, useRef, useEffect } from 'react';
import { useSupportTickets, useSupportMessages, SupportTicket } from '@/hooks/useSupportTickets';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  Search, 
  MessageSquare, 
  Building2, 
  User,
  Clock,
  Send,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'aberto', label: 'Aberto', color: 'bg-blue-500' },
  { value: 'em_atendimento', label: 'Em Atendimento', color: 'bg-yellow-500' },
  { value: 'fechado', label: 'Fechado', color: 'bg-green-500' },
];

export function SuperAdminSupport() {
  const { tickets, loading, updateTicketStatus, refetch } = useSupportTickets(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
      ticket.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      ticket.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      ticket.tenant_name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge className={`${statusOption?.color || 'bg-gray-500'} text-white`}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  const handleOpenChat = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setChatOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Suporte Multi-Tenant</h2>
          <p className="text-muted-foreground">
            {tickets.length} tickets de suporte
          </p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por assunto, usuario ou tenant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STATUS_OPTIONS.map(status => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {STATUS_OPTIONS.map(status => {
          const count = tickets.filter(t => t.status === status.value).length;
          const unread = tickets
            .filter(t => t.status === status.value)
            .reduce((acc, t) => acc + (t.unread_count || 0), 0);
          return (
            <div 
              key={status.value}
              className="p-4 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${status.color}`} />
                <span className="text-sm text-muted-foreground">{status.label}</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold">{count}</p>
                {unread > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {unread} novas
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Assunto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ultima Mensagem</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum ticket encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredTickets.map(ticket => (
                <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{ticket.tenant_name || 'Sem tenant'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{ticket.user_name || 'Usuario'}</div>
                        <div className="text-xs text-muted-foreground">{ticket.user_email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{ticket.subject}</span>
                      {(ticket.unread_count || 0) > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {ticket.unread_count}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={ticket.status}
                      onValueChange={(value) => updateTicketStatus(ticket.id, value)}
                    >
                      <SelectTrigger className="w-[150px] h-8">
                        <SelectValue>{getStatusBadge(ticket.status)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {format(new Date(ticket.last_message_at), "dd/MM HH:mm", { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenChat(ticket)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Chat
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Chat Sheet */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {selectedTicket?.subject}
            </SheetTitle>
            <div className="text-sm text-muted-foreground">
              {selectedTicket?.tenant_name} - {selectedTicket?.user_name}
            </div>
          </SheetHeader>
          
          {selectedTicket && (
            <SupportChatPanel 
              ticketId={selectedTicket.id} 
              isSuperAdmin={true}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Chat Panel Component (reused)
function SupportChatPanel({ 
  ticketId, 
  isSuperAdmin 
}: { 
  ticketId: string; 
  isSuperAdmin: boolean;
}) {
  const { messages, loading, sendMessage, markAsRead } = useSupportMessages(ticketId);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (isSuperAdmin) {
      markAsRead();
    }
  }, [messages, isSuperAdmin]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    setSending(true);
    try {
      await sendMessage(newMessage, isSuperAdmin ? 'admin' : 'user');
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
    <div className="flex flex-col h-[calc(100vh-150px)] mt-4">
      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 pr-4">
        <div className="space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col max-w-[80%] p-3 rounded-lg",
                message.sender_type === 'admin'
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
      <div className="flex gap-2 pt-4 border-t mt-4">
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
