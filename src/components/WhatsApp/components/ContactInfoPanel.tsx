import { useState } from "react";
import { 
  Phone, 
  Mail, 
  Zap, 
  MessageSquare, 
  Calendar, 
  Tag, 
  ChevronDown,
  ChevronRight,
  Bot,
  Clock,
  Columns3,
  Sparkles,
  Info,
  Settings2,
  Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { WhatsAppConversation } from "../sections/WhatsAppInbox";
import { cn } from "@/lib/utils";
import { AIControlSection } from "./AIControlSection";
import { SaveContactDialog } from "./SaveContactDialog";
import { useTenantId } from "@/hooks/useTenantId";

interface ContactInfoPanelProps {
  conversation: WhatsAppConversation;
}

interface AccordionItem {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

export const ContactInfoPanel = ({ conversation }: ContactInfoPanelProps) => {
  const [openSections, setOpenSections] = useState<string[]>(["actions"]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const { tenantId } = useTenantId();

  const toggleSection = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const accordionItems: AccordionItem[] = [
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
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Tag className="h-4 w-4 mr-2" />
            Adicionar etiqueta
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Calendar className="h-4 w-4 mr-2" />
            Agendar follow-up
          </Button>
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
      id: "kanban",
      title: "Kanban CRM",
      icon: Columns3,
      content: (
        <div className="py-2">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            Novo Lead
          </Badge>
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
          {/* Save Contact Button */}
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

      {/* Save Contact Dialog */}
      <SaveContactDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        phone={conversation.contactNumber}
        initialName={conversation.contactName}
      />

      {/* AI Control Section */}
      <AIControlSection 
        phoneNumber={conversation.contactNumber} 
        tenantId={tenantId}
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
