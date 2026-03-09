import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { ConversationList, ConversationTab } from "../components/ConversationList";
import { ChatPanel } from "../components/ChatPanel";
import { ContactInfoPanel } from "../components/ContactInfoPanel";
import { Inbox, UserPlus } from "lucide-react";
import { normalizePhone, getPhoneVariant } from "@/utils/phoneUtils";
import { useWhatsAppSync } from "@/hooks/useWhatsAppSync";
import { toast } from "sonner";

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
  messageType: "text" | "image" | "audio" | "video" | "document";
  mediaUrl?: string;
}

interface WhatsAppInboxProps {
  initialConversationPhone?: string | null;
  onConversationOpened?: () => void;
}

interface TicketInfo {
  id: string;
  phone: string;
  status: string;
  accepted_at: string | null;
}

export const WhatsAppInbox = ({ initialConversationPhone, onConversationOpened }: WhatsAppInboxProps = {}) => {
  const { tenantId } = useTenantId();
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myAgentId, setMyAgentId] = useState<string | null | undefined>(undefined);
  const [myAgentName, setMyAgentName] = useState<string | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [profilePics, setProfilePics] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<ConversationTab>("open");
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [pendingMacro, setPendingMacro] = useState<any | null>(null);
  const [instanceProvider, setInstanceProvider] = useState<string>("zapi");

  // Buscar agent_id do usuário logado
  useEffect(() => {
    if (!tenantId) return;

    const findMyAgent = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.email) {
        setMyAgentId(null);
        return;
      }

      const { data } = await supabase
        .from("whatsapp_agents")
        .select("id, name")
        .eq("email", userData.user.email.toLowerCase())
        .eq("is_active", true)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      setMyAgentId(data?.id || null);
      setMyAgentName(data?.name || null);

      // Detect provider type for this agent's instance
      if (data?.id) {
        const { data: instance } = await supabase
          .from("whatsapp_instances")
          .select("provider")
          .eq("agent_id", data.id)
          .maybeSingle();
        setInstanceProvider(instance?.provider || "zapi");
      }
    };

    findMyAgent();
  }, [tenantId]);

  // Auto-select conversation from Kanban navigation
  useEffect(() => {
    if (initialConversationPhone && conversations.length > 0) {
      const normalized = normalizePhone(initialConversationPhone);
      const match = conversations.find(c => normalizePhone(c.contactNumber) === normalized);
      if (match) {
        setSelectedConversation(match);
      } else {
        setSelectedConversation({
          id: 'temp-' + normalized,
          contactName: normalized,
          contactNumber: normalized,
          lastMessage: '',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
        });
      }
      onConversationOpened?.();
    }
  }, [initialConversationPhone, conversations]);

  // Load tickets
  const loadTickets = useCallback(async () => {
    if (!myAgentId || !tenantId) return;
    const { data } = await supabase
      .from("whatsapp_tickets" as any)
      .select("id, phone, status, accepted_at")
      .eq("agent_id", myAgentId);
    setTickets((data as any) || []);
  }, [myAgentId, tenantId]);

  useEffect(() => {
    if (myAgentId) loadTickets();
  }, [myAgentId, loadTickets]);


  const loadConversations = useCallback(async (showLoading = true) => {
    if (!tenantId || myAgentId === undefined) return;
    
    if (showLoading) setIsLoading(true);
    try {
      if (!myAgentId) {
        setConversations([]);
        if (showLoading) setIsLoading(false);
        return;
      }

      const { data: sharedAccess } = await supabase
        .from("whatsapp_conversation_access" as any)
        .select("phone")
        .eq("agent_id", myAgentId);

      const sharedPhones = new Set<string>((sharedAccess || []).map((a: any) => a.phone));

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

      let sharedMessages: any[] = [];
      if (sharedPhones.size > 0) {
        const phoneArray = Array.from(sharedPhones);
        const orFilter = phoneArray.map(p => `from_number.eq.${p}`).join(",");
        const { data: sharedData } = await supabase
          .from("whatsapp_messages")
          .select("*")
          .eq("tenant_id", tenantId)
          .or(orFilter)
          .order("created_at", { ascending: false });
        sharedMessages = sharedData || [];
      }

      if (messagesResult.error) throw messagesResult.error;

      const contactNameMap = new Map<string, string>();
      contactsResult.data?.forEach(c => {
        contactNameMap.set(normalizePhone(c.phone), c.name);
        contactNameMap.set(c.phone, c.name);
      });

      const allMessages = [...(messagesResult.data || [])];
      const seenIds = new Set(allMessages.map(m => m.id));
      sharedMessages.forEach(m => {
        if (!seenIds.has(m.id)) {
          allMessages.push(m);
          seenIds.add(m.id);
        }
      });
      allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const conversationMap = new Map<string, WhatsAppConversation>();
      const unreadMap = new Map<string, number>();
      
      allMessages.forEach((msg) => {
        const normalizedNumber = normalizePhone(msg.from_number);
        
        if (msg.direction === 'received' && msg.is_read === false) {
          unreadMap.set(normalizedNumber, (unreadMap.get(normalizedNumber) || 0) + 1);
        }
        
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

      unreadMap.forEach((count, phone) => {
        const conv = conversationMap.get(phone);
        if (conv) conv.unreadCount = count;
      });

      const convList = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      setConversations(convList);

      if (myAgentId && convList.length > 0) {
        autoInsertToKanban(convList, myAgentId);
      }
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [tenantId, myAgentId]);

  const autoInsertToKanban = useCallback(async (convList: WhatsAppConversation[], agentId: string) => {
    try {
      const { data: columns } = await supabase
        .from("whatsapp_kanban_columns")
        .select("id")
        .eq("agent_id", agentId)
        .neq("name", "Transferidos")
        .order("column_order", { ascending: true })
        .limit(1);

      if (!columns || columns.length === 0) return;
      const firstColumnId = columns[0].id;

      const { data: existingCards } = await supabase
        .from("whatsapp_conversation_kanban")
        .select("phone")
        .eq("agent_id", agentId);

      const existingPhones = new Set(existingCards?.map(c => c.phone) || []);

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

      let hasSharedAccess = false;
      if (myAgentId) {
        const { data: access } = await supabase
          .from("whatsapp_conversation_access" as any)
          .select("id")
          .eq("agent_id", myAgentId)
          .eq("phone", normalized)
          .maybeSingle();
        hasSharedAccess = !!access;
      }
      
      let query = supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("tenant_id", tenantId);

      if (!hasSharedAccess && myAgentId) {
        query = query.eq("agent_id", myAgentId);
      }
      
      if (variant) {
        query = query.or(`from_number.eq.${normalized},from_number.eq.${variant}`);
      } else {
        query = query.eq("from_number", normalized);
      }
      
      const { data, error } = await query.order("created_at", { ascending: true });

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
  }, [tenantId, myAgentId]);

  // ✅ NOVO: Sistema de sincronização baseado em sinais do webhook
  useWhatsAppSync({
    onConversationUpdate: () => {
      console.log('📨 Sync signal: Updating conversations');
      loadConversations(false);
      loadTickets();
    },
    onMessageUpdate: (phone: string) => {
      if (selectedConversation && normalizePhone(phone) === normalizePhone(selectedConversation.contactNumber)) {
        console.log('📨 Sync signal: Updating messages for current conversation');
        loadMessages(selectedConversation.contactNumber);
      }
    },
    onCommanderActivity: (phone: string) => {
      console.log('🤖 Commander activity detected for phone:', phone?.slice(-4));
    },
    agentId: myAgentId,
    enabled: !!tenantId && myAgentId !== undefined
  });

  // Carrega conversações iniciais
  useEffect(() => {
    if (!tenantId || myAgentId === undefined) return;
    loadConversations();
  }, [tenantId, myAgentId, loadConversations]);

  // Carrega mensagens quando conversa é selecionada
  useEffect(() => {
    if (!selectedConversation || !tenantId) return;
    loadMessages(selectedConversation.contactNumber);
  }, [selectedConversation, tenantId, loadMessages]);

  // Polling removido — atualização acionada por sinal do webhook

  const handleSendMessage = async (text: string, messageType?: string, mediaUrl?: string) => {
    if (!selectedConversation || !tenantId) return;

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
          agentId: myAgentId || undefined,
        },
      });

      if (error) throw error;

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

  const handleContactSaved = useCallback(() => {
    setTimeout(() => {
      loadConversations(false);
    }, 2000);
  }, [loadConversations]);

  const handleFetchGroups = useCallback(async () => {
    if (!myAgentId || !tenantId) return;
    setIsLoadingGroups(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-list-groups", {
        body: { agentId: myAgentId },
      });
      if (error) throw error;
      if (data?.groups && data.groups.length > 0) {
        // Normalizar IDs: garantir sufixo @g.us
        const normalizedGroups = data.groups.map((g: any) => ({
          id: g.id.includes("@g.us") ? g.id : `${g.id}@g.us`,
          name: g.name,
        }));

        // Upsert em batch
        const contactsToUpsert = normalizedGroups.map((g: any) => ({
          phone: g.id,
          name: g.name,
          tenant_id: tenantId,
        }));

        const { error: upsertError } = await supabase
          .from("whatsapp_contacts")
          .upsert(contactsToUpsert, { onConflict: "tenant_id,phone" });

        if (upsertError) {
          console.error("Erro ao salvar grupos:", upsertError);
          toast.error("Grupos encontrados mas erro ao salvar.");
        } else {
          toast.success(`${normalizedGroups.length} grupos salvos.`);
        }

        setGroups(normalizedGroups);
      } else {
        toast.info("Nenhum grupo encontrado.");
      }
    } catch (error) {
      console.error("Erro ao buscar grupos:", error);
    } finally {
      setIsLoadingGroups(false);
    }
  }, [myAgentId, tenantId]);

  // Load saved groups from whatsapp_contacts on mount
  useEffect(() => {
    if (!tenantId) return;
    const loadSavedGroups = async () => {
      const { data } = await supabase
        .from("whatsapp_contacts")
        .select("phone, name")
        .eq("tenant_id", tenantId)
        .like("phone", "%@g.us");
      if (data) {
        setGroups(data.map(g => ({ id: g.phone, name: g.name })));
      }
    };
    loadSavedGroups();
  }, [tenantId]);

  // Ticket actions
  const handleAcceptTicket = useCallback(async () => {
    if (!selectedConversation || !myAgentId || !tenantId) return;
    const phone = normalizePhone(selectedConversation.contactNumber);
    
    // Check existing ticket
    const { data: existing } = await supabase
      .from("whatsapp_tickets" as any)
      .select("id")
      .eq("agent_id", myAgentId)
      .eq("phone", phone)
      .eq("status", "waiting")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("whatsapp_tickets" as any)
        .update({ status: "open", accepted_at: new Date().toISOString() })
        .eq("id", (existing as any).id);
    } else {
      await supabase
        .from("whatsapp_tickets" as any)
        .insert({ tenant_id: tenantId, agent_id: myAgentId, phone, status: "open", accepted_at: new Date().toISOString() });
    }
    toast.success("Ticket aceito!");
    loadTickets();
    setActiveTab("open");
  }, [selectedConversation, myAgentId, tenantId, loadTickets]);

  const handleCloseTicket = useCallback(async () => {
    if (!selectedConversation || !myAgentId) return;
    const phone = normalizePhone(selectedConversation.contactNumber);
    
    await supabase
      .from("whatsapp_tickets" as any)
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("agent_id", myAgentId)
      .eq("phone", phone)
      .eq("status", "open");

    toast.success("Ticket encerrado!");
    loadTickets();
    setActiveTab("closed");
  }, [selectedConversation, myAgentId, loadTickets]);

  const handleArchiveTicket = useCallback(async () => {
    if (!selectedConversation || !myAgentId) return;
    const phone = normalizePhone(selectedConversation.contactNumber);
    
    await supabase
      .from("whatsapp_tickets" as any)
      .update({ status: "archived" })
      .eq("agent_id", myAgentId)
      .eq("phone", phone);

    toast.success("Conversa arquivada!");
    loadTickets();
    setSelectedConversation(null);
    setActiveTab("archived");
  }, [selectedConversation, myAgentId, loadTickets]);

  const handleUnarchiveTicket = useCallback(async () => {
    if (!selectedConversation || !myAgentId) return;
    const phone = normalizePhone(selectedConversation.contactNumber);
    
    await supabase
      .from("whatsapp_tickets" as any)
      .update({ status: "waiting" })
      .eq("agent_id", myAgentId)
      .eq("phone", phone)
      .eq("status", "archived");

    toast.success("Conversa desarquivada!");
    loadTickets();
    setSelectedConversation(null);
    setActiveTab("waiting");
  }, [selectedConversation, myAgentId, loadTickets]);

  // Build ticket map
  const ticketMap = new Map<string, TicketInfo>();
  tickets.forEach(t => ticketMap.set(t.phone, t));

  // Filter conversations by tab
  const getFilteredConversations = () => {
    const isGroup = (c: WhatsAppConversation) => c.contactNumber.includes('@g.us');

    if (activeTab === "groups") {
      const groupConvs = conversations.filter(c => isGroup(c));
      const groupIds = new Set(groupConvs.map(c => c.contactNumber));
      const extraGroups: WhatsAppConversation[] = groups
        .filter(g => !groupIds.has(g.id))
        .map(g => ({
          id: `group-${g.id}`,
          contactName: g.name,
          contactNumber: g.id,
          lastMessage: "",
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
        }));
      return [...groupConvs, ...extraGroups];
    }

    const nonGroupConvs = conversations.filter(c => !isGroup(c));

    if (activeTab === "archived") {
      return nonGroupConvs.filter(c => {
        const ticket = ticketMap.get(normalizePhone(c.contactNumber));
        return ticket?.status === "archived";
      });
    }

    if (activeTab === "open") {
      return nonGroupConvs.filter(c => {
        const ticket = ticketMap.get(normalizePhone(c.contactNumber));
        return ticket?.status === "open";
      });
    }

    if (activeTab === "waiting") {
      return nonGroupConvs.filter(c => {
        const ticket = ticketMap.get(normalizePhone(c.contactNumber));
        return !ticket || ticket.status === "waiting";
      });
    }

    if (activeTab === "closed") {
      const now = Date.now();
      return nonGroupConvs.filter(c => {
        const ticket = ticketMap.get(normalizePhone(c.contactNumber));
        if (ticket?.status !== "closed") return false;
        if (ticket.accepted_at) {
          const closedAge = now - new Date(ticket.accepted_at).getTime();
          return closedAge < 24 * 60 * 60 * 1000;
        }
        return true;
      });
    }

    return nonGroupConvs;
  };

  // Tab counts
  const getTabCounts = () => {
    const isGroup = (c: WhatsAppConversation) => c.contactNumber.includes('@g.us');
    const nonGroupConvs = conversations.filter(c => !isGroup(c));
    const groupConvs = conversations.filter(c => isGroup(c));
    const now = Date.now();

    const openCount = nonGroupConvs.filter(c => {
      const ticket = ticketMap.get(normalizePhone(c.contactNumber));
      return ticket?.status === "open";
    }).length;

    const waitingCount = nonGroupConvs.filter(c => {
      const ticket = ticketMap.get(normalizePhone(c.contactNumber));
      return !ticket || ticket.status === "waiting";
    }).length;

    const closedCount = nonGroupConvs.filter(c => {
      const ticket = ticketMap.get(normalizePhone(c.contactNumber));
      if (ticket?.status !== "closed") return false;
      if (ticket.accepted_at) {
        return (now - new Date(ticket.accepted_at).getTime()) < 24 * 60 * 60 * 1000;
      }
      return true;
    }).length;

    const archivedCount = nonGroupConvs.filter(c => {
      const ticket = ticketMap.get(normalizePhone(c.contactNumber));
      return ticket?.status === "archived";
    }).length;

    return {
      open: openCount,
      waiting: waitingCount,
      groups: groupConvs.length + groups.filter(g => !groupConvs.some(c => c.contactNumber === g.id)).length,
      closed: closedCount,
      archived: archivedCount,
    };
  };

  // Get current ticket status for selected conversation
  const getSelectedTicketStatus = () => {
    if (!selectedConversation) return undefined;
    const ticket = ticketMap.get(normalizePhone(selectedConversation.contactNumber));
    return ticket?.status || "waiting";
  };

  const getSelectedAcceptedAt = () => {
    if (!selectedConversation) return undefined;
    const ticket = ticketMap.get(normalizePhone(selectedConversation.contactNumber));
    return ticket?.accepted_at || undefined;
  };

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

  const filteredConversations = getFilteredConversations();
  const enrichedConversations = filteredConversations.map(c => {
    const ticket = ticketMap.get(normalizePhone(c.contactNumber));
    return {
      ...c,
      ticketStatus: ticket?.status,
      acceptedAt: ticket?.accepted_at || undefined,
    };
  });

  return (
    <div className="flex h-full">
      <ConversationList
        conversations={enrichedConversations}
        selectedConversation={selectedConversation}
        onSelectConversation={(conv) => {
          setSelectedConversation(conv);
          if (myAgentId && conv.unreadCount > 0) {
            const normalized = normalizePhone(conv.contactNumber);
            const variant = getPhoneVariant(normalized);
            let markQuery = supabase
              .from("whatsapp_messages")
              .update({ is_read: true })
              .eq("tenant_id", tenantId!)
              .eq("agent_id", myAgentId)
              .eq("is_read", false)
              .eq("direction", "received");
            
            if (variant) {
              markQuery = markQuery.or(`from_number.eq.${normalized},from_number.eq.${variant}`);
            } else {
              markQuery = markQuery.eq("from_number", normalized);
            }
            
            markQuery.then(() => {
              setConversations(prev => prev.map(c => 
                c.contactNumber === conv.contactNumber ? { ...c, unreadCount: 0 } : c
              ));
            });
          }
        }}
        isLoading={isLoading}
        groups={groups}
        onFetchGroups={instanceProvider !== "meta" ? handleFetchGroups : undefined}
        isLoadingGroups={isLoadingGroups}
        profilePics={profilePics}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setSelectedConversation(null); }}
        tabCounts={getTabCounts()}
        tenantId={tenantId}
      />

      <ChatPanel
        conversation={selectedConversation}
        messages={messages}
        onSendMessage={handleSendMessage}
        ticketStatus={getSelectedTicketStatus()}
        onAcceptTicket={handleAcceptTicket}
        onCloseTicket={handleCloseTicket}
        onArchiveTicket={handleArchiveTicket}
        onUnarchiveTicket={handleUnarchiveTicket}
        activeTab={activeTab}
        selectedMacro={pendingMacro}
        onClearMacro={() => setPendingMacro(null)}
        agentId={myAgentId}
        tenantId={tenantId}
      />

      {selectedConversation && (
        <ContactInfoPanel 
          conversation={selectedConversation} 
          onContactSaved={handleContactSaved}
          currentAgentId={myAgentId}
          currentAgentName={myAgentName}
          tenantId={tenantId}
          profilePicUrl={profilePics[selectedConversation.contactNumber]}
          onProfilePicFetched={(phone, url) => setProfilePics(prev => ({ ...prev, [phone]: url }))}
          onTransferComplete={() => {
            setSelectedConversation(null);
            loadConversations();
          }}
          onMacroSelect={(macro) => setPendingMacro(macro)}
        />
      )}
    </div>
  );
};
