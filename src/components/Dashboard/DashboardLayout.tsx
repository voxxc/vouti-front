import { ReactNode, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/Common/ThemeToggle";
import { AvisoBanner } from "@/components/Common/AvisoBanner";
import { GlobalSearch } from "@/components/Search/GlobalSearch";
import { ProjectQuickSearch } from "@/components/Search/ProjectQuickSearch";
import NotificationCenter from "@/components/Communication/NotificationCenter";
import InternalMessaging from "@/components/Communication/InternalMessaging";
import { DeadlineDetailDialog } from "@/components/Agenda/DeadlineDetailDialog";
import { LogOut, Settings, Loader2, Clock } from "lucide-react";

import { TOTPSheet } from "./TOTPSheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { User as UserType } from "@/types/user";
import { useTenantId } from "@/hooks/useTenantId";
import { useAvisosPendentes } from "@/hooks/useAvisosPendentes";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import DashboardSidebar, { ActiveDrawer } from "./DashboardSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { ProjectDrawer } from "@/components/Project/ProjectDrawer";

// Drawers
import { ProjectsDrawer } from "@/components/Projects/ProjectsDrawer";
import { ControladoriaDrawer } from "@/components/Controladoria/ControladoriaDrawer";
import { CRMDrawer } from "@/components/CRM/CRMDrawer";
import { FinancialDrawer } from "@/components/Financial/FinancialDrawer";
import { ReunioesDrawer } from "@/components/Reunioes/ReunioesDrawer";
import { AgendaDrawer } from "@/components/Agenda/AgendaDrawer";
import { DocumentosDrawer } from "@/components/Documentos/DocumentosDrawer";
import { WhatsAppDrawer } from "@/components/WhatsApp/WhatsAppDrawer";
import { ExtrasDrawer } from "@/components/Extras/ExtrasDrawer";
import { PublicacoesDrawer } from "@/components/Publicacoes/PublicacoesDrawer";

// ID do sistema "Gestão Jurídica" para avisos
const GESTAO_JURIDICA_ID = 'e571a35b-1b38-4b8a-bea2-e7bdbe2cdf82';

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage?: 'dashboard' | 'projects' | 'agenda' | 'crm' | 'financial' | 'controladoria' | 'reunioes' | 'extras' | 'documentos';
  onNavigate?: (page: 'dashboard' | 'projects' | 'agenda' | 'crm' | 'financial' | 'controladoria' | 'reunioes' | 'extras' | 'documentos') => void;
  projects?: any[];
  onCreateUser?: () => void;
  isAdmin?: boolean;
  onProjectNavigation?: (projectId: string) => void;
}

const DashboardLayout = ({ 
  children, 
  currentPage, 
  onNavigate, 
  projects = [], 
  onCreateUser, 
  isAdmin = false,
  onProjectNavigation
}: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { tenant: tenantSlug } = useParams<{ tenant: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signOut, loading: authLoading } = useAuth();
  const { tenantId, loading: tenantLoading } = useTenantId();
  const { isNavigating } = useNavigationLoading();

  const [users, setUsers] = useState<UserType[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [totpSheetOpen, setTotpSheetOpen] = useState(false);
  const [projectDrawerOpen, setProjectDrawerOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [pendingProtocoloId, setPendingProtocoloId] = useState<string | null>(null);
  const [deadlineDetailOpen, setDeadlineDetailOpen] = useState(false);
  const [deadlineDetailId, setDeadlineDetailId] = useState<string | undefined>();
  
  // Estado central para o drawer ativo - persistido em sessionStorage
  const [activeDrawer, setActiveDrawerState] = useState<ActiveDrawer>(() => {
    try {
      const saved = sessionStorage.getItem('vouti-active-drawer');
      return saved ? (saved as ActiveDrawer) : null;
    } catch { return null; }
  });

  const setActiveDrawer = useCallback((drawer: ActiveDrawer) => {
    setActiveDrawerState(drawer);
    try {
      if (drawer) {
        sessionStorage.setItem('vouti-active-drawer', drawer);
      } else {
        sessionStorage.removeItem('vouti-active-drawer');
      }
    } catch { /* ignore */ }
  }, []);

  // Clear drawer state when opening from external link (e.g., "Ver Projeto")
  useEffect(() => {
    if (searchParams.get('clearDrawer') === 'true') {
      sessionStorage.removeItem('vouti-active-drawer');
      setActiveDrawerState(null);
      searchParams.delete('clearDrawer');
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tenantPath = (path: string) => {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    if (tenantSlug) {
      return `/${tenantSlug}/${cleanPath}`;
    }
    return `/${cleanPath}`;
  };

  useEffect(() => {
    if (!tenantId) {
      setUsersLoading(false);
      return;
    }

    let isMounted = true;

    const loadUsers = async (silent = false) => {
      if (!silent) setUsersLoading(true);
      
      // Carregar profiles e roles em paralelo
      const [profilesResult, rolesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, email, full_name, avatar_url, created_at, updated_at, tenant_id')
          .eq('tenant_id', tenantId),
        supabase
          .from('user_roles')
          .select('user_id, role, tenant_id')
          .eq('tenant_id', tenantId)
      ]);

      if (!isMounted) return;

      if (profilesResult.error) {
        console.error('DashboardLayout - Error loading profiles:', profilesResult.error);
        setUsersLoading(false);
        return;
      }

      const profilesData = profilesResult.data;
      const rolesData = rolesResult.data;

      if (rolesResult.error) {
        console.error('DashboardLayout - Error loading roles:', rolesResult.error);
      }

      if (!profilesData || profilesData.length === 0) {
        setUsersLoading(false);
        return;
      }

      const rolePriority: Record<string, number> = {
        'admin': 6,
        'controller': 5,
        'financeiro': 4,
        'comercial': 3,
        'agenda': 2,
        'advogado': 1,
        'estagiario': 0,
        'perito': -1
      };

      const mappedUsers = profilesData.map((p: any) => {
        const userRoles = rolesData?.filter((r: any) => r.user_id === p.user_id) || [];
        
        let highestRole = 'advogado';
        if (userRoles.length > 0) {
          const highest = userRoles.reduce((prev: any, current: any) => {
            const prevPriority = rolePriority[prev.role] || 0;
            const currentPriority = rolePriority[current.role] || 0;
            return currentPriority > prevPriority ? current : prev;
          });
          highestRole = highest.role;
        }

        return {
          id: p.user_id,
          email: p.email,
          name: p.full_name || p.email,
          avatar: p.avatar_url || undefined,
          role: highestRole as 'admin' | 'advogado' | 'comercial' | 'financeiro' | 'controller' | 'agenda',
          createdAt: new Date(p.created_at),
          updatedAt: new Date(p.updated_at),
        };
      });

      if (isMounted) {
        setUsers(prev => {
          const prevIds = prev.map(u => u.id).join(',');
          const newIds = mappedUsers.map((u: any) => u.id).join(',');
          return prevIds === newIds ? prev : mappedUsers;
        });
        setUsersLoading(false);
      }
    };

    // Carga inicial com loading visível
    loadUsers(false);

    // Canal Realtime FORA de loadUsers, com cleanup adequado
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => loadUsers(true) // silent: sem setUsersLoading(true)
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  // Determine if we're in a loading state
  // Não mostrar loader interno se estamos em navegação global (overlay já está cobrindo)
  const isLoading = (authLoading || tenantLoading) && !isNavigating;

  // Check if user is admin or controller (for TOTP access)
  const currentUserRole = users.find((u) => u.id === user?.id)?.role;
  const isCurrentUserAdmin = currentUserRole === 'admin';
  const canSeeTOTP = currentUserRole === 'admin' || currentUserRole === 'controller';

  // Fetch pending avisos for admins
  const { avisosPendentes, confirmarCiencia } = useAvisosPendentes(
    isCurrentUserAdmin ? user?.id || null : null,
    GESTAO_JURIDICA_ID
  );

  const handleConfirmarCiencia = async (avisoId: string) => {
    await confirmarCiencia.mutateAsync(avisoId);
  };

  const currentUser: UserType | undefined = user
    ? {
        id: user.id,
        email: user.email ?? '',
        name:
          users.find((u) => u.id === user.id)?.name ||
          (user.user_metadata?.full_name || user.email || 'Usuario'),
        avatar: users.find((u) => u.id === user.id)?.avatar,
        role: users.find((u) => u.id === user.id)?.role || 'advogado',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    : undefined;

  const handleLogout = async () => {
    await signOut();
    navigate(tenantPath('/auth'));
  };

  const handleQuickProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setProjectDrawerOpen(true);
  };

  // Handler para mudança de drawer do sidebar
  const handleDrawerChange = useCallback((drawer: ActiveDrawer) => {
    setActiveDrawer(drawer);
    // Ao voltar para o dashboard, fechar também drawers independentes
    if (drawer === null) {
      setProjectDrawerOpen(false);
      setSelectedProjectId(null);
    }
  }, [setActiveDrawer]);

  // Memoized handler para fechar drawers
  const handleDrawerClose = useCallback((open: boolean) => {
    if (!open) setActiveDrawer(null);
  }, [setActiveDrawer]);

  return (
    <>
      {/* Banner de Avisos para Administradores */}
      {isCurrentUserAdmin && avisosPendentes.length > 0 && (
        <AvisoBanner 
          avisos={avisosPendentes}
          onConfirmarCiencia={handleConfirmarCiencia}
        />
      )}
      
      <div className="min-h-screen bg-background flex w-full overflow-x-hidden">
      {/* Sidebar - agora controlado */}
      <DashboardSidebar 
        currentPage={currentPage} 
        activeDrawer={activeDrawer}
        onDrawerChange={handleDrawerChange}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-y-auto">
        {/* Header - Fixed */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="flex items-center justify-between px-3 md:px-6 h-[49px] overflow-hidden min-w-0">
            {/* Left side - Quick search (desktop only) */}
            <div className="hidden md:flex items-center gap-2">
              <ProjectQuickSearch 
                tenantPath={tenantPath} 
                onSelectProject={handleQuickProjectSelect}
              />
            </div>
            <div className="md:hidden" />
            
            {/* Right Side - Tools */}
            <div className="flex items-center gap-1.5 md:gap-3 ml-auto">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setTotpSheetOpen(true)}
                title="Autenticador 2FA"
                className="hidden sm:inline-flex h-8 w-8 md:h-9 md:w-9"
              >
                <Clock className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <GlobalSearch projects={projects} />
              {currentUser && (
                <InternalMessaging currentUser={currentUser} users={users} />
              )}
              
              {user && (
                <>
                  <NotificationCenter 
                    userId={user.id} 
                    onProjectNavigation={(pid) => navigate(tenantPath(`/project/${pid}`))}
                    onProcessoNavigation={(processoId) => navigate(tenantPath(`/controladoria?processo=${processoId}`))}
                    onDeadlineNavigation={(deadlineId) => {
                      setDeadlineDetailId(deadlineId);
                      setDeadlineDetailOpen(true);
                    }}
                    onProtocoloNavigation={(projectId, protocoloId) => {
                      setSelectedProjectId(projectId);
                      setPendingProtocoloId(protocoloId);
                      setProjectDrawerOpen(true);
                    }}
                  />
                  <DeadlineDetailDialog
                    deadlineId={deadlineDetailId || null}
                    open={deadlineDetailOpen}
                    onOpenChange={(open) => {
                      setDeadlineDetailOpen(open);
                      if (!open) setDeadlineDetailId(undefined);
                    }}
                  />
                </>
              )}

              <ThemeToggle />
              
              {isAdmin && onCreateUser && (
                <Button variant="outline" size="sm" onClick={onCreateUser} className="gap-2">
                  <Settings size={16} />
                   <span className="hidden sm:inline">Usuários</span>
                </Button>
              )}
              
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut size={16} />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Floating Elements */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-1/4 left-10 w-2 h-2 rounded-full bg-primary animate-float opacity-60" />
          <div className="absolute bottom-1/3 right-20 w-3 h-3 rounded-full bg-accent animate-float opacity-40" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-primary animate-float opacity-50" style={{ animationDelay: '2s' }} />
          <div className="absolute top-20 left-1/4 w-2 h-2 rounded-full bg-primary animate-float opacity-50" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-40 right-1/3 w-3 h-3 rounded-full bg-accent animate-float opacity-40" style={{ animationDelay: '1.5s' }} />
          <div className="absolute bottom-32 left-1/3 w-2 h-2 rounded-full bg-primary animate-float opacity-60" style={{ animationDelay: '2.5s' }} />
        </div>

        {/* Main Content - Dashboard sempre renderizado */}
        <main className="flex-1 container max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-8 pb-20 md:pb-8 relative z-10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      </div>
      
      {/* TOTP Sheet */}
      <TOTPSheet open={totpSheetOpen} onOpenChange={setTotpSheetOpen} isAdmin={canSeeTOTP} />
      
      {/* Project Drawer (busca rápida) */}
      <ProjectDrawer
        open={projectDrawerOpen}
        onOpenChange={setProjectDrawerOpen}
        projectId={selectedProjectId}
      />

      {/* Drawers de seções - agora gerenciados aqui no layout */}
      <ProjectsDrawer 
        open={activeDrawer === 'projetos'} 
        onOpenChange={handleDrawerClose}
        onSelectProject={handleQuickProjectSelect}
      />
      <ControladoriaDrawer 
        open={activeDrawer === 'controladoria'} 
        onOpenChange={handleDrawerClose} 
      />
      <CRMDrawer 
        open={activeDrawer === 'clientes'} 
        onOpenChange={handleDrawerClose} 
      />
      <FinancialDrawer 
        open={activeDrawer === 'financeiro'} 
        onOpenChange={handleDrawerClose} 
      />
      <ReunioesDrawer 
        open={activeDrawer === 'reunioes'} 
        onOpenChange={handleDrawerClose} 
      />
      <AgendaDrawer 
        open={activeDrawer === 'agenda'} 
        onOpenChange={handleDrawerClose} 
      />
      <DocumentosDrawer 
        open={activeDrawer === 'documentos'} 
        onOpenChange={handleDrawerClose} 
      />
      <WhatsAppDrawer 
        open={activeDrawer === 'whatsapp'} 
        onOpenChange={handleDrawerClose} 
      />
      <ExtrasDrawer 
        open={activeDrawer === 'extras'} 
        onOpenChange={handleDrawerClose} 
      />
      <PublicacoesDrawer 
        open={activeDrawer === 'publicacoes'} 
        onOpenChange={handleDrawerClose} 
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeDrawer={activeDrawer}
        onDrawerChange={handleDrawerChange}
        onDashboardClick={() => handleDrawerChange(null)}
      />
    </>
  );
};

export default DashboardLayout;
