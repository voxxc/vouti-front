import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  related_project_id?: string;
  message_type: 'direct' | 'mention' | 'notification';
  created_at: string;
  updated_at: string;
  tenant_id?: string;
}

export const useMessages = (userId?: string) => {
  const { tenantId } = useTenantId();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !tenantId) {
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        // CRITICAL: Filter messages by tenant_id for complete data isolation
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('tenant_id', tenantId)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setMessages((data || []) as Message[]);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Set up real-time subscription
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (newMessage.sender_id === userId || newMessage.receiver_id === userId) {
            setMessages(prev => [...prev, newMessage]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          if (updatedMessage.sender_id === userId || updatedMessage.receiver_id === userId) {
            setMessages(prev => 
              prev.map(m => m.id === updatedMessage.id ? updatedMessage : m)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const deletedMessage = payload.old as Message;
          setMessages(prev => prev.filter(m => m.id !== deletedMessage.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, tenantId]);

  const sendMessage = async (
    receiverId: string, 
    content: string, 
    messageType: 'direct' | 'mention' | 'notification' = 'direct',
    relatedProjectId?: string,
    attachments?: File[]
  ) => {
    try {
      // Insert message first - include tenant_id for data isolation
      const { data: newMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: userId,
          receiver_id: receiverId,
          content,
          message_type: messageType,
          related_project_id: relatedProjectId,
          tenant_id: tenantId
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Upload attachments if any
      if (attachments && attachments.length > 0 && newMessage) {
        for (const file of attachments) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${userId}/${newMessage.id}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('message-attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Save attachment metadata
          await supabase.from('message_attachments').insert({
            message_id: newMessage.id,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            file_type: file.type,
            tenant_id: tenantId
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .eq('receiver_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const getUserMessages = (otherUserId: string) => {
    return messages.filter(msg => 
      (msg.sender_id === userId && msg.receiver_id === otherUserId) ||
      (msg.sender_id === otherUserId && msg.receiver_id === userId)
    );
  };

  const getUnreadCount = (fromUserId: string) => {
    return messages.filter(msg => 
      msg.sender_id === fromUserId && 
      msg.receiver_id === userId && 
      !msg.is_read
    ).length;
  };

  return {
    messages,
    loading,
    sendMessage,
    deleteMessage,
    markAsRead,
    getUserMessages,
    getUnreadCount
  };
};
