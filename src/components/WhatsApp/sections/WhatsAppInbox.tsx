import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { ConversationList } from "../components/ConversationList";
import { ChatPanel } from "../components/ChatPanel";
import { ContactInfoPanel } from "../components/ContactInfoPanel";
import { Inbox, UserPlus } from "lucide-react";

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

const getPhoneVariant = (phone: string): string | null => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    return cleaned.substring(0, 4) + cleaned.substring(5);
  }
  return null;
};

export const WhatsAppInbox = () => {
  const { tenantId } = useTenantId();
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myAgentId, setMyAgentId] = useState<string | null | undefined>(undefined); // undefined = loading
  const [myAgentName, setMyAgentName] = useState<string | null>(null);

  // Buscar agent_id do usuário logado
  useEffect(() => {
    const findMyAgent = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.email) {
        setMyAgentId(null);
        return;
      }

      let query = supabase
        .from("whatsapp_agents")
        .select("id, name")
        .eq("email", userData.user.email.toLowerCase())
        .eq("is_active", true);

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      } else {
        query = query.is("tenant_id", null);
      }

      const { data } = await query.maybeSingle();
      setMyAgentId(data?.id || null);
      setMyAgentName(data?.name || null);
    };

    findMyAgent();
  }, [tenantId]);

  // Effect para carregar conversas e subscription real-time
  useEffect(() => {
    if (!tenantId || myAgentId === undefined) return;

    loadConversations();

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
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
    };
  }, [tenantId, myAgentId]);

  // Effect para carregar mensagens e subscription real-time da conversa selecionada
  useEffect(() => {
    if (!selectedConversation || !tenantId) return;

    loadMessages(selectedConversation.contactNumber);

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
          
          if (newMsg.from_number === selectedConversation.contactNumber) {
            const formattedMsg: WhatsAppMessage = {
              id: newMsg.id,
              messageText: newMsg.message_text || "",
              direction: newMsg.direction === "outgoing" ? "outgoing" : "incoming",
              timestamp: newMsg.created_at,
              isFromMe: newMsg.direction === "outgoing",
            };
            
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

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedConversation, tenantId]);

  const loadConversations = useCallback(async (showLoading = true) => {
    if (!tenantId || myAgentId === undefined) return;
    
    if (showLoading) setIsLoading(true);
    try {
      // Se não tem agente, não carrega nada
      if (!myAgentId) {
        setConversations([]);
        if (showLoading) setIsLoading(false);
        return;
      }

      let messagesQuery = supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("agent_id", myAgentId)
        .order("created_at", { ascending: false });

      const [messagesResult, contactsResult] = await Promise.all([
        messagesQuery,
        supabase
          .from("whatsapp_contacts")
          .select("phone, name")
          .eq("tenant_id", tenantId)
      ]);

      if (messagesResult.error) throw messagesResult.error;

      const contactNameMap = new Map<string, string>();
      contactsResult.data?.forEach(c => {
        contactNameMap.set(normalizePhone(c.phone), c.name);
        contactNameMap.set(c.phone, c.name);
      });

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

      const convList = Array.from(conversationMap.values());
      setConversations(convList);

      // Auto-inserir novos contatos no Kanban "Topo de Funil"
      if (myAgentId && convList.length > 0) {
        autoInsertToKanban(convList, myAgentId);
      }
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [tenantId, myAgentId]);

  // Auto-inserir conversas no Topo de Funil do Kanban
  const autoInsertToKanban = useCallback(async (convList: WhatsAppConversation[], agentId: string) => {
    try {
      // Buscar primeira coluna (Topo de Funil)
      const { data: columns } = await supabase
        .from("whatsapp_kanban_columns")
        .select("id")
        .eq("agent_id", agentId)
        .order("column_order", { ascending: true })
        .limit(1);

      if (!columns || columns.length === 0) return;
      const firstColumnId = columns[0].id;

      // Buscar cards existentes
      const { data: existingCards } = await supabase
        .from("whatsapp_conversation_kanban")
        .select("phone")
        .eq("agent_id", agentId);

      const existingPhones = new Set(existingCards?.map(c => c.phone) || []);

      // Inserir contatos novos
      const newCards = convList
        .filter(c => !existingPhones.has(c.contactNumber))
        .map((c, idx) => ({
          tenant_id: tenantId,
          agent_id: agentId,
          phone: c.contactNumber,
          column_id: firstColumnId,
          card_order: existingPhones.size + idx,
        }));

      if (newCards.length > 0) {
        await supabase
          .from("whatsapp_conversation_kanban")
          .insert(newCards);
      }
    } catch (error) {
      console.error("Erro ao auto-inserir no kanban:", error);
    }
  }, [tenantId]);

  const loadMessages = useCallback(async (contactNumber: string) => {
    if (!tenantId) return;

    try {
      const normalized = normalizePhone(contactNumber);
      const variant = getPhoneVariant(normalized);
      
      let query = supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("tenant_id", tenantId);

      if (myAgentId) {
        query = query.eq("agent_id", myAgentId);
      }
      
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
  }, [tenantId, myAgentId]);

  // Polling automático para conversas
  useEffect(() => {
    if (!tenantId || myAgentId === undefined) return;

    const intervalId = setInterval(() => {
      loadConversations(false);
    }, 2000);

    return () => clearInterval(intervalId);
  }, [tenantId, loadConversations, myAgentId]);

  // Polling automático para mensagens
  useEffect(() => {
    if (!selectedConversation || !tenantId) return;

    const intervalId = setInterval(() => {
      loadMessages(selectedConversation.contactNumber);
    }, 2000);

    return () => clearInterval(intervalId);
  }, [selectedConversation, tenantId, loadMessages]);

  const handleSendMessage = async (text: string) => {
    if (!selectedConversation || !tenantId) return;

    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send-message", {
        body: {
          phone: selectedConversation.contactNumber,
          message: text,
          messageType: "text",
          agentName: myAgentName || undefined
        }
      });

      if (error) throw error;

      const optimisticMsg: WhatsAppMessage = {
        id: crypto.randomUUID(),
        messageText: text,
        direction: "outgoing",
        timestamp: new Date().toISOString(),
        isFromMe: true,
      };
      setMessages(prev => [...prev, optimisticMsg]);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  const handleContactSaved = useCallback(() => {
    setTimeout(() => {
      loadConversations(false);
    }, 2000);
  }, [loadConversations]);

  // Estado: ainda carregando agent_id
  if (myAgentId === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Estado: usuário não tem agente
  if (myAgentId === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md space-y-4">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
            <UserPlus className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Caixa de Entrada Vazia</h3>
          <p className="text-muted-foreground">
            Para receber mensagens aqui, crie um Agente para si em{" "}
            <span className="font-medium text-foreground">Configurações → Agentes → "Criar Meu Agente"</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <ConversationList
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversation}
        isLoading={isLoading}
      />

      <ChatPanel
        conversation={selectedConversation}
        messages={messages}
        onSendMessage={handleSendMessage}
      />

      {selectedConversation && (
        <ContactInfoPanel 
          conversation={selectedConversation} 
          onContactSaved={handleContactSaved}
        />
      )}
    </div>
  );
};
