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
  Wifi,
  Users2,
  Bot,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SuperAdminWhatsAppSection } from "./SuperAdminWhatsAppLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SuperAdminWhatsAppSidebarProps {
  activeSection: SuperAdminWhatsAppSection;
  onSectionChange: (section: SuperAdminWhatsAppSection) => void;
}

const menuItems: { id: SuperAdminWhatsAppSection; label: string; icon: React.ElementType }[] = [
  { id: "inbox", label: "Caixa de Entrada", icon: Inbox },
  { id: "conversations", label: "Conversas", icon: MessageSquare },
  { id: "kanban", label: "Kanban CRM", icon: Columns3 },
  { id: "contacts", label: "Contatos", icon: Users },
  { id: "reports", label: "Relatórios", icon: BarChart3 },
  { id: "campaigns", label: "Campanhas", icon: Megaphone },
  { id: "help", label: "Central de Ajuda", icon: HelpCircle },
];

const settingsItems: { id: SuperAdminWhatsAppSection; label: string; icon: React.ElementType }[] = [
  { id: "settings", label: "Conexão Z-API", icon: Wifi },
  { id: "settings-leads", label: "Fonte de Leads", icon: Users2 },
  { id: "ai-settings", label: "Agente IA", icon: Bot },
];

export const SuperAdminWhatsAppSidebar = ({ activeSection, onSectionChange }: SuperAdminWhatsAppSidebarProps) => {
  const { currentUserEmail } = useSuperAdmin();

  const handleGoBack = () => {
    window.close();
  };

  const isSettingsActive = activeSection === "settings" || activeSection === "settings-leads" || activeSection === "ai-settings";

  return (
    <aside className="w-56 bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-foreground">WhatsApp</span>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-2 space-y-1">
        {menuItems.map((item) => {
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

        {/* Dropdown Configurações */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={isSettingsActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-10",
                isSettingsActive && "bg-primary/10 text-primary"
              )}
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm flex-1 text-left">Configurações</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              return (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {currentUserEmail?.charAt(0).toUpperCase() || "S"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {currentUserEmail?.split("@")[0] || "Super Admin"}
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
