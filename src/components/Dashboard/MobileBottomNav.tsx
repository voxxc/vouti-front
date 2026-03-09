import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  BarChart3, FolderOpen, Calendar, FileCheck, MoreHorizontal,
  Users, DollarSign, Video, FileText, MessageSquare, Newspaper, Star, Headphones
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { useParams } from "react-router-dom";
import { ActiveDrawer } from "./DashboardSidebar";
import { SupportSheet } from "@/components/Support/SupportSheet";

interface MobileBottomNavProps {
  activeDrawer: ActiveDrawer;
  onDrawerChange: (drawer: ActiveDrawer) => void;
  onDashboardClick: () => void;
}

const PRIMARY_TABS = [
  { id: 'dashboard', icon: BarChart3, label: 'Início' },
  { id: 'projetos', icon: FolderOpen, label: 'Projetos' },
  { id: 'agenda', icon: Calendar, label: 'Agenda' },
  { id: 'controladoria', icon: FileCheck, label: 'Controle' },
  { id: 'more', icon: MoreHorizontal, label: 'Mais' },
] as const;

const MORE_ITEMS = [
  { id: 'clientes', icon: Users, label: 'Clientes' },
  { id: 'financeiro', icon: DollarSign, label: 'Financeiro' },
  { id: 'documentos', icon: FileText, label: 'Documentos' },
  { id: 'reunioes', icon: Video, label: 'Reuniões' },
  { id: 'whatsapp', icon: MessageSquare, label: 'Vouti.CRM' },
  { id: 'publicacoes', icon: Newspaper, label: 'Publicações' },
  { id: 'extras', icon: Star, label: 'Extras' },
] as const;

export function MobileBottomNav({ activeDrawer, onDrawerChange, onDashboardClick }: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const { userRoles = [] } = useAuth();
  const { tenant: tenantSlug } = useParams<{ tenant: string }>();
  const { isWhatsAppEnabled } = useTenantFeatures();

  const sectionRoleMap: Record<string, string[]> = {
    'projetos': ['advogado', 'controller', 'estagiario', 'perito'],
    'agenda': ['advogado', 'controller', 'agenda', 'estagiario', 'perito'],
    'clientes': ['comercial'],
    'financeiro': ['financeiro'],
    'controladoria': ['advogado', 'controller', 'estagiario'],
    'documentos': ['advogado', 'controller', 'estagiario'],
    'reunioes': ['comercial', 'agenda', 'reunioes'],
  };

  const hasAccessToItem = useCallback((itemId: string) => {
    if (itemId === 'dashboard' || itemId === 'extras') return true;
    if (itemId === 'whatsapp') return isWhatsAppEnabled && userRoles.includes('admin');
    if (itemId === 'publicacoes') return tenantSlug === 'demorais' && (userRoles.includes('admin') || userRoles.includes('controller'));
    if (userRoles.includes('admin')) return true;
    const allowedRoles = sectionRoleMap[itemId] || [];
    return userRoles.some(role => allowedRoles.includes(role));
  }, [userRoles, isWhatsAppEnabled, tenantSlug]);

  const isActive = (id: string) => {
    if (id === 'dashboard') return !activeDrawer;
    if (id === 'more') return false;
    return activeDrawer === id;
  };

  const handleTab = (id: string) => {
    if (id === 'more') {
      setMoreOpen(true);
      return;
    }
    if (id === 'dashboard') {
      onDashboardClick();
      return;
    }
    onDrawerChange(id as ActiveDrawer);
  };

  const handleMoreItem = (id: string) => {
    setMoreOpen(false);
    onDrawerChange(id as ActiveDrawer);
  };

  const visibleMoreItems = MORE_ITEMS.filter(item => hasAccessToItem(item.id));

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-lg border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-14 px-1">
          {PRIMARY_TABS.map(tab => {
            if (tab.id !== 'dashboard' && tab.id !== 'more' && !hasAccessToItem(tab.id)) return null;
            const Icon = tab.icon;
            const active = isActive(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => handleTab(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors min-w-0",
                  active 
                    ? "text-primary" 
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className={cn(
                  "text-[10px] leading-tight truncate",
                  active && "font-semibold"
                )}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* More Sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}>
          <SheetTitle className="sr-only">Mais opções</SheetTitle>
          <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4 mt-1" />
          <div className="grid grid-cols-4 gap-3">
            {visibleMoreItems.map(item => {
              const Icon = item.icon;
              const active = activeDrawer === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMoreItem(item.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors",
                    active 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted active:bg-muted"
                  )}
                >
                  <Icon size={22} />
                  <span className="text-xs font-medium truncate w-full text-center">{item.label}</span>
                </button>
              );
            })}
            {/* Support button */}
            <button
              onClick={() => { setMoreOpen(false); setSupportOpen(true); }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-muted-foreground hover:bg-muted active:bg-muted transition-colors"
            >
              <Headphones size={22} />
              <span className="text-xs font-medium">Suporte</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <SupportSheet open={supportOpen} onOpenChange={setSupportOpen} />
    </>
  );
}
