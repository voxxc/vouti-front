import { 
  User, 
  Users2, 
  UsersRound, 
  Inbox, 
  Tag, 
  Sliders, 
  Columns3, 
  Zap, 
  Workflow, 
  Bot, 
  MessageSquare, 
  FileText, 
  MessageCircle, 
  AppWindow, 
  Plug, 
  Shield,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export type SettingsSection = 
  | "account"
  | "agents"
  | "teams"
  | "inboxes"
  | "labels"
  | "attributes"
  | "kanban"
  | "automation"
  | "n8n"
  | "bots"
  | "typebot"
  | "macros"
  | "canned"
  | "apps"
  | "integrations"
  | "permissions";

interface SettingsMenuItem {
  id: SettingsSection;
  label: string;
  icon: React.ElementType;
}

const settingsMenuItems: SettingsMenuItem[] = [
  { id: "account", label: "Conta", icon: User },
  { id: "agents", label: "Agentes", icon: Users2 },
  { id: "teams", label: "Times", icon: UsersRound },
  { id: "inboxes", label: "Caixas de Entrada", icon: Inbox },
  { id: "labels", label: "Etiquetas", icon: Tag },
  { id: "attributes", label: "Atributos", icon: Sliders },
  { id: "kanban", label: "Kanban CRM", icon: Columns3 },
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

interface WhatsAppSettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  onBack: () => void;
}

export const WhatsAppSettingsSidebar = ({ 
  activeSection, 
  onSectionChange,
  onBack 
}: WhatsAppSettingsSidebarProps) => {
  return (
    <aside className="w-56 bg-muted/30 border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-foreground">Configurações</span>
        </div>
      </div>

      {/* Menu Items */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {settingsMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-9",
                  isActive && "bg-primary/10 text-primary"
                )}
                onClick={() => onSectionChange(item.id)}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{item.label}</span>
              </Button>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
};
