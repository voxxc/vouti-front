import { useState, useEffect, useCallback, useRef } from "react";
import { normalizePhone, getPhoneVariant } from "@/utils/phoneUtils";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Columns3, Loader2, Clock, Plus, Lock, LockOpen, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AddKanbanCardDialog } from "../components/AddKanbanCardDialog";

interface WhatsAppKanbanProps {
  agentId: string;
  agentName: string;
  onOpenConversation?: (phone: string) => void;
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
  transferredFromAgentName?: string;
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

// Phone utils importado do utilitário compartilhado

export const WhatsAppKanban = ({ agentId, agentName, onOpenConversation }: WhatsAppKanbanProps) => {
  const { tenantId } = useTenantId();
  
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragLocked, setIsDragLocked] = useState(false);

  const [showAddCardDialog, setShowAddCardDialog] = useState(false);
  const isDraggingRef = useRef(false);

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
          transferredFromAgentName: card.transferred_from_agent_name || undefined,
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

  // Silent refresh (no spinner, no toast)
  const silentRefresh = useCallback(async () => {
    if (!agentId || isDraggingRef.current) return;
    try {
      const [columnsRes, cardsRes, messagesRes, contactsRes] = await Promise.all([
        supabase.from("whatsapp_kanban_columns").select("*").eq("agent_id", agentId).order("column_order"),
        supabase.from("whatsapp_conversation_kanban").select("*").eq("agent_id", agentId),
        supabase.from("whatsapp_messages").select("from_number, message_text, created_at").eq("agent_id", agentId).order("created_at", { ascending: false }),
        supabase.from("whatsapp_contacts").select("phone, name"),
      ]);
      if (columnsRes.error || cardsRes.error) return;

      setColumns(columnsRes.data || []);

      const contactNameMap = new Map<string, string>();
      contactsRes.data?.forEach(c => {
        contactNameMap.set(normalizePhone(c.phone), c.name);
        contactNameMap.set(c.phone, c.name);
      });

      const messageMap = new Map<string, { text: string; time: string }>();
      messagesRes.data?.forEach((msg: any) => {
        const normalized = normalizePhone(msg.from_number);
        if (!messageMap.has(normalized)) {
          messageMap.set(normalized, { text: msg.message_text || "", time: msg.created_at });
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
          transferredFromAgentName: card.transferred_from_agent_name || undefined,
        };
      });
      setCards(enrichedCards);
    } catch {
      // silent
    }
  }, [agentId, agentName]);

  // Polling every 2 seconds
  useEffect(() => {
    const interval = setInterval(silentRefresh, 2000);
    return () => clearInterval(interval);
  }, [silentRefresh]);

  // Handle card click -> navigate to inbox
  const handleCardClick = (card: KanbanCard) => {
    if (onOpenConversation) {
      onOpenConversation(card.phone);
    }
  };
  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = async (result: DropResult) => {
    setTimeout(() => { isDraggingRef.current = false; }, 3000);

    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceColId = source.droppableId === "no-column" ? null : source.droppableId;
    const destColId = destination.droppableId === "no-column" ? null : destination.droppableId;

    const sourceCards = cards
      .filter(c => c.column_id === sourceColId)
      .sort((a, b) => a.card_order - b.card_order);

    const movedCard = sourceCards.find(c => c.id === draggableId);
    if (!movedCard) return;

    sourceCards.splice(source.index, 1);

    let destCards: KanbanCard[];
    if (sourceColId === destColId) {
      destCards = sourceCards;
    } else {
      destCards = cards
        .filter(c => c.column_id === destColId)
        .sort((a, b) => a.card_order - b.card_order);
    }

    const updatedCard = { ...movedCard, column_id: destColId };
    destCards.splice(destination.index, 0, updatedCard);

    const updates: { id: string; column_id: string | null; card_order: number }[] = [];

    destCards.forEach((card, idx) => {
      updates.push({ id: card.id, column_id: destColId, card_order: idx });
    });

    if (sourceColId !== destColId) {
      sourceCards.forEach((card, idx) => {
        updates.push({ id: card.id, column_id: sourceColId, card_order: idx });
      });
    }

    setCards(prev => {
      const updated = [...prev];
      updates.forEach(upd => {
        const idx = updated.findIndex(c => c.id === upd.id);
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], column_id: upd.column_id, card_order: upd.card_order };
        }
      });
      return updated;
    });

    try {
      await Promise.all(
        updates.map(upd =>
          supabase
            .from("whatsapp_conversation_kanban")
            .update({ column_id: upd.column_id, card_order: upd.card_order })
            .eq("id", upd.id)
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar posições:", error);
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
      <div className="flex flex-col flex-1 p-6 overflow-hidden">
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
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => setIsDragLocked(prev => !prev)}
                  >
                    {isDragLocked ? (
                      <Lock className="h-4 w-4 text-destructive" />
                    ) : (
                      <LockOpen className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isDragLocked ? "Cards travados — clique para destravar" : "Cards destravados — clique para travar"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button size="sm" variant="outline" onClick={() => setShowAddCardDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Card
            </Button>
          </div>
        </div>

        {/* Board */}
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-3 pb-4 min-h-full">
              {columns.map((column) => (
                <Droppable key={column.id} droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
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

                      {/* Cards - ref inside to ensure full droppable area */}
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 overflow-y-auto min-h-[100px]"
                      >
                        <div className="space-y-2 pr-1">
                          {getCardsInColumn(column.id).map((card, index) => (
                            <Draggable key={card.id} draggableId={card.id} index={index} isDragDisabled={isDragLocked}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={cn(
                                    "p-3 hover:shadow-md transition-shadow",
                                    isDragLocked ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
                                    snapshot.isDragging && "shadow-lg ring-2 ring-primary/30",
                                  )}
                                  onClick={() => handleCardClick(card)}
                                >
                                  {/* Card Header - Title */}
                                  <p className="font-semibold text-sm truncate mb-1">
                                    {card.contactName || "Sem Título"}
                                  </p>

                                  {/* Agent + Status + Transferred */}
                                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary">
                                      {card.agentName}
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                      Aberto
                                    </Badge>
                                    {card.transferredFromAgentName && (
                                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-orange-400/50 text-orange-600 dark:text-orange-400">
                                        <ArrowRightLeft className="h-2.5 w-2.5 mr-0.5" />
                                        De: {card.transferredFromAgentName}
                                      </Badge>
                                    )}
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
                      </div>
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



      {/* Add Card Dialog */}
      <AddKanbanCardDialog
        open={showAddCardDialog}
        onOpenChange={setShowAddCardDialog}
        agentId={agentId}
        tenantId={tenantId}
        onCardAdded={loadKanbanData}
      />
    </div>
  );
};
