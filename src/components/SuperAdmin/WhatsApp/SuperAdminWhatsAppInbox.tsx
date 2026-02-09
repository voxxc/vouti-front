import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ConversationList } from "@/components/WhatsApp/components/ConversationList";
import { ChatPanel } from "@/components/WhatsApp/components/ChatPanel";
import { ContactInfoPanel } from "@/components/WhatsApp/components/ContactInfoPanel";
import { 
  WhatsAppConversation, 
  WhatsAppMessage 
} from "@/components/WhatsApp/sections/WhatsAppInbox";

// Normaliza telefone brasileiro (12 dígitos → 13 dígitos com nono dígito)
const normalizePhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    const ddd = cleaned.substring(2, 4);
    const number = cleaned.substring(4);
    return `55${ddd}9${number}`;
  }
  return cleaned;
};

// Gera variante sem o 9 para busca retroativa
const getPhoneVariant = (phone: string): string | null => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    return cleaned.substring(0, 4) + cleaned.substring(5);
  }
  return null;
};

export const SuperAdminWhatsAppInbox = () => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Effect para carregar conversas e subscription real-time
  useEffect(() => {
    loadConversations();

    // Subscription real-time para atualizar lista de conversas
    // Para Super Admin: filtrar mensagens onde tenant_id IS NULL
    const conversationsChannel = supabase
      .channel('superadmin-whatsapp-conversations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          // Verificar se é mensagem sem tenant_id (Super Admin)
          const newMsg = payload.new as any;
          if (newMsg.tenant_id === null) {
            loadConversations(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
    };
  }, []);

  // Effect para carregar mensagens e subscription real-time da conversa selecionada
  useEffect(() => {
    if (!selectedConversation) return;

    // Carregar mensagens iniciais
    loadMessages(selectedConversation.contactNumber);

    // Subscription real-time para novas mensagens
    const messagesChannel = supabase
      .channel(`superadmin-whatsapp-messages-${selectedConversation.contactNumber}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          const newMsg = payload.new as any;
          
          // Verificar se é da conversa atual e sem tenant_id
          if (newMsg.tenant_id === null && newMsg.from_number === selectedConversation.contactNumber) {
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
  }, [selectedConversation]);

  // Função estabilizada para carregar conversas
  const loadConversations = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      // Super Admin: buscar mensagens e contatos em paralelo
      const [messagesResult, contactsResult] = await Promise.all([
        supabase
          .from("whatsapp_messages")
          .select("*")
          .is("tenant_id", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("whatsapp_contacts")
          .select("phone, name")
          .is("tenant_id", null)
      ]);

      if (messagesResult.error) throw messagesResult.error;

      // Criar mapa de nomes de contatos (normalizado)
      const contactNameMap = new Map<string, string>();
      contactsResult.data?.forEach(c => {
        contactNameMap.set(normalizePhone(c.phone), c.name);
        contactNameMap.set(c.phone, c.name); // manter original também
      });

      // Agrupar mensagens por número de telefone (normalizado)
      const conversationMap = new Map<string, WhatsAppConversation>();
      
      messagesResult.data?.forEach((msg) => {
        const normalizedNumber = normalizePhone(msg.from_number);
        if (!conversationMap.has(normalizedNumber)) {
          conversationMap.set(normalizedNumber, {
            id: msg.id,
            contactName: contactNameMap.get(normalizedNumber) || contactNameMap.get(msg.from_number) || normalizedNumber,
            contactNumber: normalizedNumber,
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
  }, []);

  // Função estabilizada para carregar mensagens
  const loadMessages = useCallback(async (contactNumber: string) => {
    try {
      // Super Admin: buscar mensagens onde tenant_id IS NULL
      // Buscar por ambos os formatos (com e sem 9) para retrocompatibilidade
      const normalized = normalizePhone(contactNumber);
      const variant = getPhoneVariant(normalized);
      
      let query = supabase
        .from("whatsapp_messages")
        .select("*")
        .is("tenant_id", null);
      
      if (variant) {
        query = query.or(`from_number.eq.${normalized},from_number.eq.${variant}`);
      } else {
        query = query.eq("from_number", normalized);
      }
      
      const { data, error } = await query.order("created_at", { ascending: true });

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
  }, []);

  // Polling automático para atualizar conversas a cada 2 segundos
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadConversations(false);
    }, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [loadConversations]);

  // Polling automático para atualizar mensagens da conversa ativa a cada 2 segundos
  useEffect(() => {
    if (!selectedConversation) return;

    const intervalId = setInterval(() => {
      loadMessages(selectedConversation.contactNumber);
    }, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [selectedConversation, loadMessages]);


  const handleSendMessage = async (text: string) => {
    if (!selectedConversation) return;

    try {
      // Enviar via Z-API com mode: 'superadmin'
      const { data, error } = await supabase.functions.invoke("whatsapp-send-message", {
        body: {
          phone: selectedConversation.contactNumber,
          message: text,
          messageType: "text",
          mode: "superadmin"
        }
      });

      if (error) throw error;

      // Não precisa recarregar manualmente - o real-time vai detectar o INSERT
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  // Callback para refresh após salvar contato
  const handleContactSaved = useCallback(() => {
    setTimeout(() => {
      loadConversations(false);
    }, 2000);
  }, [loadConversations]);

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
        <ContactInfoPanel 
          conversation={selectedConversation} 
          onContactSaved={handleContactSaved}
        />
      )}
    </div>
  );
};
