import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantProvider, useTenant } from "@/contexts/TenantContext";
import { MetalAuthProvider, useMetalAuth } from "@/contexts/MetalAuthContext";
import { VotechAuthProvider, useVotechAuth } from "@/contexts/VotechAuthContext";
import { LinkAuthProvider, useLinkAuth } from "@/contexts/LinkAuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NavigationLoadingProvider } from "@/contexts/NavigationLoadingContext";
import { NavigationLoadingOverlay } from "@/components/Common/NavigationLoadingOverlay";
import { useState, useEffect, lazy, Suspense } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Lazy-loaded pages — each page is code-split into its own chunk
const Auth = lazy(() => import("@/pages/Auth"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Projects = lazy(() => import("@/pages/Projects"));
const ProjectViewWrapper = lazy(() => import("@/pages/ProjectViewWrapper"));
const Agenda = lazy(() => import("@/pages/Agenda"));
const CRM = lazy(() => import("@/pages/CRM"));
const WhatsApp = lazy(() => import("@/pages/WhatsApp"));
const ClienteCadastro = lazy(() => import("@/pages/ClienteCadastro"));
const AcordosViewWrapper = lazy(() => import("@/pages/AcordosViewWrapper"));
const Financial = lazy(() => import("@/pages/Financial"));
const Controladoria = lazy(() => import("@/pages/Controladoria"));
const ControladoriaNovoProcesso = lazy(() => import("@/pages/ControladoriaNovoProcesso"));
const ControladoriaProcessoDetalhes = lazy(() => import("@/pages/ControladoriaProcessoDetalhes"));
const Reunioes = lazy(() => import("@/pages/Reunioes"));
const ReuniaoClientes = lazy(() => import("@/pages/ReuniaoClientes"));
const ReuniaoMetricas = lazy(() => import("@/pages/ReuniaoMetricas"));
const ReuniaoRelatorios = lazy(() => import("@/pages/ReuniaoRelatorios"));
const AdminReuniaoStatus = lazy(() => import("@/pages/AdminReuniaoStatus"));
const AdminBackendCode = lazy(() => import("@/pages/AdminBackendCode"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const LandingPage1 = lazy(() => import("@/pages/LandingPage1"));
const LandingPage2 = lazy(() => import("@/pages/LandingPage2"));
const MetalAuth = lazy(() => import("@/pages/MetalAuth"));
const MetalDashboard = lazy(() => import("@/pages/MetalDashboard"));
const MetalAdminUsers = lazy(() => import("@/pages/MetalAdminUsers"));
const MetalReports = lazy(() => import("@/pages/MetalReports"));
const LinkAuth = lazy(() => import("@/pages/LinkAuth"));
const LinkDashboard = lazy(() => import("@/pages/LinkDashboard"));
import LinkPublicProfile from "@/pages/LinkPublicProfile";
const BatinkLanding = lazy(() => import("@/pages/BatinkLanding"));
const BatinkAuth = lazy(() => import("@/pages/BatinkAuth"));
const BatinkDashboard = lazy(() => import("@/pages/BatinkDashboard"));
const BatinkAdmin = lazy(() => import("@/pages/BatinkAdmin"));
const SpnAuth = lazy(() => import("@/pages/SpnAuth"));
const SpnDashboard = lazy(() => import("@/pages/SpnDashboard"));
const VotechAuth = lazy(() => import("@/pages/VotechAuth"));
const VotechDashboard = lazy(() => import("@/pages/VotechDashboard"));
const VeridictoLanding = lazy(() => import("@/pages/VeridictoLanding"));
const SuperAdmin = lazy(() => import("@/pages/SuperAdmin"));
const SuperAdminWhatsApp = lazy(() => import("@/pages/SuperAdminWhatsApp"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Install = lazy(() => import("@/pages/Install"));
const WhatsAppRedirect = lazy(() => import("@/pages/WhatsAppRedirect"));
const Documentos = lazy(() => import("@/pages/Documentos"));
const DocumentoEditar = lazy(() => import("@/pages/DocumentoEditar"));
const CrmLogin = lazy(() => import("@/pages/CrmLogin"));
const CrmApp = lazy(() => import("@/pages/CrmApp"));
const CrmLanding = lazy(() => import("@/pages/CrmLanding"));
const CrmSalesLanding = lazy(() => import("@/pages/CrmSalesLanding"));

import Logo from "@/components/Logo";
import { BatinkAuthProvider, useBatinkAuth } from "@/contexts/BatinkAuthContext";
import { SpnAuthProvider, useSpnAuth } from "@/contexts/SpnAuthContext";
import { 
  LegacyProjectRedirect, 
  LegacyProjectAcordosRedirect, 
  LegacyProjectSectorRedirect,
  LegacyControladoriaProcessoRedirect,
  LegacyControladoriaProcessoEditarRedirect,
  LegacyBotRedirect
} from "@/components/Routing/LegacyRedirects";
import "./App.css";

// Minimal suspense fallback for lazy-loaded pages
const PageFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-pulse">
      <Logo size="lg" />
    </div>
  </div>
);

// Optimized: Minimal loading state with logo pulse instead of 1.2s artificial delay
const TenantProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { tenant, loading: tenantLoading, error: tenantError, tenantSlug } = useTenant();

  if (tenantLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Logo size="lg" />
        </div>
      </div>
    );
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
  
  return <>{children}</>;
};

// Public Route for tenant-based auth
const TenantPublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { tenant, loading: tenantLoading, error: tenantError, tenantSlug } = useTenant();

  if (tenantLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Logo size="lg" />
        </div>
      </div>
    );
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

// Legacy routes support - redirect old routes to solvenza (optimized)
const LegacyProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Logo size="lg" />
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/solvenza/auth" replace />;
  }
  
  return <>{children}</>;
};

const LegacyPublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Logo size="lg" />
        </div>
      </div>
    );
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
    return <Navigate to="/linkbio" replace />;
  }
  
  return <>{children}</>;
};

const LinkPublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useLinkAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }
  
  if (user) {
    return <Navigate to="/linkbio/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const BatinkProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useBatinkAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#1a1625] text-white">Carregando...</div>;
  }
  
  if (!user) {
    return <Navigate to="/batink/auth" replace />;
  }
  
  return <>{children}</>;
};

const BatinkPublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useBatinkAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#1a1625] text-white">Carregando...</div>;
  }
  
  if (user) {
    return <Navigate to="/batink/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const SpnProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isSpnUser, signOut } = useSpnAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  if (!user) return <Navigate to="/spn/auth" replace />;
  // User is authenticated but NOT an SPN user → block access
  if (!isSpnUser) {
    signOut();
    return <Navigate to="/spn/auth" replace />;
  }
  return <>{children}</>;
};

const SpnPublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isSpnUser } = useSpnAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  // Only redirect to dashboard if user is authenticated AND is an SPN user
  if (user && isSpnUser) return <Navigate to="/spn/dashboard" replace />;
  return <>{children}</>;
};


const VotechProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useVotechAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Carregando...</div>;
  if (!user) return <Navigate to="/votech/auth" replace />;
  return <>{children}</>;
};

const VotechPublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useVotechAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Carregando...</div>;
  if (user) return <Navigate to="/votech/dashboard" replace />;
  return <>{children}</>;
};

const TenantAwareAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { tenant } = useTenant();
  return (
    <AuthProvider urlTenantId={tenant?.id}>
      {children}
    </AuthProvider>
  );
};

// Helper component for tenant routes with NavigationLoadingProvider
const TenantRouteWrapper = ({ children, isPublic = false }: { children: React.ReactNode; isPublic?: boolean }) => {
  return (
    <TenantProvider>
      <TenantAwareAuthProvider>
        <ThemeProvider>
          <NavigationLoadingProvider>
            <NavigationLoadingOverlay />
            {isPublic ? (
              <TenantPublicRoute>{children}</TenantPublicRoute>
            ) : (
              <TenantProtectedRoute>{children}</TenantProtectedRoute>
            )}
          </NavigationLoadingProvider>
        </ThemeProvider>
      </TenantAwareAuthProvider>
    </TenantProvider>
  );
};

function App() {
  const isCrmDomain = window.location.hostname.endsWith('crm.vouti.co');

  if (isCrmDomain) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/:tenant" element={<CrmApp />} />
              <Route path="/" element={<CrmLanding />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
            <Toaster />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Homepage - Always dark mode, isolated from ThemeProvider */}
            <Route path="/" element={<HomePage />} />
            
            {/* PWA Install Page */}
            <Route path="/install" element={<Install />} />
            
            {/* WhatsApp Redirect */}
            <Route path="/wa" element={<WhatsAppRedirect />} />
            
            {/* ============================================== */}
            {/* ROTAS DINÂMICAS POR TENANT (/:tenant/*)       */}
            {/* ============================================== */}
            
            {/* Auth - Tenant Dynamic */}
            <Route path="/:tenant/auth" element={
              <TenantRouteWrapper isPublic>
                <Auth />
              </TenantRouteWrapper>
            } />
            
            {/* Reset Password - Tenant Dynamic (with optional code) */}
            <Route path="/:tenant/reset-password/:code?" element={
              <TenantProvider>
                <AuthProvider>
                  <ThemeProvider>
                    <ResetPassword />
                  </ThemeProvider>
                </AuthProvider>
              </TenantProvider>
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
            
            {/* Clientes (antigo CRM) - Tenant Dynamic */}
            <Route path="/:tenant/clientes" element={
              <TenantRouteWrapper>
                <CRM />
              </TenantRouteWrapper>
            } />
            
            {/* Vouti.CRM (antigo Bot) - Tenant Dynamic */}
            <Route path="/:tenant/crm" element={
              <TenantRouteWrapper>
                <WhatsApp />
              </TenantRouteWrapper>
            } />
            
            {/* Cliente Cadastro - Tenant Dynamic */}
            <Route path="/:tenant/clientes/cliente/novo" element={
              <TenantRouteWrapper>
                <ClienteCadastro />
              </TenantRouteWrapper>
            } />
            
            <Route path="/:tenant/clientes/cliente/:id" element={
              <TenantRouteWrapper>
                <ClienteCadastro />
              </TenantRouteWrapper>
            } />
            
            {/* Legacy redirect: /:tenant/bot → /:tenant/crm */}
            <Route path="/:tenant/bot" element={<LegacyBotRedirect />} />
            
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
            
            
            
            {/* Documentos - Tenant Dynamic */}
            <Route path="/:tenant/documentos" element={
              <TenantRouteWrapper>
                <Documentos />
              </TenantRouteWrapper>
            } />
            
            <Route path="/:tenant/documentos/:id" element={
              <TenantRouteWrapper>
                <DocumentoEditar />
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
            <Route path="/project/:id" element={<LegacyProjectRedirect />} />
            <Route path="/project/:id/acordos" element={<LegacyProjectAcordosRedirect />} />
            <Route path="/project/:id/sector/:sectorId" element={<LegacyProjectSectorRedirect />} />
            <Route path="/agenda" element={<Navigate to="/solvenza/agenda" replace />} />
            {/* Vouti.CRM - Standalone por tenant */}
            <Route path="/crm" element={<Navigate to="/" replace />} />
            <Route path="/crm/:tenant/auth" element={<CrmLogin />} />
            <Route path="/crm/:tenant" element={<CrmApp />} />
            <Route path="/bot" element={<Navigate to="/solvenza/crm" replace />} />
            <Route path="/financial" element={<Navigate to="/solvenza/financial" replace />} />
            <Route path="/controladoria" element={<Navigate to="/solvenza/controladoria" replace />} />
            <Route path="/controladoria/novo" element={<Navigate to="/solvenza/controladoria/novo" replace />} />
            <Route path="/controladoria/processo/:id" element={<LegacyControladoriaProcessoRedirect />} />
            <Route path="/controladoria/processo/:id/editar" element={<LegacyControladoriaProcessoEditarRedirect />} />
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
            <Route path="/linkbio" element={
              <LinkAuthProvider>
                <LinkPublicRoute>
                  <LinkAuth />
                </LinkPublicRoute>
              </LinkAuthProvider>
            } />
            <Route path="/linkbio/dashboard" element={
              <LinkAuthProvider>
                <ThemeProvider>
                  <LinkProtectedRoute>
                    <LinkDashboard />
                  </LinkProtectedRoute>
                </ThemeProvider>
              </LinkAuthProvider>
            } />
            {/* Legacy link-bio redirects */}
            <Route path="/link-auth" element={<Navigate to="/linkbio" replace />} />
            <Route path="/link-dashboard" element={<Navigate to="/linkbio/dashboard" replace />} />
            
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
            <Route path="/metal-admin" element={
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
            
            {/* BATINK Routes - Isolated Point System */}
            <Route path="/batink" element={<BatinkLanding />} />
            <Route path="/batink/auth" element={
              <BatinkAuthProvider>
                <BatinkPublicRoute>
                  <BatinkAuth />
                </BatinkPublicRoute>
              </BatinkAuthProvider>
            } />
            <Route path="/batink/dashboard" element={
              <BatinkAuthProvider>
                <BatinkProtectedRoute>
                  <BatinkDashboard />
                </BatinkProtectedRoute>
              </BatinkAuthProvider>
            } />
            <Route path="/batink/admin" element={
              <BatinkAuthProvider>
                <BatinkProtectedRoute>
                  <BatinkAdmin />
                </BatinkProtectedRoute>
              </BatinkAuthProvider>
            } />
            
            {/* SPN Routes - Isolated English Learning Platform */}
            <Route path="/spn/auth" element={
              <SpnAuthProvider>
                <SpnPublicRoute>
                  <SpnAuth />
                </SpnPublicRoute>
              </SpnAuthProvider>
            } />
            <Route path="/spn/dashboard" element={
              <SpnAuthProvider>
                <SpnProtectedRoute>
                  <SpnDashboard />
                </SpnProtectedRoute>
              </SpnAuthProvider>
            } />
            <Route path="/spn" element={<Navigate to="/spn/auth" replace />} />
            
            {/* VoTech Routes - Isolated Financial Platform */}
            <Route path="/votech/auth" element={
              <VotechAuthProvider>
                <VotechPublicRoute>
                  <VotechAuth />
                </VotechPublicRoute>
              </VotechAuthProvider>
            } />
            <Route path="/votech/dashboard" element={
              <VotechAuthProvider>
                <VotechProtectedRoute>
                  <VotechDashboard />
                </VotechProtectedRoute>
              </VotechAuthProvider>
            } />
            <Route path="/votech" element={<Navigate to="/votech/auth" replace />} />
            
            {/* Veridicto Landing Page */}
            <Route path="/veridicto" element={<VeridictoLanding />} />
            
            {/* Landing Pages - Tenant Dynamic */}
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
            <Route path="/super-admin/crm" element={<SuperAdminWhatsApp />} />
            {/* Legacy redirect */}
            <Route path="/super-admin/bot" element={<Navigate to="/super-admin/crm" replace />} />
            
            {/* Public Link-in-Bio Profile */}
            <Route path="/:username" element={<LinkPublicProfile />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <Toaster />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
