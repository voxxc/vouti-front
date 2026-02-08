import { 
  Inbox, 
  MessageSquare, 
  Columns3, 
  Users, 
  BarChart3, 
  Megaphone, 
  HelpCircle, 
  Settings,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WhatsAppSection } from "./WhatsAppLayout";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

interface WhatsAppSidebarProps {
  activeSection: WhatsAppSection;
  onSectionChange: (section: WhatsAppSection) => void;
}

const menuItems: { id: WhatsAppSection; label: string; icon: React.ElementType }[] = [
  { id: "inbox", label: "Caixa de Entrada", icon: Inbox },
  { id: "conversations", label: "Conversas", icon: MessageSquare },
  { id: "kanban", label: "Kanban CRM", icon: Columns3 },
  { id: "contacts", label: "Contatos", icon: Users },
  { id: "reports", label: "Relatórios", icon: BarChart3 },
  { id: "campaigns", label: "Campanhas", icon: Megaphone },
  { id: "help", label: "Central de Ajuda", icon: HelpCircle },
  { id: "settings", label: "Configurações", icon: Settings },
];

export const WhatsAppSidebar = ({ activeSection, onSectionChange }: WhatsAppSidebarProps) => {
  const { tenantPath } = useTenantNavigation();
  const { user } = useAuth();

  const handleGoBack = () => {
    window.close();
  };

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
      </nav>

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
