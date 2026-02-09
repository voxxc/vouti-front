import { useState, useEffect } from "react";
import { 
  Inbox, 
  MessageSquare, 
  Columns3, 
  Users, 
  BarChart3, 
  Megaphone, 
  HelpCircle, 
  Settings,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  User,
  Users2,
  UsersRound,
  Tag,
  Sliders,
  Zap,
  Workflow,
  Bot,
  FileText,
  MessageCircle,
  AppWindow,
  Plug,
  Shield
} from "lucide-react";
import CloudIcon from "@/components/CloudIcon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { WhatsAppSection } from "./WhatsAppDrawer";

interface WhatsAppAgent {
  id: string;
  name: string;
}

interface WhatsAppSidebarProps {
  activeSection: WhatsAppSection;
  onSectionChange: (section: WhatsAppSection) => void;
  onClose?: () => void;
  onKanbanAgentSelect?: (agentId: string, agentName: string) => void;
  selectedKanbanAgentId?: string;
}

const settingsMenuItems: { id: WhatsAppSection; label: string; icon: React.ElementType }[] = [
  { id: "account", label: "Conta", icon: User },
  { id: "agents", label: "Agentes", icon: Users2 },
  { id: "teams", label: "Times", icon: UsersRound },
  { id: "inboxes", label: "Caixas de Entrada", icon: Inbox },
  { id: "labels", label: "Etiquetas", icon: Tag },
  { id: "attributes", label: "Atributos", icon: Sliders },
  { id: "kanban-settings", label: "Kanban CRM", icon: Columns3 },
  { id: "automation", label: "Automação", icon: Zap },
  { id: "n8n", label: "N8N", icon: Workflow },
  { id: "bots", label: "Bots", icon: Bot },
  { id: "typebot", label: "Typebot Bot", icon: MessageSquare },
  { id: "macros", label: "Macros", icon: FileText },
  { id: "canned", label: "Respostas Prontas", icon: MessageCircle },
  { id: "apps", label: "Aplicações", icon: AppWindow },
  { id: "integrations", label: "Integrações", icon: Plug },
  { id: "permissions", label: "Permissões", icon: Shield },
];

// Todas as seções de configuração
const settingsSectionIds: WhatsAppSection[] = settingsMenuItems.map(item => item.id);

export const WhatsAppSidebar = ({ 
  activeSection, 
  onSectionChange, 
  onClose,
  onKanbanAgentSelect,
  selectedKanbanAgentId 
}: WhatsAppSidebarProps) => {
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const [settingsOpen, setSettingsOpen] = useState(() => 
    settingsSectionIds.includes(activeSection)
  );
  const [conversationsOpen, setConversationsOpen] = useState(
    activeSection === "all-conversations"
  );
  const [kanbanOpen, setKanbanOpen] = useState(
    activeSection === "kanban"
  );
  const [agents, setAgents] = useState<WhatsAppAgent[]>([]);
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

  // Load agents for Kanban dropdown
  useEffect(() => {
    const loadAgents = async () => {
      let query = supabase
        .from("whatsapp_agents")
        .select("id, name")
        .eq("is_active", true);

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      } else if (isSuperAdmin) {
        query = query.is("tenant_id", null);
      }

      const { data } = await query;
      setAgents(data || []);
    };

    if (tenantId || isSuperAdmin) {
      loadAgents();
    }
  }, [tenantId, isSuperAdmin]);

  // Verificar se a seção ativa é uma seção de configuração
  const isSettingsSection = settingsSectionIds.includes(activeSection);
  const isConversationsSection = activeSection === "all-conversations";
  const isKanbanSection = activeSection === "kanban";

  return (
    <aside className="w-56 bg-card border-r border-border flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={onClose}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CloudIcon className="w-8 h-8" />
            <span className="font-semibold text-foreground">Vouti.Bot</span>
          </div>
        </div>
      </div>

      {/* Menu Items com Scroll */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {/* Caixa de Entrada */}
          <Button
            variant={activeSection === "inbox" ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3 h-10",
              activeSection === "inbox" && "bg-primary/10 text-primary"
            )}
            onClick={() => onSectionChange("inbox")}
          >
            <Inbox className="h-4 w-4" />
            <span className="text-sm">Caixa de Entrada</span>
          </Button>

          {/* Conversas - Collapsible */}
          <Collapsible open={conversationsOpen} onOpenChange={setConversationsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant={isConversationsSection ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-between h-10",
                  isConversationsSection && "bg-primary/10 text-primary"
                )}
              >
                <span className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm">Conversas</span>
                </span>
                {conversationsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 pt-1 space-y-0.5">
              <Button
                variant={activeSection === "all-conversations" ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2 h-8 text-sm",
                  activeSection === "all-conversations" && "bg-primary/10 text-primary"
                )}
                onClick={() => onSectionChange("all-conversations")}
              >
                <MessageSquare className="h-3 w-3" />
                <span className="text-xs">Todas as Conversas</span>
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Kanban CRM - Collapsible with Agents */}
          <Collapsible open={kanbanOpen} onOpenChange={setKanbanOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant={isKanbanSection ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-between h-10",
                  isKanbanSection && "bg-primary/10 text-primary"
                )}
              >
                <span className="flex items-center gap-3">
                  <Columns3 className="h-4 w-4" />
                  <span className="text-sm">Kanban CRM</span>
                </span>
                {kanbanOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 pt-1 space-y-0.5">
              {agents.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-1">
                  Nenhum agente ativo
                </p>
              ) : (
                agents.map((agent) => (
                  <Button
                    key={agent.id}
                    variant={selectedKanbanAgentId === agent.id ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2 h-8 text-sm",
                      selectedKanbanAgentId === agent.id && "bg-primary/10 text-primary"
                    )}
                    onClick={() => {
                      onSectionChange("kanban");
                      onKanbanAgentSelect?.(agent.id, agent.name);
                    }}
                  >
                    <User className="h-3 w-3" />
                    <span className="text-xs truncate">{agent.name}</span>
                  </Button>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Contatos */}
          <Button
            variant={activeSection === "contacts" ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3 h-10",
              activeSection === "contacts" && "bg-primary/10 text-primary"
            )}
            onClick={() => onSectionChange("contacts")}
          >
            <Users className="h-4 w-4" />
            <span className="text-sm">Contatos</span>
          </Button>

          {/* Relatórios */}
          <Button
            variant={activeSection === "reports" ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3 h-10",
              activeSection === "reports" && "bg-primary/10 text-primary"
            )}
            onClick={() => onSectionChange("reports")}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm">Relatórios</span>
          </Button>

          {/* Campanhas */}
          <Button
            variant={activeSection === "campaigns" ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3 h-10",
              activeSection === "campaigns" && "bg-primary/10 text-primary"
            )}
            onClick={() => onSectionChange("campaigns")}
          >
            <Megaphone className="h-4 w-4" />
            <span className="text-sm">Campanhas</span>
          </Button>

          {/* Central de Ajuda */}
          <Button
            variant={activeSection === "help" ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3 h-10",
              activeSection === "help" && "bg-primary/10 text-primary"
            )}
            onClick={() => onSectionChange("help")}
          >
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm">Central de Ajuda</span>
          </Button>

          {/* Configurações - Collapsible */}
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant={isSettingsSection ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-between h-10",
                  isSettingsSection && "bg-primary/10 text-primary"
                )}
              >
                <span className="flex items-center gap-3">
                  <Settings className="h-4 w-4" />
                  <span className="text-sm">Configurações</span>
                </span>
                {settingsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 pt-1 space-y-0.5">
              {settingsMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2 h-8 text-sm",
                      isActive && "bg-primary/10 text-primary"
                    )}
                    onClick={() => onSectionChange(item.id)}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="text-xs">{item.label}</span>
                  </Button>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </nav>
      </ScrollArea>

      {/* User Info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.email?.split("@")[0] || "Usuário"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Online
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
