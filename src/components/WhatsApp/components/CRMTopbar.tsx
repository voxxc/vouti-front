import { useState } from "react";
import { MessageCircle, LogOut, PanelLeftClose, PanelLeft, Cloud, Sun, Moon, UserCircle } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DriveDrawer } from "@/components/Drive/DriveDrawer";
import { useLocalTheme } from "@/hooks/useLocalTheme";

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
  const [driveOpen, setDriveOpen] = useState(false);
  const { theme, toggleTheme } = useLocalTheme('theme');
  const { messages } = useMessages(user?.id);

  const totalUnread = messages.filter(
    (m) => m.receiver_id === user?.id && !m.is_read
  ).length;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    const isStandalone = window.location.pathname.startsWith('/crm/');
    if (isStandalone) {
      navigate(`/crm/${tenant}/auth`, { replace: true });
    } else {
      navigate(`/${tenant}/auth`, { replace: true });
    }
  };

  const displayName = user?.email?.split("@")[0] || "Usuário";
  const initials = displayName
    .split(/[\s.]+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <header className="h-12 glass-surface border-b border-border/60 flex items-center justify-between px-4 shrink-0">
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

          <div className="ml-20">
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

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 pl-2 pr-2.5 h-8 rounded-full bg-primary/15 hover:bg-primary/25 transition-colors text-primary font-semibold text-xs"
                title="Perfil"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20">
                  {initials || <UserCircle className="h-4 w-4" />}
                </span>
                <span className="hidden sm:inline text-foreground font-medium">
                  {displayName}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="py-2">
                <span className="font-semibold text-sm truncate block">
                  {user?.email || displayName}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleTheme} className="gap-2 cursor-pointer">
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDriveOpen(true)} className="gap-2 cursor-pointer">
                <Cloud className="h-4 w-4" />
                Drive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CRMInternalChat open={chatOpen} onOpenChange={setChatOpen} />
      <DriveDrawer open={driveOpen} onOpenChange={setDriveOpen} />
    </>
  );
};
