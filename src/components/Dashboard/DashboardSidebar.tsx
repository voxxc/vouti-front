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
  FileText
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SupportSheet } from "@/components/Support/SupportSheet";
import { ProjectsDrawer } from "@/components/Projects/ProjectsDrawer";
import { ControladoriaDrawer } from "@/components/Controladoria/ControladoriaDrawer";
import { CRMDrawer } from "@/components/CRM/CRMDrawer";
import { FinancialDrawer } from "@/components/Financial/FinancialDrawer";
import { ReunioesDrawer } from "@/components/Reunioes/ReunioesDrawer";
import { AgendaDrawer } from "@/components/Agenda/AgendaDrawer";
import { DocumentosDrawer } from "@/components/Documentos/DocumentosDrawer";
import { usePrefetchPages } from "@/hooks/usePrefetchPages";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";

type ActiveDrawer = 'projetos' | 'agenda' | 'clientes' | 'financeiro' | 'controladoria' | 'reunioes' | 'documentos' | null;

interface DashboardSidebarProps {
  currentPage?: string;
}

const DashboardSidebar = ({ currentPage }: DashboardSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);
  const { navigateWithPrefetch } = useNavigationLoading();
  const { userRoles = [] } = useAuth();
  const { tenant: tenantSlug } = useParams<{ tenant: string }>();
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

  // Mapeamento de seções para roles que têm acesso
  const sectionRoleMap: Record<string, string[]> = {
    'projetos': ['advogado'],
    'agenda': ['advogado', 'controller', 'agenda'],
    'clientes': ['comercial'],
    'financeiro': ['financeiro'],
    'controladoria': ['advogado', 'controller'],
    'documentos': ['advogado', 'controller'],
    'reunioes': ['comercial', 'agenda', 'reunioes'],
  };

  const hasAccess = (section: string) => {
    // Admin tem acesso a tudo
    if (userRoles.includes('admin')) return true;
    
    // Verificar se QUALQUER role do usuário dá acesso à seção
    const allowedRoles = sectionRoleMap[section] || [];
    return userRoles.some(role => allowedRoles.includes(role));
  };

  const menuItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard', route: '/dashboard' },
    { id: 'projetos', icon: FolderOpen, label: 'Projetos', route: '/projects' },
    { id: 'agenda', icon: Calendar, label: 'Agenda', route: '/agenda' },
    { id: 'clientes', icon: Users, label: 'Clientes', route: '/crm' },
    { id: 'financeiro', icon: DollarSign, label: 'Financeiro', route: '/financial' },
    { id: 'controladoria', icon: FileCheck, label: 'Controladoria', route: '/controladoria' },
    { id: 'documentos', icon: FileText, label: 'Documentos', route: '/documentos' },
    { id: 'reunioes', icon: Video, label: 'Reuniões', route: '/reunioes' },
    { id: 'extras', icon: Star, label: 'Extras', route: '/extras' },
  ];

  const isActive = (itemId: string) => {
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
        <Link 
          to={dashboardPath}
          onMouseEnter={() => handleMouseEnter('dashboard')}
          className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none ml-7"
        >
            {isCollapsed ? (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">V</span>
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
             const hasAccessToItem = item.id === 'dashboard' || item.id === 'extras' || hasAccess(item.id);
             
             if (!hasAccessToItem) return null;

             // Tratamento especial para Projetos - abre drawer
             if (item.id === 'projetos') {
               return (
                 <Button
                   key={item.id}
                   variant={isActive(item.id) ? "secondary" : "ghost"}
                   onMouseEnter={() => handleMouseEnter(item.id)}
                   onClick={() => {
                     setActiveDrawer('projetos');
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
             }

            // Tratamento especial para Agenda - abre drawer
            if (item.id === 'agenda') {
              return (
                <Button
                  key={item.id}
                  variant={isActive(item.id) ? "secondary" : "ghost"}
                  onMouseEnter={() => handleMouseEnter(item.id)}
                  onClick={() => {
                    setActiveDrawer('agenda');
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
            }

            // Tratamento especial para Controladoria - abre drawer
            if (item.id === 'controladoria') {
              return (
                <Button
                  key={item.id}
                  variant={isActive(item.id) ? "secondary" : "ghost"}
                  onMouseEnter={() => handleMouseEnter(item.id)}
                  onClick={() => {
                    setActiveDrawer('controladoria');
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
            }
 
            // Tratamento especial para Clientes - abre drawer
            if (item.id === 'clientes') {
              return (
                <Button
                  key={item.id}
                  variant={isActive(item.id) ? "secondary" : "ghost"}
                  onMouseEnter={() => handleMouseEnter(item.id)}
                  onClick={() => {
                    setActiveDrawer('clientes');
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
            }

            // Tratamento especial para Financeiro - abre drawer
            if (item.id === 'financeiro') {
              return (
                <Button
                  key={item.id}
                  variant={isActive(item.id) ? "secondary" : "ghost"}
                  onMouseEnter={() => handleMouseEnter(item.id)}
                  onClick={() => {
                    setActiveDrawer('financeiro');
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
            }

            // Tratamento especial para Reuniões - abre drawer
            if (item.id === 'reunioes') {
              return (
                <Button
                  key={item.id}
                  variant={isActive(item.id) ? "secondary" : "ghost"}
                  onMouseEnter={() => handleMouseEnter(item.id)}
                  onClick={() => {
                    setActiveDrawer('reunioes');
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
            }

            // Tratamento especial para Documentos - abre drawer
            if (item.id === 'documentos') {
              return (
                <Button
                  key={item.id}
                  variant={isActive(item.id) ? "secondary" : "ghost"}
                  onMouseEnter={() => handleMouseEnter(item.id)}
                  onClick={() => {
                    setActiveDrawer('documentos');
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
            }

             return (
               <Button
                 key={item.id}
                 variant={isActive(item.id) ? "secondary" : "ghost"}
                 onMouseEnter={() => handleMouseEnter(item.id)}
                 onClick={() => handleNavigation(item.id, item.route)}
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

        {/* Support Button */}
        <div className="px-2 py-2 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => setSupportOpen(true)}
            className={cn(
              "w-full justify-start gap-3 h-11 text-muted-foreground hover:text-foreground",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? "Suporte" : undefined}
          >
            <Headphones size={20} />
            {!isCollapsed && <span>Suporte</span>}
          </Button>
        </div>

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

      {/* Support Sheet */}
      <SupportSheet open={supportOpen} onOpenChange={setSupportOpen} />

      {/* Drawers */}
      <ProjectsDrawer open={activeDrawer === 'projetos'} onOpenChange={(open) => !open && setActiveDrawer(null)} />
      <ControladoriaDrawer open={activeDrawer === 'controladoria'} onOpenChange={(open) => !open && setActiveDrawer(null)} />
      <CRMDrawer open={activeDrawer === 'clientes'} onOpenChange={(open) => !open && setActiveDrawer(null)} />
      <FinancialDrawer open={activeDrawer === 'financeiro'} onOpenChange={(open) => !open && setActiveDrawer(null)} />
      <ReunioesDrawer open={activeDrawer === 'reunioes'} onOpenChange={(open) => !open && setActiveDrawer(null)} />
      <AgendaDrawer open={activeDrawer === 'agenda'} onOpenChange={(open) => !open && setActiveDrawer(null)} />
      <DocumentosDrawer open={activeDrawer === 'documentos'} onOpenChange={(open) => !open && setActiveDrawer(null)} />

      {/* Spacer to push content */}
      <div className={cn(
        "hidden md:block transition-all duration-300 flex-shrink-0",
        isCollapsed ? "w-16" : "w-56"
      )} />
    </>
  );
};

export default DashboardSidebar;
