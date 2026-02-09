import { useState } from "react";
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
import { WhatsAppSection } from "./WhatsAppDrawer";

interface WhatsAppSidebarProps {
  activeSection: WhatsAppSection;
  onSectionChange: (section: WhatsAppSection) => void;
  onClose?: () => void;
}

const mainMenuItems: { id: WhatsAppSection; label: string; icon: React.ElementType }[] = [
  { id: "inbox", label: "Caixa de Entrada", icon: Inbox },
  { id: "conversations", label: "Conversas", icon: MessageSquare },
  { id: "kanban", label: "Kanban CRM", icon: Columns3 },
  { id: "contacts", label: "Contatos", icon: Users },
  { id: "reports", label: "Relatórios", icon: BarChart3 },
  { id: "campaigns", label: "Campanhas", icon: Megaphone },
  { id: "help", label: "Central de Ajuda", icon: HelpCircle },
];

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

export const WhatsAppSidebar = ({ activeSection, onSectionChange, onClose }: WhatsAppSidebarProps) => {
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(() => 
    settingsSectionIds.includes(activeSection)
  );

  // Verificar se a seção ativa é uma seção de configuração
  const isSettingsSection = settingsSectionIds.includes(activeSection);

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
          {/* Main menu items */}
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  isActive && "bg-primary/10 text-primary"
                )}
                onClick={() => onSectionChange(item.id)}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{item.label}</span>
              </Button>
            );
          })}

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
