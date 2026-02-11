import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";
import { ConversationList } from "../components/ConversationList";
import { ChatPanel } from "../components/ChatPanel";
import { ContactInfoPanel } from "../components/ContactInfoPanel";
import { WhatsAppConversation, WhatsAppMessage } from "./WhatsAppInbox";

interface AllConversationsItem extends WhatsAppConversation {
  agentId?: string;
  agentName?: string;
}

export const WhatsAppAllConversations = () => {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<AllConversationsItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<AllConversationsItem | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [myAgentName, setMyAgentName] = useState<string | null>(null);
  const [myAgentId, setMyAgentId] = useState<string | null>(null);

  // Check if user is super admin + fetch agent name
  useEffect(() => {
    const init = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsSuperAdmin(!!data);

      // Fetch agent name for current user
      const email = user.email?.toLowerCase();
      if (email && tenantId) {
        const { data: agent } = await supabase
          .from("whatsapp_agents")
          .select("id, name")
          .eq("email", email)
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .maybeSingle();
        setMyAgentName(agent?.name || null);
        setMyAgentId(agent?.id || null);
      }
    };
    init();
  }, [user?.id, tenantId]);

  // Load all conversations with agent info
  const loadConversations = useCallback(async (showLoading = true) => {
    if (!tenantId && !isSuperAdmin) return;
    
    if (showLoading) setIsLoading(true);
    try {
      let query = supabase
        .from("whatsapp_messages")
        .select(`
          *,
          whatsapp_agents!agent_id(id, name)
        `)
        .order("created_at", { ascending: false });

      // Filter by tenant unless super admin
      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      } else if (isSuperAdmin) {
        query = query.is("tenant_id", null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group messages by phone number, keeping agent info
      const conversationMap = new Map<string, AllConversationsItem>();
      
      data?.forEach((msg: any) => {
        const number = msg.from_number;
        const key = `${number}-${msg.agent_id || 'no-agent'}`;
        
        if (!conversationMap.has(key)) {
          conversationMap.set(key, {
            id: msg.id,
            contactName: number,
            contactNumber: number,
            lastMessage: msg.message_text || "",
            lastMessageTime: msg.created_at,
            unreadCount: 0,
            agentId: msg.agent_id,
            agentName: msg.whatsapp_agents?.name || "Sem agente",
          });
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [tenantId, isSuperAdmin]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (contactNumber: string) => {
    if (!tenantId && !isSuperAdmin) return;

    try {
      let query = supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("from_number", contactNumber)
        .order("created_at", { ascending: true });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      } else if (isSuperAdmin) {
        query = query.is("tenant_id", null);
      }

      const { data, error } = await query;

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
  }, [tenantId, isSuperAdmin]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Real-time subscription
  useEffect(() => {
    if (!tenantId && !isSuperAdmin) return;

    const filter = tenantId 
      ? `tenant_id=eq.${tenantId}` 
      : `tenant_id=is.null`;

    const channel = supabase
      .channel('all-conversations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter
        },
        () => loadConversations(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, isSuperAdmin, loadConversations]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.contactNumber);
    }
  }, [selectedConversation, loadMessages]);

  // Polling for updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadConversations(false);
    }, 2000);

    return () => clearInterval(intervalId);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversation) return;

    const intervalId = setInterval(() => {
      loadMessages(selectedConversation.contactNumber);
    }, 2000);

    return () => clearInterval(intervalId);
  }, [selectedConversation, loadMessages]);

  const handleSendMessage = async (text: string) => {
    if (!selectedConversation) return;

    try {
      const { error } = await supabase.functions.invoke("whatsapp-send-message", {
        body: {
          phone: selectedConversation.contactNumber,
          message: text,
          messageType: "text",
          agentName: myAgentName || undefined,
          agentId: myAgentId || undefined
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  return (
    <div className="flex h-full">
      <ConversationList
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversation}
        isLoading={isLoading}
        showAgentBadge={true}
      />

      <ChatPanel
        conversation={selectedConversation}
        messages={messages}
        onSendMessage={handleSendMessage}
      />

      {selectedConversation && (
        <ContactInfoPanel
          conversation={selectedConversation}
          currentAgentId={myAgentId}
          currentAgentName={myAgentName}
          tenantId={tenantId}
          onTransferComplete={() => {
            setSelectedConversation(null);
            loadConversations();
          }}
        />
      )}
    </div>
  );
};
