import { 
  Inbox, 
  MessageSquare, 
  Users, 
  Settings,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SuperAdminWhatsAppSection } from "./SuperAdminWhatsAppLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

interface SuperAdminWhatsAppSidebarProps {
  activeSection: SuperAdminWhatsAppSection;
  onSectionChange: (section: SuperAdminWhatsAppSection) => void;
}

const menuItems: { id: SuperAdminWhatsAppSection; label: string; icon: React.ElementType }[] = [
  { id: "inbox", label: "Caixa de Entrada", icon: Inbox },
  { id: "conversations", label: "Conversas", icon: MessageSquare },
  { id: "contacts", label: "Contatos", icon: Users },
  { id: "settings", label: "Configurações", icon: Settings },
];

export const SuperAdminWhatsAppSidebar = ({ activeSection, onSectionChange }: SuperAdminWhatsAppSidebarProps) => {
  const { currentUserEmail } = useSuperAdmin();

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

      {/* Super Admin Badge */}
      <div className="px-4 py-2 bg-primary/10 border-b border-border">
        <span className="text-xs font-medium text-primary">SUPER ADMIN</span>
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
