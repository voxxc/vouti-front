import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Loader2, MessageSquare, UserPlus, Phone, Search } from "lucide-react";

interface AddKanbanCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  tenantId: string | null;
  onCardAdded: () => void;
}

interface InboxConversation {
  phone: string;
  contactName: string;
  lastMessage: string;
}

export const AddKanbanCardDialog = ({
  open,
  onOpenChange,
  agentId,
  tenantId,
  onCardAdded,
}: AddKanbanCardDialogProps) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Existing conversations tab
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [searchConversation, setSearchConversation] = useState("");

  // New contact tab
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  const loadAvailableConversations = useCallback(async () => {
    if (!open || !agentId) return;
    setIsLoading(true);
    try {
      // Get all distinct phones from agent's messages
      const { data: messages } = await supabase
        .from("whatsapp_messages")
        .select("from_number")
        .eq("agent_id", agentId)
        .eq("direction", "incoming");

      const uniquePhones = [...new Set((messages || []).map((m: any) => m.from_number))];

      // Get existing kanban cards
      const { data: existingCards } = await supabase
        .from("whatsapp_conversation_kanban")
        .select("phone")
        .eq("agent_id", agentId);

      const existingPhones = new Set((existingCards || []).map((c: any) => c.phone));

      // Filter out phones already in kanban
      const availablePhones = uniquePhones.filter(p => !existingPhones.has(p));

      // Get contact names
      const { data: contacts } = await supabase
        .from("whatsapp_contacts")
        .select("phone, name");

      const contactMap = new Map<string, string>();
      contacts?.forEach((c: any) => contactMap.set(c.phone, c.name));

      // Get last messages
      const convs: InboxConversation[] = [];
      for (const phone of availablePhones) {
        const { data: lastMsg } = await supabase
          .from("whatsapp_messages")
          .select("message_text")
          .eq("from_number", phone)
          .eq("agent_id", agentId)
          .order("created_at", { ascending: false })
          .limit(1);

        convs.push({
          phone,
          contactName: contactMap.get(phone) || phone,
          lastMessage: lastMsg?.[0]?.message_text || "",
        });
      }

      setConversations(convs);
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
    } finally {
      setIsLoading(false);
    }
  }, [open, agentId]);

  useEffect(() => {
    if (open) {
      loadAvailableConversations();
      setSelectedPhones([]);
      setNewPhone("");
      setNewName("");
      setNewEmail("");
      setNewNotes("");
      setSearchConversation("");
    }
  }, [open, loadAvailableConversations]);

  const getFirstColumnId = async (): Promise<string | null> => {
    const { data } = await supabase
      .from("whatsapp_kanban_columns")
      .select("id")
      .eq("agent_id", agentId)
      .order("column_order", { ascending: true })
      .limit(1);
    return data?.[0]?.id || null;
  };

  const handleAddExisting = async () => {
    if (selectedPhones.length === 0) return;
    setIsSaving(true);
    try {
      const columnId = await getFirstColumnId();
      if (!columnId) {
        toast.error("Nenhuma coluna encontrada no Kanban");
        return;
      }

      const inserts = selectedPhones.map((phone, index) => ({
        tenant_id: tenantId,
        agent_id: agentId,
        phone,
        column_id: columnId,
        card_order: index,
      }));

      const { error } = await supabase.from("whatsapp_conversation_kanban").insert(inserts);
      if (error) throw error;

      toast.success(`${selectedPhones.length} conversa(s) adicionada(s) ao Kanban`);
      onOpenChange(false);
      onCardAdded();
    } catch (error: any) {
      console.error("Erro ao adicionar cards:", error);
      toast.error(error.message || "Erro ao adicionar cards");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewContact = async () => {
    if (!newPhone.trim() || !newName.trim()) {
      toast.error("Telefone e nome são obrigatórios");
      return;
    }
    setIsSaving(true);
    try {
      // Save contact
      const { error: contactError } = await supabase.from("whatsapp_contacts").insert({
        tenant_id: tenantId,
        phone: newPhone.trim(),
        name: newName.trim(),
        email: newEmail.trim() || null,
        notes: newNotes.trim() || null,
        created_by: currentUserId,
      });
      if (contactError) throw contactError;

      // Add to kanban
      const columnId = await getFirstColumnId();
      if (columnId) {
        const { error: kanbanError } = await supabase.from("whatsapp_conversation_kanban").insert({
          tenant_id: tenantId,
          agent_id: agentId,
          phone: newPhone.trim(),
          column_id: columnId,
          card_order: 0,
        });
        if (kanbanError) throw kanbanError;
      }

      toast.success("Contato criado e adicionado ao Kanban");
      onOpenChange(false);
      onCardAdded();
    } catch (error: any) {
      console.error("Erro ao criar contato:", error);
      toast.error(error.message || "Erro ao criar contato");
    } finally {
      setIsSaving(false);
    }
  };

  const togglePhone = (phone: string) => {
    setSelectedPhones(prev =>
      prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
    );
  };

  const filteredConversations = conversations.filter(c =>
    c.contactName.toLowerCase().includes(searchConversation.toLowerCase()) ||
    c.phone.includes(searchConversation)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Card ao Kanban
          </DialogTitle>
          <DialogDescription>
            Selecione conversas existentes ou crie um novo contato.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="existing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Conversas Existentes
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Novo Contato
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversa..."
                value={searchConversation}
                onChange={(e) => setSearchConversation(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-64">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma conversa disponível
                </p>
              ) : (
                <div className="space-y-1.5">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.phone}
                      className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => togglePhone(conv.phone)}
                    >
                      <Checkbox
                        checked={selectedPhones.includes(conv.phone)}
                        onCheckedChange={() => togglePhone(conv.phone)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                          {conv.contactName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conv.contactName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.phone} {conv.lastMessage && `• ${conv.lastMessage}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={handleAddExisting}
                disabled={selectedPhones.length === 0 || isSaving}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Adicionar ({selectedPhones.length})
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="new" className="space-y-4 mt-3">
            <div className="space-y-2">
              <Label htmlFor="new-phone">Telefone *</Label>
              <Input
                id="new-phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="5511999999999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome *</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do contato"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-notes">Observações</Label>
              <Textarea
                id="new-notes"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notas sobre o contato..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={handleAddNewContact}
                disabled={!newPhone.trim() || !newName.trim() || isSaving}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar e Adicionar
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
