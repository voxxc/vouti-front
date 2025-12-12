import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";
import { 
  FolderOpen, 
  Calendar, 
  Users, 
  DollarSign, 
  FileCheck, 
  Video, 
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Menu
} from "lucide-react";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardSidebarProps {
  currentPage?: string;
}

const DashboardSidebar = ({ currentPage }: DashboardSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { navigate } = useTenantNavigation();
  const { userRole } = useAuth();

  const currentUserRole = (userRole as string) || 'advogado';

  const hasAccess = (section: string) => {
    if (!currentUserRole) return false;
    if (currentUserRole === 'admin') return true;
    
    if (currentUserRole === 'agenda') {
      return section === 'reunioes';
    }
    
    if (section === 'projetos' && (currentUserRole === 'advogado')) return true;
    if (section === 'agenda' && (currentUserRole === 'advogado' || currentUserRole === 'controller')) return true;
    if (section === 'clientes' && (currentUserRole === 'comercial')) return true;
    if (section === 'financeiro' && (currentUserRole === 'financeiro')) return true;
    if (section === 'controladoria' && (currentUserRole === 'advogado' || currentUserRole === 'controller')) return true;
    if (section === 'reunioes' && (currentUserRole === 'advogado' || currentUserRole === 'comercial' || currentUserRole === 'controller')) return true;
    return false;
  };

  const menuItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard', route: '/dashboard' },
    { id: 'projetos', icon: FolderOpen, label: 'Projetos', route: '/projects' },
    { id: 'agenda', icon: Calendar, label: 'Agenda', route: '/agenda' },
    { id: 'clientes', icon: Users, label: 'Clientes', route: '/crm' },
    { id: 'financeiro', icon: DollarSign, label: 'Financeiro', route: '/financial' },
    { id: 'controladoria', icon: FileCheck, label: 'Controladoria', route: '/controladoria' },
    { id: 'reunioes', icon: Video, label: 'Reunioes', route: '/reunioes' },
  ];

  const isActive = (itemId: string) => {
    if (itemId === 'dashboard' && currentPage === 'dashboard') return true;
    if (itemId === 'projetos' && currentPage === 'projects') return true;
    if (itemId === 'agenda' && currentPage === 'agenda') return true;
    if (itemId === 'clientes' && currentPage === 'crm') return true;
    if (itemId === 'financeiro' && currentPage === 'financial') return true;
    if (itemId === 'controladoria' && currentPage === 'controladoria') return true;
    if (itemId === 'reunioes' && currentPage === 'reunioes') return true;
    return false;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        <Menu size={20} />
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 h-screen bg-card border-r border-border z-40 transition-all duration-300 flex flex-col",
          isCollapsed ? "w-16" : "w-56",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "p-4 border-b border-border flex items-center",
          isCollapsed ? "justify-center" : "justify-start"
        )}>
        <button 
          onClick={() => navigate('/dashboard')}
          className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none ml-4"
        >
            {isCollapsed ? (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">V</span>
              </div>
            ) : (
              <Logo size="sm" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const hasAccessToItem = item.id === 'dashboard' || hasAccess(item.id);
            
            if (!hasAccessToItem) return null;

            return (
              <Button
                key={item.id}
                variant={isActive(item.id) ? "secondary" : "ghost"}
                onClick={() => {
                  navigate(item.route);
                  setIsMobileOpen(false);
                }}
                className={cn(
                  "w-full justify-start gap-3 h-11",
                  isCollapsed && "justify-center px-2",
                  isActive(item.id) && "bg-primary/10 text-primary hover:bg-primary/20"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={20} />
                {!isCollapsed && <span>{item.label}</span>}
              </Button>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="p-2 border-t border-border hidden md:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "w-full justify-center",
              !isCollapsed && "justify-end"
            )}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        </div>
      </aside>

      {/* Spacer to push content */}
      <div className={cn(
        "hidden md:block transition-all duration-300 flex-shrink-0",
        isCollapsed ? "w-16" : "w-56"
      )} />
    </>
  );
};

export default DashboardSidebar;
