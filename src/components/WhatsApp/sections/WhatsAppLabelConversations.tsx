import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";
import { ConversationList } from "../components/ConversationList";
import { ChatPanel } from "../components/ChatPanel";
import { ContactInfoPanel } from "../components/ContactInfoPanel";
import { WhatsAppConversation, WhatsAppMessage } from "./WhatsAppInbox";
import { normalizePhone } from "@/utils/phoneUtils";
import { loadLatestMessages } from "@/utils/whatsappMessageLoader";
import { useWhatsAppSync } from "@/hooks/useWhatsAppSync";
import { Loader2, Tag } from "lucide-react";

interface WhatsAppLabelConversationsProps {
  labelId: string;
  labelName: string;
}

export const WhatsAppLabelConversations = ({ labelId, labelName }: WhatsAppLabelConversationsProps) => {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myAgentId, setMyAgentId] = useState<string | null>(null);
  const [myAgentName, setMyAgentName] = useState<string | null>(null);
  const [profilePics, setProfilePics] = useState<Record<string, string>>({});

  // Load agent info
  useEffect(() => {
    const loadAgent = async () => {
      if (!user?.email || !tenantId) return;
      const { data } = await supabase
        .from("whatsapp_agents")
        .select("id, name")
        .eq("email", user.email.toLowerCase())
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .maybeSingle();
      setMyAgentId(data?.id || null);
      setMyAgentName(data?.name || null);
    };
    loadAgent();
  }, [user?.email, tenantId]);

  // Load conversations filtered by label
  const loadConversations = useCallback(async (showLoading = true) => {
    if (!labelId) return;
    if (showLoading) setIsLoading(true);

    try {
      // 1. Get contact IDs with this label
      const { data: contactLabels, error: clError } = await supabase
        .from("whatsapp_contact_labels")
        .select("contact_id")
        .eq("label_id", labelId);

      if (clError) throw clError;
      if (!contactLabels || contactLabels.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      const contactIds = contactLabels.map(cl => cl.contact_id);

      // 2. Get contact phones
      const { data: contacts, error: cError } = await supabase
        .from("whatsapp_contacts")
        .select("id, phone, name")
        .in("id", contactIds);

      if (cError) throw cError;
      if (!contacts || contacts.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      const phoneToName = new Map<string, string>();
      const phones: string[] = [];
      contacts.forEach(c => {
        const normalized = normalizePhone(c.phone);
        phoneToName.set(normalized, c.name);
        phones.push(normalized);
      });

      // 3. Get latest messages for these phones
      let msgQuery = supabase
        .from("whatsapp_messages")
        .select("id, from_number, message_text, created_at, agent_id")
        .order("created_at", { ascending: false });

      if (tenantId) {
        msgQuery = msgQuery.eq("tenant_id", tenantId);
      }

      const { data: msgs } = await msgQuery;

      // Group by phone, only include labeled phones
      const conversationMap = new Map<string, WhatsAppConversation>();
      msgs?.forEach((msg: any) => {
        const normalized = normalizePhone(msg.from_number);
        if (phones.includes(normalized) && !conversationMap.has(normalized)) {
          conversationMap.set(normalized, {
            id: msg.id,
            contactName: phoneToName.get(normalized) || msg.from_number,
            contactNumber: msg.from_number,
            lastMessage: msg.message_text || "",
            lastMessageTime: msg.created_at,
            unreadCount: 0,
          });
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error("Erro ao carregar conversas por etiqueta:", error);
    } finally {
      setIsLoading(false);
    }
  }, [labelId, tenantId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);


  // Load messages for selected conversation
  const loadMessages = useCallback(async (contactNumber: string) => {
    try {
      const result = await loadLatestMessages({
        contactNumber,
        tenantId,
        skipAgentFilter: true,
      });
      setMessages(result.messages);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  }, [tenantId]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.contactNumber);
    }
  }, [selectedConversation, loadMessages]);

  // ✅ NOVO: Sistema de sincronização baseado em sinais do webhook
  useWhatsAppSync({
    onConversationUpdate: () => {
      console.log('📨 Label Conversations: Sync signal received, updating conversations');
      loadConversations(false);
    },
    onMessageUpdate: (phone: string) => {
      if (selectedConversation && normalizePhone(phone) === normalizePhone(selectedConversation.contactNumber)) {
        console.log('📨 Label Conversations: Updating messages for current conversation');
        loadMessages(selectedConversation.contactNumber);
      }
    },
    enabled: !!tenantId
  });

  const handleSendMessage = async (text: string, messageType?: string, mediaUrl?: string) => {
    if (!selectedConversation) return;
    try {
      const { error } = await supabase.functions.invoke("whatsapp-send-message", {
        body: {
          phone: selectedConversation.contactNumber,
          message: text,
          messageType: messageType || "text",
          mediaUrl: mediaUrl || undefined,
          agentName: myAgentName || undefined,
          agentId: myAgentId || undefined,
        },
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
        <Tag className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Etiqueta: {labelName}</h2>
        <span className="text-xs text-muted-foreground ml-auto">
          {conversations.length} conversa{conversations.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <ConversationList
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
          isLoading={false}
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
            profilePicUrl={profilePics[selectedConversation.contactNumber]}
            onProfilePicFetched={(phone, url) => setProfilePics(prev => ({ ...prev, [phone]: url }))}
            onTransferComplete={() => {
              setSelectedConversation(null);
              loadConversations();
            }}
          />
        )}
      </div>
    </div>
  );
};
