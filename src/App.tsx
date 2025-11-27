import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantProvider, useTenant } from "@/contexts/TenantContext";
import { MetalAuthProvider, useMetalAuth } from "@/contexts/MetalAuthContext";
import { LinkAuthProvider, useLinkAuth } from "@/contexts/LinkAuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useState, useEffect } from 'react';
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectViewWrapper from "@/pages/ProjectViewWrapper";
import Agenda from "@/pages/Agenda";
import CRM from "@/pages/CRM";
import AcordosViewWrapper from "@/pages/AcordosViewWrapper";
import Financial from "@/pages/Financial";
import Controladoria from "@/pages/Controladoria";
import ControladoriaNovoProcesso from "@/pages/ControladoriaNovoProcesso";
import ControladoriaProcessoDetalhes from "@/pages/ControladoriaProcessoDetalhes";
import Reunioes from "@/pages/Reunioes";
import ReuniaoClientes from "@/pages/ReuniaoClientes";
import ReuniaoMetricas from "@/pages/ReuniaoMetricas";
import ReuniaoRelatorios from "@/pages/ReuniaoRelatorios";
import AdminReuniaoStatus from "@/pages/AdminReuniaoStatus";
import AdminBackendCode from "@/pages/AdminBackendCode";
import HomePage from "@/pages/HomePage";
import LandingPage1 from "@/pages/LandingPage1";
import LandingPage2 from "@/pages/LandingPage2";
import MetalAuth from "@/pages/MetalAuth";
import MetalDashboard from "@/pages/MetalDashboard";
import MetalAdminUsers from "@/pages/MetalAdminUsers";
import MetalReports from "@/pages/MetalReports";
import LinkAuth from "@/pages/LinkAuth";
import LinkDashboard from "@/pages/LinkDashboard";
import SuperAdmin from "@/pages/SuperAdmin";
import NotFound from "@/pages/NotFound";
import LoadingTransition from "@/components/LoadingTransition";
import "./App.css";

// Protected Route for tenant-based auth
const TenantProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { tenant, loading: tenantLoading, error: tenantError, tenantSlug } = useTenant();
  const [showTransition, setShowTransition] = useState(false);
  const [transitionComplete, setTransitionComplete] = useState(false);
  
  useEffect(() => {
    if (user && !authLoading) {
      const shouldShowTransition = !sessionStorage.getItem('transition_completed');
      setShowTransition(shouldShowTransition);
      
      if (!shouldShowTransition) {
        setTransitionComplete(true);
      }
    }
  }, [user, authLoading]);

  const handleTransitionComplete = () => {
    setTransitionComplete(true);
    sessionStorage.setItem('transition_completed', 'true');
  };

  if (tenantLoading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (tenantError || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Erro</h1>
          <p className="text-muted-foreground">{tenantError || 'Sistema não encontrado'}</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to={`/${tenantSlug}/auth`} replace />;
  }

  if (showTransition && !transitionComplete) {
    return <LoadingTransition onComplete={handleTransitionComplete} />;
  }
  
  return <div className="animate-fade-in">{children}</div>;
};

// Public Route for tenant-based auth
const TenantPublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { tenant, loading: tenantLoading, error: tenantError, tenantSlug } = useTenant();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.includes('/auth') && typeof window !== 'undefined') {
      const intent = localStorage.getItem('auth_intent');
      if (intent === '1') {
        localStorage.removeItem('auth_intent');
      }
    }
  }, [location.pathname]);

  if (tenantLoading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (tenantError || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Erro</h1>
          <p className="text-muted-foreground">{tenantError || 'Sistema não encontrado'}</p>
        </div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to={`/${tenantSlug}/dashboard`} replace />;
  }

  return <>{children}</>;
};

// Legacy routes support - redirect old routes to solvenza
const LegacyProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [showTransition, setShowTransition] = useState(false);
  const [transitionComplete, setTransitionComplete] = useState(false);
  
  useEffect(() => {
    if (user && !loading) {
      const shouldShowTransition = !sessionStorage.getItem('transition_completed');
      setShowTransition(shouldShowTransition);
      
      if (!shouldShowTransition) {
        setTransitionComplete(true);
      }
    }
  }, [user, loading]);

  const handleTransitionComplete = () => {
    setTransitionComplete(true);
    sessionStorage.setItem('transition_completed', 'true');
  };
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }
  
  if (!user) {
    return <Navigate to="/solvenza/auth" replace />;
  }

  if (showTransition && !transitionComplete) {
    return <LoadingTransition onComplete={handleTransitionComplete} />;
  }
  
  return <div className="animate-fade-in">{children}</div>;
};

const LegacyPublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/auth' && typeof window !== 'undefined') {
      const intent = localStorage.getItem('auth_intent');
      if (intent === '1') {
        localStorage.removeItem('auth_intent');
      }
    }
  }, [location.pathname]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }
  
  if (user) {
    return <Navigate to="/solvenza/dashboard" replace />;
  }

  return <>{children}</>;
};

const MetalProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useMetalAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Carregando...</div>;
  }
  
  if (!user) {
    return <Navigate to="/metal-auth" replace />;
  }
  
  return <>{children}</>;
};

const MetalPublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useMetalAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Carregando...</div>;
  }
  
  if (user) {
    return <Navigate to="/metal-dashboard" replace />;
  }
  
  return <>{children}</>;
};

const LinkProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useLinkAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }
  
  if (!user) {
    return <Navigate to="/link-auth" replace />;
  }
  
  return <>{children}</>;
};

const LinkPublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useLinkAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }
  
  if (user) {
    return <Navigate to="/link-dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Helper component for tenant routes
const TenantRouteWrapper = ({ children, isPublic = false }: { children: React.ReactNode; isPublic?: boolean }) => {
  return (
    <TenantProvider>
      <AuthProvider>
        <ThemeProvider>
          {isPublic ? (
            <TenantPublicRoute>{children}</TenantPublicRoute>
          ) : (
            <TenantProtectedRoute>{children}</TenantProtectedRoute>
          )}
        </ThemeProvider>
      </AuthProvider>
    </TenantProvider>
  );
};

function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          {/* Homepage - Always dark mode, isolated from ThemeProvider */}
          <Route path="/" element={<HomePage />} />
          
          {/* ============================================== */}
          {/* ROTAS DINÂMICAS POR TENANT (/:tenant/*)       */}
          {/* ============================================== */}
          
          {/* Auth - Tenant Dynamic */}
          <Route path="/:tenant/auth" element={
            <TenantRouteWrapper isPublic>
              <Auth />
            </TenantRouteWrapper>
          } />
          
          {/* Dashboard - Tenant Dynamic */}
          <Route path="/:tenant/dashboard" element={
            <TenantRouteWrapper>
              <Dashboard />
            </TenantRouteWrapper>
          } />
          
          {/* Projects - Tenant Dynamic */}
          <Route path="/:tenant/projects" element={
            <TenantRouteWrapper>
              <Projects />
            </TenantRouteWrapper>
          } />
          
          <Route path="/:tenant/project/:id" element={
            <TenantRouteWrapper>
              <ProjectViewWrapper />
            </TenantRouteWrapper>
          } />
          
          <Route path="/:tenant/project/:id/acordos" element={
            <TenantRouteWrapper>
              <AcordosViewWrapper />
            </TenantRouteWrapper>
          } />
          
          <Route path="/:tenant/project/:id/sector/:sectorId" element={
            <TenantRouteWrapper>
              <ProjectViewWrapper />
            </TenantRouteWrapper>
          } />
          
          {/* Agenda - Tenant Dynamic */}
          <Route path="/:tenant/agenda" element={
            <TenantRouteWrapper>
              <Agenda />
            </TenantRouteWrapper>
          } />
          
          {/* CRM - Tenant Dynamic */}
          <Route path="/:tenant/crm" element={
            <TenantRouteWrapper>
              <CRM />
            </TenantRouteWrapper>
          } />
          
          {/* Financial - Tenant Dynamic */}
          <Route path="/:tenant/financial" element={
            <TenantRouteWrapper>
              <Financial />
            </TenantRouteWrapper>
          } />
          
          {/* Controladoria - Tenant Dynamic */}
          <Route path="/:tenant/controladoria" element={
            <TenantRouteWrapper>
              <Controladoria />
            </TenantRouteWrapper>
          } />
          
          <Route path="/:tenant/controladoria/novo" element={
            <TenantRouteWrapper>
              <ControladoriaNovoProcesso />
            </TenantRouteWrapper>
          } />
          
          <Route path="/:tenant/controladoria/processo/:id" element={
            <TenantRouteWrapper>
              <ControladoriaProcessoDetalhes />
            </TenantRouteWrapper>
          } />
          
          <Route path="/:tenant/controladoria/processo/:id/editar" element={
            <TenantRouteWrapper>
              <ControladoriaNovoProcesso />
            </TenantRouteWrapper>
          } />
          
          {/* Reuniões - Tenant Dynamic */}
          <Route path="/:tenant/reunioes" element={
            <TenantRouteWrapper>
              <Reunioes />
            </TenantRouteWrapper>
          } />
          
          <Route path="/:tenant/reunioes/metricas" element={
            <TenantRouteWrapper>
              <ReuniaoMetricas />
            </TenantRouteWrapper>
          } />
          
          <Route path="/:tenant/reunioes/relatorios" element={
            <TenantRouteWrapper>
              <ReuniaoRelatorios />
            </TenantRouteWrapper>
          } />
          
          <Route path="/:tenant/reuniao-clientes" element={
            <TenantRouteWrapper>
              <ReuniaoClientes />
            </TenantRouteWrapper>
          } />
          
          {/* Admin - Tenant Dynamic */}
          <Route path="/:tenant/admin/reuniao-status" element={
            <TenantRouteWrapper>
              <AdminReuniaoStatus />
            </TenantRouteWrapper>
          } />
          
          <Route path="/:tenant/admin/backend-code" element={
            <TenantRouteWrapper>
              <AdminBackendCode />
            </TenantRouteWrapper>
          } />
          
          {/* ============================================== */}
          {/* ROTAS LEGADAS (redirect para /solvenza/*)     */}
          {/* Mantidas para compatibilidade temporária       */}
          {/* ============================================== */}
          
          <Route path="/auth" element={<Navigate to="/solvenza/auth" replace />} />
          <Route path="/dashboard" element={<Navigate to="/solvenza/dashboard" replace />} />
          <Route path="/projects" element={<Navigate to="/solvenza/projects" replace />} />
          <Route path="/project/:id" element={<Navigate to="/solvenza/project/:id" replace />} />
          <Route path="/project/:id/acordos" element={<Navigate to="/solvenza/project/:id/acordos" replace />} />
          <Route path="/project/:id/sector/:sectorId" element={<Navigate to="/solvenza/project/:id/sector/:sectorId" replace />} />
          <Route path="/agenda" element={<Navigate to="/solvenza/agenda" replace />} />
          <Route path="/crm" element={<Navigate to="/solvenza/crm" replace />} />
          <Route path="/financial" element={<Navigate to="/solvenza/financial" replace />} />
          <Route path="/controladoria" element={<Navigate to="/solvenza/controladoria" replace />} />
          <Route path="/controladoria/novo" element={<Navigate to="/solvenza/controladoria/novo" replace />} />
          <Route path="/controladoria/processo/:id" element={<Navigate to="/solvenza/controladoria/processo/:id" replace />} />
          <Route path="/controladoria/processo/:id/editar" element={<Navigate to="/solvenza/controladoria/processo/:id/editar" replace />} />
          <Route path="/reunioes" element={<Navigate to="/solvenza/reunioes" replace />} />
          <Route path="/reunioes/metricas" element={<Navigate to="/solvenza/reunioes/metricas" replace />} />
          <Route path="/reunioes/relatorios" element={<Navigate to="/solvenza/reunioes/relatorios" replace />} />
          <Route path="/reuniao-clientes" element={<Navigate to="/solvenza/reuniao-clientes" replace />} />
          <Route path="/admin/reuniao-status" element={<Navigate to="/solvenza/admin/reuniao-status" replace />} />
          <Route path="/admin/backend-code" element={<Navigate to="/solvenza/admin/backend-code" replace />} />
          
          {/* ============================================== */}
          {/* SISTEMAS SEPARADOS (Metal e Link)             */}
          {/* ============================================== */}
          
          {/* Vouti.bio Routes - Isolated Link in Bio System */}
          <Route path="/link-auth" element={
            <LinkAuthProvider>
              <LinkPublicRoute>
                <LinkAuth />
              </LinkPublicRoute>
            </LinkAuthProvider>
          } />
          <Route path="/link-dashboard" element={
            <LinkAuthProvider>
              <ThemeProvider>
                <LinkProtectedRoute>
                  <LinkDashboard />
                </LinkProtectedRoute>
              </ThemeProvider>
            </LinkAuthProvider>
          } />
          
          {/* MetalSystem Routes - Completely separate from Mora */}
          <Route path="/metal-auth" element={
            <MetalAuthProvider>
              <MetalPublicRoute>
                <MetalAuth />
              </MetalPublicRoute>
            </MetalAuthProvider>
          } />
          <Route path="/metal-dashboard" element={
            <MetalAuthProvider>
              <MetalProtectedRoute>
                <MetalDashboard />
              </MetalProtectedRoute>
            </MetalAuthProvider>
          } />
          <Route path="/metal-admin-users" element={
            <MetalAuthProvider>
              <MetalProtectedRoute>
                <MetalAdminUsers />
              </MetalProtectedRoute>
            </MetalAuthProvider>
          } />
          <Route path="/metal-reports" element={
            <MetalAuthProvider>
              <MetalProtectedRoute>
                <MetalReports />
              </MetalProtectedRoute>
            </MetalAuthProvider>
          } />
          
          {/* Landing Pages - Marketing - Tenant Dynamic */}
          <Route path="/:tenant/landing-1" element={
            <TenantProvider>
              <LandingPage1 />
            </TenantProvider>
          } />
          <Route path="/:tenant/office" element={
            <TenantProvider>
              <LandingPage2 />
            </TenantProvider>
          } />
          
          {/* Legacy Landing Page redirects */}
          <Route path="/landing-1" element={<Navigate to="/solvenza/landing-1" replace />} />
          <Route path="/office" element={<Navigate to="/solvenza/office" replace />} />
          
          {/* Super Admin Panel */}
          <Route path="/super-admin" element={<SuperAdmin />} />
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </TooltipProvider>
  );
}

export default App;
