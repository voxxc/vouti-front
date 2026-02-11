import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Columns3, Loader2, User, Phone, Clock, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChatPanel } from "../components/ChatPanel";
import { ContactInfoPanel } from "../components/ContactInfoPanel";
import { WhatsAppConversation, WhatsAppMessage } from "./WhatsAppInbox";

interface WhatsAppKanbanProps {
  agentId: string;
  agentName: string;
}

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  column_order: number;
}

interface KanbanCard {
  id: string;
  phone: string;
  column_id: string | null;
  card_order: number;
  contactName?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  agentName?: string;
}

// Calcula tempo relativo compacto
const getRelativeTime = (dateString?: string): string => {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 0) {
    const remainHr = diffHr % 24;
    return `${diffDay}D${remainHr}HR`;
  }
  if (diffHr > 0) {
    const remainMin = diffMin % 60;
    return `${diffHr}HR${remainMin}MIN`;
  }
  return `${diffMin}MIN`;
};

// Normaliza telefone
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

export const WhatsAppKanban = ({ agentId, agentName }: WhatsAppKanbanProps) => {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Chat inline state
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [chatMessages, setChatMessages] = useState<WhatsAppMessage[]>([]);

  // Load kanban data
  const loadKanbanData = useCallback(async () => {
    if (!agentId) return;

    setIsLoading(true);
    try {
      const [columnsRes, cardsRes, messagesRes, contactsRes] = await Promise.all([
        supabase
          .from("whatsapp_kanban_columns")
          .select("*")
          .eq("agent_id", agentId)
          .order("column_order"),
        supabase
          .from("whatsapp_conversation_kanban")
          .select("*")
          .eq("agent_id", agentId),
        supabase
          .from("whatsapp_messages")
          .select("from_number, message_text, created_at")
          .eq("agent_id", agentId)
          .order("created_at", { ascending: false }),
        supabase
          .from("whatsapp_contacts")
          .select("phone, name")
      ]);

      if (columnsRes.error) throw columnsRes.error;

      let columnsData = columnsRes.data || [];
      if (columnsData.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: retryData } = await supabase
          .from("whatsapp_kanban_columns")
          .select("*")
          .eq("agent_id", agentId)
          .order("column_order");
        columnsData = retryData || [];
      }
      setColumns(columnsData);

      // Build contact name map
      const contactNameMap = new Map<string, string>();
      contactsRes.data?.forEach(c => {
        contactNameMap.set(normalizePhone(c.phone), c.name);
        contactNameMap.set(c.phone, c.name);
      });

      // Build last message map
      const messageMap = new Map<string, { text: string; time: string }>();
      messagesRes.data?.forEach((msg: any) => {
        const normalized = normalizePhone(msg.from_number);
        if (!messageMap.has(normalized)) {
          messageMap.set(normalized, {
            text: msg.message_text || "",
            time: msg.created_at,
          });
        }
      });

      const enrichedCards: KanbanCard[] = (cardsRes.data || []).map((card: any) => {
        const normalized = normalizePhone(card.phone);
        return {
          ...card,
          contactName: contactNameMap.get(normalized) || contactNameMap.get(card.phone) || card.phone,
          lastMessage: messageMap.get(normalized)?.text || "",
          lastMessageTime: messageMap.get(normalized)?.time || "",
          agentName,
        };
      });

      setCards(enrichedCards);
    } catch (error) {
      console.error("Erro ao carregar Kanban:", error);
      toast.error("Erro ao carregar dados do Kanban");
    } finally {
      setIsLoading(false);
    }
  }, [agentId, agentName]);

  useEffect(() => {
    loadKanbanData();
  }, [loadKanbanData]);

  // Load messages for chat panel
  const loadChatMessages = useCallback(async (contactNumber: string) => {
    if (!tenantId) return;
    const normalized = normalizePhone(contactNumber);
    const variant = getPhoneVariant(normalized);

    let query = supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("agent_id", agentId);

    if (variant) {
      query = query.or(`from_number.eq.${normalized},from_number.eq.${variant}`);
    } else {
      query = query.eq("from_number", normalized);
    }

    const { data, error } = await query.order("created_at", { ascending: true });
    if (error) {
      console.error("Erro ao carregar mensagens:", error);
      return;
    }

    setChatMessages((data || []).map((msg) => ({
      id: msg.id,
      messageText: msg.message_text || "",
      direction: msg.direction === "outgoing" ? "outgoing" as const : "incoming" as const,
      timestamp: msg.created_at,
      isFromMe: msg.direction === "outgoing",
    })));
  }, [tenantId, agentId]);

  // Poll messages for open chat
  useEffect(() => {
    if (!selectedConversation) return;
    loadChatMessages(selectedConversation.contactNumber);
    const interval = setInterval(() => {
      loadChatMessages(selectedConversation.contactNumber);
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedConversation, loadChatMessages]);

  // Handle card click -> open chat
  const handleCardClick = (card: KanbanCard) => {
    setSelectedConversation({
      id: card.id,
      contactName: card.contactName || card.phone,
      contactNumber: card.phone,
      lastMessage: card.lastMessage || "",
      lastMessageTime: card.lastMessageTime || "",
      unreadCount: 0,
    });
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedConversation || !tenantId) return;
    try {
      await supabase.functions.invoke("whatsapp-send-message", {
        body: {
          phone: selectedConversation.contactNumber,
          message: text,
          messageType: "text"
        }
      });
      setChatMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        messageText: text,
        direction: "outgoing" as const,
        timestamp: new Date().toISOString(),
        isFromMe: true,
      }]);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;

    setCards(prev => prev.map(card => {
      if (card.phone === draggableId) {
        return {
          ...card,
          column_id: destination.droppableId === "no-column" ? null : destination.droppableId,
          card_order: destination.index,
        };
      }
      return card;
    }));

    try {
      const { error } = await supabase
        .from("whatsapp_conversation_kanban")
        .upsert({
          tenant_id: tenantId || null,
          agent_id: agentId,
          phone: draggableId,
          column_id: destination.droppableId === "no-column" ? null : destination.droppableId,
          card_order: destination.index,
        }, {
          onConflict: tenantId ? 'tenant_id,agent_id,phone' : 'agent_id,phone'
        });
      if (error) throw error;
    } catch (error) {
      console.error("Erro ao atualizar posição:", error);
      toast.error("Erro ao mover card");
      loadKanbanData();
    }
  };

  const getCardsInColumn = (columnId: string | null) => {
    return cards
      .filter(card => card.column_id === columnId)
      .sort((a, b) => a.card_order - b.card_order);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Kanban Board */}
      <div className={cn("flex flex-col flex-1 p-6 overflow-hidden", selectedConversation && "max-w-[55%]")}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Columns3 className="h-5 w-5" />
              Kanban CRM
            </h2>
            <p className="text-sm text-muted-foreground">
              Pipeline: <span className="font-medium text-foreground">{agentName}</span>
            </p>
          </div>
        </div>

        {/* Board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-3 pb-4 min-h-full">
              {columns.map((column) => (
                <Droppable key={column.id} droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "w-64 min-w-64 bg-muted/50 rounded-lg p-3 flex flex-col max-h-[calc(100vh-220px)]",
                        snapshot.isDraggingOver && "bg-primary/5 ring-2 ring-primary/20"
                      )}
                    >
                      {/* Column Header */}
                      <div className="flex items-center gap-2 mb-3 shrink-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: column.color }}
                        />
                        <h3 className="font-semibold text-xs truncate uppercase tracking-wide">{column.name}</h3>
                        <Badge variant="secondary" className="ml-auto shrink-0 text-[10px] h-5">
                          {getCardsInColumn(column.id).length}
                        </Badge>
                      </div>

                      {/* Cards */}
                      <ScrollArea className="flex-1">
                        <div className="space-y-2 pr-1">
                          {getCardsInColumn(column.id).map((card, index) => (
                            <Draggable key={card.phone} draggableId={card.phone} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={cn(
                                    "p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
                                    snapshot.isDragging && "shadow-lg ring-2 ring-primary/30",
                                    selectedConversation?.contactNumber === card.phone && "ring-2 ring-primary"
                                  )}
                                  onClick={() => handleCardClick(card)}
                                >
                                  {/* Card Header - Title */}
                                  <p className="font-semibold text-sm truncate mb-1">
                                    {card.contactName || "Sem Título"}
                                  </p>

                                  {/* Agent + Status */}
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary">
                                      {card.agentName}
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                      Aberto
                                    </Badge>
                                  </div>

                                  {/* Last message */}
                                  {card.lastMessage && (
                                    <p className="text-xs text-muted-foreground truncate mb-2">
                                      {card.lastMessage}
                                    </p>
                                  )}

                                  {/* Footer: avatar + name + time */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <Avatar className="h-5 w-5">
                                        <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                                          {(card.contactName || card.phone).charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs font-medium truncate max-w-[80px]">
                                        {card.contactName || card.phone}
                                      </span>
                                    </div>
                                    {card.lastMessageTime && (
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                        <Clock className="h-2.5 w-2.5" />
                                        {getRelativeTime(card.lastMessageTime)}
                                      </span>
                                    )}
                                  </div>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </div>
        </DragDropContext>

        {columns.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
            <Columns3 className="h-12 w-12 mb-4 opacity-50" />
            <p>Nenhuma coluna encontrada para este agente.</p>
            <p className="text-sm">As colunas padrão serão criadas automaticamente.</p>
          </div>
        )}
      </div>

      {/* Chat Panel inline */}
      {selectedConversation && (
        <div className="flex border-l border-border">
          <div className="relative flex-1 flex flex-col min-w-[400px]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 h-7 w-7"
              onClick={() => setSelectedConversation(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            <ChatPanel
              conversation={selectedConversation}
              messages={chatMessages}
              onSendMessage={handleSendMessage}
            />
          </div>
          <ContactInfoPanel
            conversation={selectedConversation}
            onContactSaved={() => loadKanbanData()}
          />
        </div>
      )}
    </div>
  );
};
