import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SupportTicket {
  id: string;
  user_id: string;
  tenant_id: string | null;
  subject: string;
  status: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  user_email?: string;
  user_name?: string;
  tenant_name?: string;
  unread_count?: number;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  content: string;
  is_read: boolean;
  created_at: string;
  // Joined
  sender_name?: string;
}

export function useSupportTickets(isSuperAdmin: boolean = false) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      
      // Enrich with user/tenant info for super admin
      if (isSuperAdmin && data) {
        const enrichedTickets = await Promise.all(
          data.map(async (ticket: any) => {
            // Get user info
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('user_id', ticket.user_id)
              .single();
            
            // Get tenant info
            let tenantName = null;
            if (ticket.tenant_id) {
              const { data: tenantData } = await supabase
                .from('tenants')
                .select('name')
                .eq('id', ticket.tenant_id)
                .single();
              tenantName = tenantData?.name;
            }

            // Get unread count
            const { count } = await supabase
              .from('support_messages')
              .select('*', { count: 'exact', head: true })
              .eq('ticket_id', ticket.id)
              .eq('sender_type', 'user')
              .eq('is_read', false);

            return {
              ...ticket,
              user_email: profileData?.email,
              user_name: profileData?.full_name,
              tenant_name: tenantName,
              unread_count: count || 0
            };
          })
        );
        setTickets(enrichedTickets);
      } else {
        setTickets((data as SupportTicket[]) || []);
      }
    } catch (error: any) {
      console.error('Erro ao buscar tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (subject: string, initialMessage: string, tenantId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      // Create ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          tenant_id: tenantId || null,
          subject
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create initial message
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticketData.id,
          sender_id: user.id,
          sender_type: 'user',
          content: initialMessage
        });

      if (messageError) throw messageError;

      toast({ title: 'Ticket criado com sucesso' });
      return ticketData;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar ticket',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', ticketId);

      if (error) throw error;
      
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status } : ticket
      ));
      
      toast({ title: 'Status atualizado' });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchTickets();

    // Real-time subscription
    const channel = supabase
      .channel('support-tickets-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSuperAdmin]);

  return {
    tickets,
    loading,
    createTicket,
    updateTicketStatus,
    refetch: fetchTickets
  };
}

export function useSupportMessages(ticketId: string | null) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchMessages = async () => {
    if (!ticketId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as SupportMessage[]) || []);
    } catch (error: any) {
      console.error('Erro ao buscar mensagens:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string, senderType: 'user' | 'admin') => {
    if (!ticketId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          sender_type: senderType,
          content
        });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const markAsRead = async () => {
    if (!ticketId) return;

    try {
      await supabase
        .from('support_messages')
        .update({ is_read: true })
        .eq('ticket_id', ticketId)
        .eq('is_read', false);
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
    }
  };

  useEffect(() => {
    fetchMessages();

    if (!ticketId) return;

    // Real-time subscription
    const channel = supabase
      .channel(`support-messages-${ticketId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as SupportMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  return {
    messages,
    loading,
    sendMessage,
    markAsRead,
    refetch: fetchMessages
  };
}
