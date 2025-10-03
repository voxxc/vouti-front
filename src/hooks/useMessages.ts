import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

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
  attachments?: MessageAttachment[];
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
          .select(`
            *,
            attachments:message_attachments(*)
          `)
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
        async (payload) => {
          const newMessage = payload.new as Message;
          if (newMessage.sender_id === userId || newMessage.receiver_id === userId) {
            // Fetch attachments for the new message
            const { data: attachments } = await supabase
              .from('message_attachments')
              .select('*')
              .eq('message_id', newMessage.id);
            
            setMessages(prev => [...prev, { ...newMessage, attachments: attachments || [] }]);
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
              prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m)
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
  }, [userId]);

  const sendMessage = async (
    receiverId: string, 
    content: string, 
    messageType: 'direct' | 'mention' | 'notification' = 'direct',
    relatedProjectId?: string,
    files?: File[]
  ) => {
    try {
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: userId,
          receiver_id: receiverId,
          content,
          message_type: messageType,
          related_project_id: relatedProjectId
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Upload files if any
      if (files && files.length > 0 && messageData) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${userId}/${messageData.id}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('message-attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Create attachment record
          const { error: attachmentError } = await supabase
            .from('message_attachments')
            .insert({
              message_id: messageData.id,
              file_name: file.name,
              file_path: fileName,
              file_size: file.size,
              file_type: file.type
            });

          if (attachmentError) throw attachmentError;
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      // Delete message (attachments will cascade delete)
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (error) throw error;
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

  const downloadAttachment = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('message-attachments')
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      throw error;
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    deleteMessage,
    markAsRead,
    getUserMessages,
    getUnreadCount,
    downloadAttachment
  };
};
