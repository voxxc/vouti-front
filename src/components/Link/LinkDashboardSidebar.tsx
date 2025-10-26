import { useState } from "react";
import { Link2, Home, Edit3, Palette, Users, BarChart3, PlusCircle, Eye, Settings, Crown, LogOut, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface LinkDashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  isAdmin: boolean;
  username?: string;
}

export const LinkDashboardSidebar = ({
  activeTab,
  onTabChange,
  onLogout,
  isAdmin,
  username
}: LinkDashboardSidebarProps) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const menuItems = [
    { id: "home", label: "Início", icon: Home },
    { id: "edit", label: "Editar página", icon: Edit3 },
    { id: "customize", label: "Customize", icon: Palette },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "preview", label: "Ver minha página", icon: Eye },
    { id: "settings", label: "Ajustes", icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-card border-r border-border transition-all duration-300 flex flex-col",
        isMinimized ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
            <Link2 className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isMinimized && (
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">Vouti</h1>
              {username && (
                <p className="text-xs text-muted-foreground truncate">@{username}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Menu Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isMinimized && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <Separator />

      {/* Bottom Section */}
      <div className="p-4 space-y-3">
        {!isMinimized && (
          <>
            <div className="bg-gradient-to-br from-[hsl(var(--vlink-purple))]/10 to-[hsl(var(--vlink-purple))]/5 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Use o Vouti Pro</p>
              <p className="text-xs text-muted-foreground">
                Explore as novidades e acelerar seu crescimento
              </p>
              <Button size="sm" className="w-full gap-2 bg-[hsl(var(--vlink-purple))] hover:bg-[hsl(var(--vlink-purple-dark))] text-white">
                <Crown className="h-4 w-4" />
                Teste o Pro Grátis ⚡
              </Button>
            </div>

            {isAdmin && (
              <Badge variant="default" className="w-full justify-center gap-1">
                <Crown className="h-3 w-3" />
                Admin
              </Badge>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="w-full justify-start"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </>
        )}

        <Separator />

        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              isMinimized && "rotate-180"
            )}
          />
          {!isMinimized && <span>Minimizar</span>}
        </button>
      </div>
    </aside>
  );
};
