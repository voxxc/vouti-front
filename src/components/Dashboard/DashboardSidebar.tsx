import { useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
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
  Menu,
  Headphones,
  Star,
  FileText,
  MessageSquare,
  Newspaper,
  LayoutGrid
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SupportSheet } from "@/components/Support/SupportSheet";
import { usePrefetchPages } from "@/hooks/usePrefetchPages";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";

export type ActiveDrawer = 'projetos' | 'planejador' | 'agenda' | 'clientes' | 'financeiro' | 'controladoria' | 'reunioes' | 'documentos' | 'whatsapp' | 'publicacoes' | 'extras' | null;

interface DashboardSidebarProps {
  currentPage?: string;
  activeDrawer?: ActiveDrawer;
  onDrawerChange?: (drawer: ActiveDrawer) => void;
  flatTopbar?: boolean;
}

const DashboardSidebar = ({ currentPage, activeDrawer, onDrawerChange, flatTopbar = false }: DashboardSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const { navigateWithPrefetch } = useNavigationLoading();
  const { userRoles = [] } = useAuth();
  const { tenant: tenantSlug } = useParams<{ tenant: string }>();
  const { isWhatsAppEnabled } = useTenantFeatures();
  const { 
    prefetchDashboard, 
    prefetchProjects, 
    prefetchControladoria,
    prefetchAgenda,
    prefetchCRM,
    prefetchFinancial,
    prefetchReunioes
  } = usePrefetchPages();

  // Construir path tenant-aware para o dashboard
  const dashboardPath = tenantSlug ? `/${tenantSlug}/dashboard` : '/dashboard';

  // Mapeamento de rotas para funções de prefetch
  const prefetchMap: Record<string, () => Promise<void>> = {
    'dashboard': prefetchDashboard,
    'projetos': prefetchProjects,
    'controladoria': prefetchControladoria,
    'agenda': prefetchAgenda,
    'clientes': prefetchCRM,
    'financeiro': prefetchFinancial,
    'reunioes': prefetchReunioes,
  };

  // Prefetch on hover para navegação instantânea
  const handleMouseEnter = useCallback((itemId: string) => {
    const prefetchFn = prefetchMap[itemId];
    if (prefetchFn) {
      prefetchFn();
    }
  }, [prefetchDashboard, prefetchProjects, prefetchControladoria, prefetchAgenda, prefetchCRM, prefetchFinancial, prefetchReunioes]);

  // Navegação com loading overlay
  const handleNavigation = useCallback((itemId: string, route: string) => {
    const prefetchFn = prefetchMap[itemId];
    navigateWithPrefetch(route, prefetchFn);
    setIsMobileOpen(false);
  }, [navigateWithPrefetch, prefetchDashboard, prefetchProjects, prefetchControladoria, prefetchAgenda, prefetchCRM, prefetchFinancial, prefetchReunioes]);

  // Handler para abrir drawer - notifica o pai
  const handleOpenDrawer = useCallback((drawer: ActiveDrawer) => {
    onDrawerChange?.(drawer);
    setIsMobileOpen(false);
  }, [onDrawerChange]);

  // Handler para fechar drawer (clicando no Dashboard)
  const handleDashboardClick = useCallback(() => {
    onDrawerChange?.(null);
    setIsMobileOpen(false);
  }, [onDrawerChange]);

  // Mapeamento de seções para roles que têm acesso
  const sectionRoleMap: Record<string, string[]> = {
    'projetos': ['advogado', 'controller', 'estagiario', 'perito'],
    'planejador': ['advogado', 'controller', 'estagiario', 'perito'],
    'agenda': ['advogado', 'controller', 'agenda', 'estagiario', 'perito'],
    'clientes': ['comercial'],
    'financeiro': ['financeiro'],
    'controladoria': ['advogado', 'controller', 'estagiario'],
    'documentos': ['advogado', 'controller', 'estagiario'],
    'reunioes': ['comercial', 'agenda', 'reunioes'],
  };

  const hasAccess = (section: string) => {
    // Admin tem acesso a tudo
    if (userRoles.includes('admin')) return true;
    
    // Verificar se QUALQUER role do usuário dá acesso à seção
    const allowedRoles = sectionRoleMap[section] || [];
    return userRoles.some(role => allowedRoles.includes(role));
  };

  // Verificar acesso ao item considerando feature flags
  const hasAccessToItem = (itemId: string) => {
    // Dashboard e Extras sempre visíveis
    if (itemId === 'dashboard' || itemId === 'extras' || itemId === 'planejador') return true;
    
    // Vouti.Bot - verificar feature flag + role admin
    if (itemId === 'whatsapp') {
      return isWhatsAppEnabled && userRoles.includes('admin');
    }

    // Publicações - apenas /demorais por enquanto + admin/controller
    if (itemId === 'publicacoes') {
      return tenantSlug === 'demorais' && (userRoles.includes('admin') || userRoles.includes('controller'));
    }
    
    return hasAccess(itemId);
  };

  const menuItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard', route: '/dashboard' },
    { id: 'projetos', icon: FolderOpen, label: 'Projetos', route: '/projects' },
    { id: 'planejador', icon: LayoutGrid, label: 'Planejador', route: '/planejador' },
    { id: 'agenda', icon: Calendar, label: 'Agenda', route: '/agenda' },
    { id: 'clientes', icon: Users, label: 'Clientes', route: '/clientes' },
    { id: 'financeiro', icon: DollarSign, label: 'Financeiro', route: '/financial' },
    { id: 'controladoria', icon: FileCheck, label: 'Controladoria', route: '/controladoria' },
    { id: 'documentos', icon: FileText, label: 'Documentos', route: '/documentos' },
    { id: 'reunioes', icon: Video, label: 'Reuniões', route: '/reunioes' },
    { id: 'whatsapp', icon: MessageSquare, label: 'Vouti.CRM', route: '/crm' },
    { id: 'publicacoes', icon: Newspaper, label: 'Publicações', route: '/publicacoes' },
    { id: 'extras', icon: Star, label: 'Extras', route: '/extras' },
  ];

  // Item ativo considera o drawer aberto
  const isActive = (itemId: string) => {
    // Se temos um drawer ativo, ele é o item ativo
    if (activeDrawer) {
      return itemId === activeDrawer;
    }
    // Caso contrário, verificar a página atual
    if (itemId === 'dashboard' && currentPage === 'dashboard') return true;
    if (itemId === 'projetos' && currentPage === 'projects') return true;
    if (itemId === 'agenda' && currentPage === 'agenda') return true;
    if (itemId === 'clientes' && currentPage === 'crm') return true;
    if (itemId === 'financeiro' && currentPage === 'financial') return true;
    if (itemId === 'controladoria' && currentPage === 'controladoria') return true;
    if (itemId === 'documentos' && currentPage === 'documentos') return true;
    if (itemId === 'reunioes' && currentPage === 'reunioes') return true;
    if (itemId === 'extras' && currentPage === 'extras') return true;
    return false;
  };

  // IDs que abrem drawers
  const drawerItems = ['projetos', 'planejador', 'agenda', 'clientes', 'financeiro', 'controladoria', 'reunioes', 'documentos', 'whatsapp', 'publicacoes', 'extras'];

  return (
    <>
      {/* Mobile Menu Button - hidden, bottom nav replaces this */}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 h-screen border-r border-border/60 z-40 transition-all duration-300 flex flex-col",
          flatTopbar ? "bg-background" : "glass-surface",
          isCollapsed ? "w-16" : "w-56",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "px-4 flex items-center h-[52px]",
          !flatTopbar && "border-b border-border/60",
          isCollapsed ? "justify-center" : "justify-start"
        )}>
        <Link 
          to={dashboardPath}
          onMouseEnter={() => handleMouseEnter('dashboard')}
          onClick={handleDashboardClick}
          className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none ml-6"
        >
            {isCollapsed ? (
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-[var(--shadow-apple-sm)]">
                <span className="text-primary-foreground font-semibold text-sm">V</span>
              </div>
            ) : (
              <Logo size="sm" />
            )}
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
           {menuItems.map((item) => {
             const Icon = item.icon;
             
             if (!hasAccessToItem(item.id)) return null;

             // Dashboard - fecha qualquer drawer
             if (item.id === 'dashboard') {
                return (
                  <Link
                    key={item.id}
                    to={dashboardPath}
                    onMouseEnter={() => handleMouseEnter(item.id)}
                    onClick={handleDashboardClick}
                    className={cn(
                      "flex items-center w-full gap-3 h-10 px-3 rounded-xl text-sm font-medium transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                      isCollapsed && "justify-center px-2",
                      isActive(item.id) 
                        ? "bg-primary/10 text-primary" 
                        : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon size={18} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              }

             // Itens que abrem drawers
             if (drawerItems.includes(item.id)) {
               return (
                 <button
                   key={item.id}
                   onMouseEnter={() => handleMouseEnter(item.id)}
                   onClick={() => handleOpenDrawer(item.id as ActiveDrawer)}
                   className={cn(
                     "flex items-center w-full gap-3 h-10 px-3 rounded-xl text-sm font-medium transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                     isCollapsed && "justify-center px-2",
                     isActive(item.id)
                       ? "bg-primary/10 text-primary"
                       : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                   )}
                   title={isCollapsed ? item.label : undefined}
                 >
                   <Icon size={18} />
                   {!isCollapsed && <span>{item.label}</span>}
                 </button>
               );
             }

             // Extras e outros - navegação normal
             return (
               <button
                 key={item.id}
                 onMouseEnter={() => handleMouseEnter(item.id)}
                 onClick={() => handleNavigation(item.id, item.route)}
                 className={cn(
                   "flex items-center w-full gap-3 h-10 px-3 rounded-xl text-sm font-medium transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                   isCollapsed && "justify-center px-2",
                   isActive(item.id)
                     ? "bg-primary/10 text-primary"
                     : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                 )}
                 title={isCollapsed ? item.label : undefined}
               >
                 <Icon size={18} />
                 {!isCollapsed && <span>{item.label}</span>}
               </button>
             );
           })}
        </nav>

        {/* Support Button */}
        <div className="px-2 py-2 border-t border-border/60">
          <button
            onClick={() => setSupportOpen(true)}
            className={cn(
              "flex items-center w-full gap-3 h-10 px-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? "Suporte" : undefined}
          >
            <Headphones size={18} />
            {!isCollapsed && <span>Suporte</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <div className="p-2 border-t border-border/60 hidden md:block">
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

      {/* Support Sheet */}
      <SupportSheet open={supportOpen} onOpenChange={setSupportOpen} />

      {/* Spacer to push content */}
      <div className={cn(
        "hidden md:block transition-all duration-300 flex-shrink-0",
        isCollapsed ? "w-16" : "w-56"
      )} />
    </>
  );
};

export default DashboardSidebar;
