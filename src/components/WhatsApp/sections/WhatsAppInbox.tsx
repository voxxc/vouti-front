import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { ConversationList } from "../components/ConversationList";
import { ChatPanel } from "../components/ChatPanel";
import { ContactInfoPanel } from "../components/ContactInfoPanel";

export interface WhatsAppConversation {
  id: string;
  contactName: string;
  contactNumber: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  avatarUrl?: string;
}

export interface WhatsAppMessage {
  id: string;
  messageText: string;
  direction: "incoming" | "outgoing";
  timestamp: string;
  isFromMe: boolean;
}

export const WhatsAppInbox = () => {
  const { tenantId } = useTenantId();
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Effect para carregar conversas e subscription real-time
  useEffect(() => {
    if (!tenantId) return;

    loadConversations();

    // Subscription real-time para atualizar lista de conversas
    const conversationsChannel = supabase
      .channel('whatsapp-conversations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => {
          // Recarregar lista de conversas quando nova mensagem chegar
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
    };
  }, [tenantId]);

  // Effect para carregar mensagens e subscription real-time da conversa selecionada
  useEffect(() => {
    if (!selectedConversation || !tenantId) return;

    // Carregar mensagens iniciais
    loadMessages(selectedConversation.contactNumber);

    // Subscription real-time para novas mensagens
    const messagesChannel = supabase
      .channel(`whatsapp-messages-${selectedConversation.contactNumber}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          const newMsg = payload.new as any;
          
          // Verificar se é da conversa atual
          if (newMsg.from_number === selectedConversation.contactNumber) {
            const formattedMsg: WhatsAppMessage = {
              id: newMsg.id,
              messageText: newMsg.message_text || "",
              direction: newMsg.direction === "outgoing" ? "outgoing" : "incoming",
              timestamp: newMsg.created_at,
              isFromMe: newMsg.direction === "outgoing",
            };
            
            // Adicionar mensagem evitando duplicação
            setMessages(prev => {
              if (prev.some(m => m.id === formattedMsg.id)) {
                return prev;
              }
              return [...prev, formattedMsg];
            });
          }
        }
      )
      .subscribe();

    // Cleanup ao desmontar ou trocar conversa
    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedConversation, tenantId]);

  const loadConversations = async (showLoading = true) => {
    if (!tenantId) return;
    
    if (showLoading) setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Agrupar mensagens por número de telefone
      const conversationMap = new Map<string, WhatsAppConversation>();
      
      data?.forEach((msg) => {
        const number = msg.from_number;
        if (!conversationMap.has(number)) {
          conversationMap.set(number, {
            id: msg.id,
            contactName: number, // TODO: buscar nome do contato
            contactNumber: number,
            lastMessage: msg.message_text || "",
            lastMessageTime: msg.created_at,
            unreadCount: 0,
          });
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Polling automático para atualizar conversas a cada 2 segundos
  useEffect(() => {
    if (!tenantId) return;

    const intervalId = setInterval(() => {
      loadConversations(false);
    }, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [tenantId]);

  // Polling automático para atualizar mensagens da conversa ativa a cada 2 segundos
  useEffect(() => {
    if (!selectedConversation || !tenantId) return;

    const intervalId = setInterval(() => {
      loadMessages(selectedConversation.contactNumber);
    }, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [selectedConversation, tenantId]);

  const loadMessages = async (contactNumber: string) => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("from_number", contactNumber)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formattedMessages: WhatsAppMessage[] = (data || []).map((msg) => ({
        id: msg.id,
        messageText: msg.message_text || "",
        direction: msg.direction === "outgoing" ? "outgoing" : "incoming",
        timestamp: msg.created_at,
        isFromMe: msg.direction === "outgoing",
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedConversation || !tenantId) return;

    try {
      // Enviar via Z-API
      const { data, error } = await supabase.functions.invoke("whatsapp-send-message", {
        body: {
          phone: selectedConversation.contactNumber,
          message: text,
          messageType: "text"
        }
      });

      if (error) throw error;

      // Não precisa recarregar manualmente - o real-time vai detectar o INSERT
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  return (
    <div className="flex h-full">
      {/* Lista de Conversas */}
      <ConversationList
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversation}
        isLoading={isLoading}
      />

      {/* Painel de Chat */}
      <ChatPanel
        conversation={selectedConversation}
        messages={messages}
        onSendMessage={handleSendMessage}
      />

      {/* Painel de Info do Contato */}
      {selectedConversation && (
        <ContactInfoPanel conversation={selectedConversation} />
      )}
    </div>
  );
};
