import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";
import { ConversationList } from "../components/ConversationList";
import { ChatPanel } from "../components/ChatPanel";
import { ContactInfoPanel } from "../components/ContactInfoPanel";
import { WhatsAppConversation, WhatsAppMessage } from "./WhatsAppInbox";
import { normalizePhone, getPhoneVariant } from "@/utils/phoneUtils";
import { useWhatsAppSync } from "@/hooks/useWhatsAppSync";

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
  const [profilePics, setProfilePics] = useState<Record<string, string>>({});

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

      // Fetch contacts in parallel
      const contactsQuery = tenantId
        ? supabase.from("whatsapp_contacts").select("phone, name").eq("tenant_id", tenantId)
        : null;

      const [messagesResult, contactsResult] = await Promise.all([
        query,
        contactsQuery || Promise.resolve({ data: [], error: null }),
      ]);

      if (messagesResult.error) throw messagesResult.error;

      // Build contact name map
      const contactNameMap = new Map<string, string>();
      (contactsResult.data as any[] || []).forEach((c: any) => {
        contactNameMap.set(normalizePhone(c.phone), c.name);
        contactNameMap.set(c.phone, c.name);
      });

      // Group messages by normalized phone (no agent duplication)
      const conversationMap = new Map<string, AllConversationsItem>();
      
      (messagesResult.data as any[] || []).forEach((msg: any) => {
        const number = msg.from_number;
        const normalizedNumber = normalizePhone(number);
        
        if (!conversationMap.has(normalizedNumber)) {
          conversationMap.set(normalizedNumber, {
            id: msg.id,
            contactName: contactNameMap.get(normalizedNumber) || contactNameMap.get(number) || number,
            contactNumber: normalizedNumber,
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
      const normalized = normalizePhone(contactNumber);
      const variant = getPhoneVariant(normalized);
      
      let query = supabase
        .from("whatsapp_messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (variant) {
        query = query.or(`from_number.eq.${normalized},from_number.eq.${variant}`);
      } else {
        query = query.eq("from_number", normalized);
      }

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      } else if (isSuperAdmin) {
        query = query.is("tenant_id", null);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedMessages: WhatsAppMessage[] = (data || []).map((msg) => {
        const rawData = msg.raw_data as any;
        return {
          id: msg.id,
          messageText: msg.message_text || "",
          direction: msg.direction === "outgoing" ? "outgoing" as const : "incoming" as const,
          timestamp: msg.created_at,
          isFromMe: msg.direction === "outgoing",
          messageType: (msg.message_type as WhatsAppMessage['messageType']) || "text",
          mediaUrl: rawData?.image?.imageUrl || rawData?.audio?.audioUrl || rawData?.video?.videoUrl || rawData?.document?.documentUrl || undefined,
        };
      });

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

  // Realtime para mensagens da conversa selecionada
  useEffect(() => {
    if (!selectedConversation || (!tenantId && !isSuperAdmin)) return;

    const filter = tenantId 
      ? `tenant_id=eq.${tenantId}` 
      : `tenant_id=is.null`;

    const channel = supabase
      .channel('all-conv-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter
        },
        () => loadMessages(selectedConversation.contactNumber)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, tenantId, isSuperAdmin, loadMessages]);

  const handleSendMessage = async (text: string, messageType?: string, mediaUrl?: string) => {
    if (!selectedConversation) return;

    try {
      let freshAgentName = myAgentName;
      if (myAgentId) {
        const { data: agentData } = await supabase
          .from("whatsapp_agents")
          .select("name")
          .eq("id", myAgentId)
          .single();
        if (agentData) freshAgentName = agentData.name;
      }

      const { error } = await supabase.functions.invoke("whatsapp-send-message", {
        body: {
          phone: selectedConversation.contactNumber,
          message: text,
          messageType: messageType || "text",
          mediaUrl: mediaUrl || undefined,
          agentName: freshAgentName || undefined,
          agentId: myAgentId || undefined
        }
      });

      if (error) throw error;

      // Optimistic message for immediate feedback
      const optimisticMsg: WhatsAppMessage = {
        id: `optimistic_${Date.now()}`,
        messageText: text,
        direction: "outgoing",
        timestamp: new Date().toISOString(),
        isFromMe: true,
        messageType: (messageType as WhatsAppMessage['messageType']) || "text",
        mediaUrl,
      };
      setMessages(prev => [...prev, optimisticMsg]);
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
        profilePics={profilePics}
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
          conversationAgentId={selectedConversation.agentId}
          conversationAgentName={selectedConversation.agentName}
          profilePicUrl={profilePics[selectedConversation.contactNumber]}
          onProfilePicFetched={(phone, url) => setProfilePics(prev => ({ ...prev, [phone]: url }))}
          onTransferComplete={() => {
            setSelectedConversation(null);
            loadConversations();
          }}
        />
      )}
    </div>
  );
};
