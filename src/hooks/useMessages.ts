import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
}

export const useMessages = (userId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const sendMessage = async (
    receiverId: string, 
    content: string, 
    messageType: 'direct' | 'mention' | 'notification' = 'direct',
    relatedProjectId?: string
  ) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: userId,
          receiver_id: receiverId,
          content,
          message_type: messageType,
          related_project_id: relatedProjectId
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
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
    markAsRead,
    getUserMessages,
    getUnreadCount
  };
};