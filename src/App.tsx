import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantProvider, useTenant } from "@/contexts/TenantContext";
import { MetalAuthProvider, useMetalAuth } from "@/contexts/MetalAuthContext";
import { LinkAuthProvider, useLinkAuth } from "@/contexts/LinkAuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NavigationLoadingProvider } from "@/contexts/NavigationLoadingContext";
import { NavigationLoadingOverlay } from "@/components/Common/NavigationLoadingOverlay";
import { useState, useEffect } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectViewWrapper from "@/pages/ProjectViewWrapper";
import Agenda from "@/pages/Agenda";
import CRM from "@/pages/CRM";
import WhatsApp from "@/pages/WhatsApp";
import ClienteCadastro from "@/pages/ClienteCadastro";
import AcordosViewWrapper from "@/pages/AcordosViewWrapper";
import Financial from "@/pages/Financial";
import Controladoria from "@/pages/Controladoria";
import ControladoriaNovoProcesso from "@/pages/ControladoriaNovoProcesso";
import ControladoriaProcessoDetalhes from "@/pages/ControladoriaProcessoDetalhes";
import Reunioes from "@/pages/Reunioes";
import ReuniaoClientes from "@/pages/ReuniaoClientes";
import ReuniaoMetricas from "@/pages/ReuniaoMetricas";
import ReuniaoRelatorios from "@/pages/ReuniaoRelatorios";
import Extras from "@/pages/Extras";
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
import BatinkLanding from "@/pages/BatinkLanding";
import BatinkAuth from "@/pages/BatinkAuth";
import BatinkDashboard from "@/pages/BatinkDashboard";
import BatinkAdmin from "@/pages/BatinkAdmin";
import { BatinkAuthProvider, useBatinkAuth } from "@/contexts/BatinkAuthContext";
import VeridictoLanding from "@/pages/VeridictoLanding";
import SuperAdmin from "@/pages/SuperAdmin";
import NotFound from "@/pages/NotFound";
import Documentos from "@/pages/Documentos";
import DocumentoEditar from "@/pages/DocumentoEditar";
import Logo from "@/components/Logo";
import { 
  LegacyProjectRedirect, 
  LegacyProjectAcordosRedirect, 
  LegacyProjectSectorRedirect,
  LegacyControladoriaProcessoRedirect,
  LegacyControladoriaProcessoEditarRedirect
} from "@/components/Routing/LegacyRedirects";
import "./App.css";

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

// Component that passes tenant.id to AuthProvider for super admin access
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
  return (
    <QueryClientProvider client={queryClient}>
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
            
            {/* CRM - Tenant Dynamic */}
            <Route path="/:tenant/crm" element={
              <TenantRouteWrapper>
                <CRM />
              </TenantRouteWrapper>
            } />
            
            {/* WhatsApp - Tenant Dynamic (nova página dedicada) */}
            <Route path="/:tenant/whatsapp" element={
              <TenantRouteWrapper>
                <WhatsApp />
              </TenantRouteWrapper>
            } />
            
            {/* CRM Cliente - Tenant Dynamic */}
            <Route path="/:tenant/crm/cliente/novo" element={
              <TenantRouteWrapper>
                <ClienteCadastro />
              </TenantRouteWrapper>
            } />
            
            <Route path="/:tenant/crm/cliente/:id" element={
              <TenantRouteWrapper>
                <ClienteCadastro />
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
            
            {/* Extras - Tenant Dynamic */}
            <Route path="/:tenant/extras" element={
              <TenantRouteWrapper>
                <Extras />
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
            <Route path="/crm" element={<Navigate to="/solvenza/crm" replace />} />
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
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
