import { useState } from "react";
import { MessageCircle, LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CRMNotificationsBell } from "./CRMNotificationsBell";
import { CRMInternalChat } from "./CRMInternalChat";
import { CRMQuickSearch } from "./CRMQuickSearch";
import { useMessages } from "@/hooks/useMessages";
import { WhatsAppSection } from "../WhatsAppDrawer";
import { ThemeToggle } from "@/components/Common/ThemeToggle";

interface CRMTopbarProps {
  onSectionChange: (section: WhatsAppSection) => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const CRMTopbar = ({ onSectionChange, sidebarCollapsed, onToggleSidebar }: CRMTopbarProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tenant } = useParams();
  const [chatOpen, setChatOpen] = useState(false);
  const { messages } = useMessages(user?.id);

  const totalUnread = messages.filter(
    (m) => m.receiver_id === user?.id && !m.is_read
  ).length;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`/crm/${tenant}/auth`, { replace: true });
  };

  const displayName = user?.email?.split("@")[0] || "Usuário";

  return (
    <>
      <header className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
        {/* Left: Logo + Sidebar Toggle */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggleSidebar}
            title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          <button
            onClick={() => onSectionChange("inbox")}
            className="text-3xl font-black tracking-tight lowercase text-foreground hover:opacity-80 transition-opacity cursor-pointer ml-1"
          >
            vouti<span className="text-[#E11D48]">.</span>crm
          </button>

          <div className="ml-10">
          <CRMQuickSearch onSelectProject={(projectId) => {
            onSectionChange("projects");
            // Dispatch event to open the selected project
            window.dispatchEvent(new CustomEvent('crm-open-project', { detail: { projectId } }));
          }} />
          </div>
        </div>

        {/* Right: Chat, Notifications, Profile, Logout */}
        <div className="flex items-center gap-2">
          {/* Internal Chat */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 relative"
            onClick={() => setChatOpen(true)}
            title="Chat Interno"
          >
            <MessageCircle className="h-4 w-4" />
            {totalUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </Button>

          {/* Notifications */}
          <CRMNotificationsBell />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Profile Name */}
          <span className="text-sm font-medium text-foreground hidden sm:inline">
            {displayName}
          </span>

          {/* Logout */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <CRMInternalChat open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
};
