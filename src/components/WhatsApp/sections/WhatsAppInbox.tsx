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

  useEffect(() => {
    if (tenantId) {
      loadConversations();
    }
  }, [tenantId]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.contactNumber);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

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

      // Recarregar mensagens
      await loadMessages(selectedConversation.contactNumber);
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
