import { useState } from "react";
import { MessageCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CRMNotificationsBell } from "./CRMNotificationsBell";
import { CRMInternalChat } from "./CRMInternalChat";
import { useMessages } from "@/hooks/useMessages";
import { WhatsAppSection } from "../WhatsAppDrawer";

interface CRMTopbarProps {
  onSectionChange: (section: WhatsAppSection) => void;
}

export const CRMTopbar = ({ onSectionChange }: CRMTopbarProps) => {
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
        {/* Left: Logo */}
        <button
          onClick={() => onSectionChange("inbox")}
          className="text-2xl font-black tracking-tight lowercase text-foreground hover:opacity-80 transition-opacity cursor-pointer"
        >
          vouti<span className="text-[#E11D48]">.</span>crm
        </button>

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
