import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Columns3, Loader2, User, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
}

export const WhatsAppKanban = ({ agentId, agentName }: WhatsAppKanbanProps) => {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Check if super admin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsSuperAdmin(!!data);
    };
    checkSuperAdmin();
  }, [user?.id]);

  // Load kanban data
  const loadKanbanData = useCallback(async () => {
    if (!agentId) return;

    setIsLoading(true);
    try {
      // Load columns for this agent
      let columnsQuery = supabase
        .from("whatsapp_kanban_columns")
        .select("*")
        .eq("agent_id", agentId)
        .order("column_order");

      const { data: columnsData, error: columnsError } = await columnsQuery;
      if (columnsError) throw columnsError;

      // If no columns exist, they will be created by the trigger
      if (!columnsData || columnsData.length === 0) {
        // Wait a bit and retry - trigger should have created them
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: retryData } = await supabase
          .from("whatsapp_kanban_columns")
          .select("*")
          .eq("agent_id", agentId)
          .order("column_order");
        setColumns(retryData || []);
      } else {
        setColumns(columnsData);
      }

      // Load conversation positions
      let cardsQuery = supabase
        .from("whatsapp_conversation_kanban")
        .select("*")
        .eq("agent_id", agentId);

      const { data: cardsData, error: cardsError } = await cardsQuery;
      if (cardsError) throw cardsError;

      // Also load conversations from messages to get contact info
      let messagesQuery = supabase
        .from("whatsapp_messages")
        .select("from_number, message_text")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false });

      const { data: messagesData } = await messagesQuery;

      // Build contact info map
      const contactMap = new Map<string, { name: string; lastMessage: string }>();
      messagesData?.forEach((msg: any) => {
        if (!contactMap.has(msg.from_number)) {
          contactMap.set(msg.from_number, {
            name: msg.from_number,
            lastMessage: msg.message_text || "",
          });
        }
      });

      // Merge card data with contact info
      const enrichedCards = (cardsData || []).map((card: any) => ({
        ...card,
        contactName: contactMap.get(card.phone)?.name || card.phone,
        lastMessage: contactMap.get(card.phone)?.lastMessage || "",
      }));

      setCards(enrichedCards);
    } catch (error) {
      console.error("Erro ao carregar Kanban:", error);
      toast.error("Erro ao carregar dados do Kanban");
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadKanbanData();
  }, [loadKanbanData]);

  // Handle drag end
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, source, destination } = result;

    // Optimistic update
    setCards(prev => {
      const updated = prev.map(card => {
        if (card.phone === draggableId) {
          return {
            ...card,
            column_id: destination.droppableId === "no-column" ? null : destination.droppableId,
            card_order: destination.index,
          };
        }
        return card;
      });
      return updated;
    });

    // Persist to database
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
      // Reload on error
      loadKanbanData();
    }
  };

  // Get cards for a specific column
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
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Columns3 className="h-5 w-5" />
            Kanban CRM
          </h2>
          <p className="text-sm text-muted-foreground">
            Pipeline do agente: <span className="font-medium text-foreground">{agentName}</span>
          </p>
        </div>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 pb-4 min-h-full">
            {columns.map((column) => (
              <Droppable key={column.id} droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "w-72 min-w-72 bg-muted/50 rounded-lg p-4 flex flex-col max-h-[calc(100vh-200px)]",
                      snapshot.isDraggingOver && "bg-primary/5 ring-2 ring-primary/20"
                    )}
                  >
                    {/* Column Header */}
                    <div className="flex items-center gap-2 mb-4 shrink-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: column.color }}
                      />
                      <h3 className="font-semibold text-sm truncate">{column.name}</h3>
                      <Badge variant="secondary" className="ml-auto shrink-0">
                        {getCardsInColumn(column.id).length}
                      </Badge>
                    </div>

                    {/* Cards */}
                    <ScrollArea className="flex-1">
                      <div className="space-y-2 pr-2">
                        {getCardsInColumn(column.id).map((card, index) => (
                          <Draggable key={card.phone} draggableId={card.phone} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "p-3 cursor-grab active:cursor-grabbing",
                                  snapshot.isDragging && "shadow-lg ring-2 ring-primary/30"
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {card.contactName}
                                    </p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                      <Phone className="h-3 w-3" />
                                      {card.phone}
                                    </p>
                                    {card.lastMessage && (
                                      <p className="text-xs text-muted-foreground truncate mt-1">
                                        {card.lastMessage}
                                      </p>
                                    )}
                                  </div>
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
  );
};
