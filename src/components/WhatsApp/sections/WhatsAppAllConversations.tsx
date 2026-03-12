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
      // Fetch contacts in parallel with RPC
      const contactsQuery = tenantId
        ? supabase.from("whatsapp_contacts").select("phone, name").eq("tenant_id", tenantId)
        : null;

      let rpcPromise;
      if (tenantId) {
        rpcPromise = supabase.rpc('get_tenant_conversations', { p_tenant_id: tenantId });
      } else {
        // Super admin without tenant — fallback to raw query (limited)
        rpcPromise = supabase
          .from("whatsapp_messages")
          .select("from_number, message_text, created_at, agent_id, whatsapp_agents!agent_id(name)")
          .is("tenant_id", null)
          .order("created_at", { ascending: false })
          .limit(500) as any;
      }

      const [rpcResult, contactsResult] = await Promise.all([
        rpcPromise,
        contactsQuery || Promise.resolve({ data: [], error: null }),
      ]);

      if (rpcResult.error) throw rpcResult.error;

      // Build contact name map
      const contactNameMap = new Map<string, string>();
      (contactsResult.data as any[] || []).forEach((c: any) => {
        contactNameMap.set(normalizePhone(c.phone), c.name);
        contactNameMap.set(c.phone, c.name);
      });

      // Map results to conversations
      const conversationMap = new Map<string, AllConversationsItem>();

      if (tenantId) {
        // RPC result — already grouped
        (rpcResult.data || []).forEach((row: any) => {
          const normalizedNumber = normalizePhone(row.from_number);
          if (!conversationMap.has(normalizedNumber)) {
            conversationMap.set(normalizedNumber, {
              id: `conv-${normalizedNumber}`,
              contactName: contactNameMap.get(normalizedNumber) || contactNameMap.get(row.from_number) || normalizedNumber,
              contactNumber: normalizedNumber,
              lastMessage: row.last_message || "",
              lastMessageTime: row.last_message_time,
              unreadCount: Number(row.unread_count) || 0,
              agentId: row.agent_id,
              agentName: row.agent_name || "Sem agente",
            });
          }
        });
      } else {
        // Super admin fallback — group manually
        (rpcResult.data || []).forEach((msg: any) => {
          const normalizedNumber = normalizePhone(msg.from_number);
          if (!conversationMap.has(normalizedNumber)) {
            conversationMap.set(normalizedNumber, {
              id: msg.id || `conv-${normalizedNumber}`,
              contactName: contactNameMap.get(normalizedNumber) || normalizedNumber,
              contactNumber: normalizedNumber,
              lastMessage: msg.message_text || "",
              lastMessageTime: msg.created_at,
              unreadCount: 0,
              agentId: msg.agent_id,
              agentName: msg.whatsapp_agents?.name || "Sem agente",
            });
          }
        });
      }

      const sorted = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      setConversations(sorted);
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

  // Carrega conversações iniciais
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ✅ NOVO: Sistema de sincronização baseado em sinais do webhook
  useWhatsAppSync({
    onConversationUpdate: () => {
      console.log('📨 All Conversations: Sync signal received, updating conversations');
      loadConversations(false);
    },
    onMessageUpdate: (phone: string) => {
      if (selectedConversation && normalizePhone(phone) === normalizePhone(selectedConversation.contactNumber)) {
        console.log('📨 All Conversations: Updating messages for current conversation');
        loadMessages(selectedConversation.contactNumber);
      }
    },
    agentId: myAgentId,
    enabled: !!((tenantId && !isSuperAdmin) || isSuperAdmin)
  });

  // Carrega mensagens quando conversa é selecionada
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.contactNumber);
    }
  }, [selectedConversation, loadMessages]);


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
