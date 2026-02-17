import { useState, useEffect } from "react";
import { 
  Phone, 
  Mail, 
  Zap, 
  MessageSquare, 
  Calendar, 
  ChevronDown,
  ChevronRight,
  Bot,
  Clock,
  Columns3,
  Sparkles,
  Info,
  Settings2,
  Pencil,
  StickyNote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WhatsAppConversation } from "../sections/WhatsAppInbox";
import { cn } from "@/lib/utils";
import { AIControlSection } from "./AIControlSection";
import { SaveContactDialog } from "./SaveContactDialog";
import { AddLabelDropdown } from "./AddLabelDropdown";
import { TransferConversationDialog } from "./TransferConversationDialog";
import { ContactNotesPanel } from "./ContactNotesPanel";
import { useTenantId } from "@/hooks/useTenantId";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhone, getPhoneVariant } from "@/utils/phoneUtils";
import { toast } from "sonner";

interface ContactInfoPanelProps {
  conversation: WhatsAppConversation;
  onContactSaved?: () => void;
  currentAgentId?: string | null;
  currentAgentName?: string | null;
  tenantId?: string | null;
  onTransferComplete?: () => void;
}

interface KanbanColumnOption {
  id: string;
  name: string;
  color: string;
}

export const ContactInfoPanel = ({ conversation, onContactSaved, currentAgentId, currentAgentName, tenantId: propTenantId, onTransferComplete }: ContactInfoPanelProps) => {
  const [openSections, setOpenSections] = useState<string[]>(["actions"]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [contactId, setContactId] = useState<string | null>(null);
  const { tenantId: hookTenantId } = useTenantId();
  const resolvedTenantId = propTenantId || hookTenantId;

  // Kanban column state
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumnOption[]>([]);
  const [currentColumnId, setCurrentColumnId] = useState<string | null>(null);
  const [selectedNewColumn, setSelectedNewColumn] = useState<string | null>(null);
  const [showColumnConfirm, setShowColumnConfirm] = useState(false);
  const [kanbanCardId, setKanbanCardId] = useState<string | null>(null);

  // Load contact ID if exists
  useEffect(() => {
    const loadContactId = async () => {
      const normalized = normalizePhone(conversation.contactNumber);
      const variant = getPhoneVariant(normalized);
      const phoneFilter = variant 
        ? `phone.eq.${normalized},phone.eq.${variant}` 
        : `phone.eq.${normalized}`;
      
      let query = supabase
        .from("whatsapp_contacts")
        .select("id")
        .or(phoneFilter);

      if (resolvedTenantId) {
        query = query.eq("tenant_id", resolvedTenantId);
      } else {
        query = query.is("tenant_id", null);
      }

      const { data } = await query.maybeSingle();
      setContactId(data?.id || null);
    };
    loadContactId();
  }, [conversation.contactNumber, resolvedTenantId]);

  // Load kanban columns and current column for this contact
  useEffect(() => {
    const loadKanbanData = async () => {
      if (!currentAgentId) return;

      const [colsRes, cardRes] = await Promise.all([
        supabase
          .from("whatsapp_kanban_columns")
          .select("id, name, color")
          .eq("agent_id", currentAgentId)
          .order("column_order"),
        supabase
          .from("whatsapp_conversation_kanban")
          .select("id, column_id")
          .eq("agent_id", currentAgentId)
          .eq("phone", conversation.contactNumber)
          .limit(1)
          .maybeSingle(),
      ]);

      setKanbanColumns(colsRes.data || []);
      setCurrentColumnId(cardRes.data?.column_id || null);
      setKanbanCardId(cardRes.data?.id || null);
    };
    loadKanbanData();
  }, [currentAgentId, conversation.contactNumber]);

  const handleColumnChange = (newColumnId: string) => {
    if (newColumnId === currentColumnId) return;
    setSelectedNewColumn(newColumnId);
    setShowColumnConfirm(true);
  };

  const confirmColumnChange = async () => {
    if (!selectedNewColumn || !kanbanCardId) {
      setShowColumnConfirm(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("whatsapp_conversation_kanban")
        .update({ column_id: selectedNewColumn })
        .eq("id", kanbanCardId);

      if (error) throw error;
      setCurrentColumnId(selectedNewColumn);
      toast.success("Coluna atualizada!");
    } catch (error) {
      console.error("Erro ao mudar coluna:", error);
      toast.error("Erro ao mudar coluna");
    } finally {
      setShowColumnConfirm(false);
      setSelectedNewColumn(null);
    }
  };

  const toggleSection = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const selectedColumnName = kanbanColumns.find(c => c.id === selectedNewColumn)?.name || "";

  const accordionItems = [
    {
      id: "actions",
      title: "Ações da Conversa",
      icon: Zap,
      content: (
        <div className="space-y-2 py-2">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <MessageSquare className="h-4 w-4 mr-2" />
            Resolver conversa
          </Button>
          <AddLabelDropdown
            contactId={contactId}
            contactPhone={conversation.contactNumber}
            onLabelsChange={() => {}}
          />
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Calendar className="h-4 w-4 mr-2" />
            Agendar follow-up
          </Button>
          <TransferConversationDialog
            conversation={conversation}
            currentAgentId={currentAgentId}
            currentAgentName={currentAgentName}
            tenantId={resolvedTenantId}
            onTransferComplete={onTransferComplete}
          />
        </div>
      ),
    },
    {
      id: "kanban",
      title: "Kanban CRM",
      icon: Columns3,
      content: (
        <div className="py-2 space-y-2">
          {kanbanCardId ? (
            <Select value={currentColumnId || ""} onValueChange={handleColumnChange}>
              <SelectTrigger className="w-full text-xs h-8">
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                {kanbanColumns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                      {col.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">Lead não está no Kanban deste agente.</p>
          )}
        </div>
      ),
    },
    {
      id: "notes",
      title: "Notas",
      icon: StickyNote,
      content: (
        <div className="py-2">
          <ContactNotesPanel contactPhone={conversation.contactNumber} compact />
        </div>
      ),
    },
    {
      id: "typebot",
      title: "Typebot Bot",
      icon: Bot,
      content: (
        <div className="py-2 text-sm text-muted-foreground">
          Configure fluxos automatizados com Typebot
        </div>
      ),
    },
    {
      id: "scheduled",
      title: "Mensagens Agendadas",
      icon: Clock,
      content: (
        <div className="py-2 text-sm text-muted-foreground">
          Nenhuma mensagem agendada
        </div>
      ),
    },
    {
      id: "macros",
      title: "Macros",
      icon: Sparkles,
      content: (
        <div className="py-2 space-y-2">
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
            /saudacao - Mensagem de boas-vindas
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
            /preco - Informações de preço
          </Button>
        </div>
      ),
    },
    {
      id: "info",
      title: "Informação da Conversa",
      icon: Info,
      content: (
        <div className="py-2 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Iniciada em</span>
            <span className="text-foreground">-</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Última mensagem</span>
            <span className="text-foreground">-</span>
          </div>
        </div>
      ),
    },
    {
      id: "attributes",
      title: "Atributos",
      icon: Settings2,
      content: (
        <div className="py-2 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Skip Evaluation</span>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Skip Greetings</span>
            <Switch />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col">
      {/* Contact Header */}
      <div className="p-6 border-b border-border text-center">
        <div className="relative inline-block">
          <Avatar className="h-20 w-20 mx-auto mb-4">
            <AvatarFallback className="bg-green-500/20 text-green-600 text-2xl">
              {conversation.contactName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-background shadow-md hover:bg-accent border"
            onClick={() => setShowSaveDialog(true)}
            title="Salvar contato"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
        <h3 className="font-semibold text-lg text-foreground">
          {conversation.contactName}
        </h3>
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 mt-1">
          <Phone className="h-3 w-3" />
          {conversation.contactNumber}
        </p>
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 mt-1">
          <Mail className="h-3 w-3" />
          {conversation.contactNumber}@whatsapp.com
        </p>
      </div>

      <SaveContactDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        phone={conversation.contactNumber}
        initialName={conversation.contactName}
        onContactSaved={onContactSaved}
      />

      {/* Column change confirmation */}
      <AlertDialog open={showColumnConfirm} onOpenChange={setShowColumnConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover para "{selectedColumnName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              O lead será movido para a coluna "{selectedColumnName}" no Kanban.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmColumnChange}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Control Section */}
      <AIControlSection 
        phoneNumber={conversation.contactNumber} 
        tenantId={resolvedTenantId}
      />

      {/* Accordion Sections */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {accordionItems.map((item) => {
            const Icon = item.icon;
            const isOpen = openSections.includes(item.id);

            return (
              <Collapsible
                key={item.id}
                open={isOpen}
                onOpenChange={() => toggleSection(item.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between px-3 py-2 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.title}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3">
                  {item.content}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
