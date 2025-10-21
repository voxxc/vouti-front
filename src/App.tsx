import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
import HomePage from "@/pages/HomePage";
import LandingPage1 from "@/pages/LandingPage1";
import LandingPage2 from "@/pages/LandingPage2";
import MetalAuth from "@/pages/MetalAuth";
import MetalDashboard from "@/pages/MetalDashboard";
import MetalAdminUsers from "@/pages/MetalAdminUsers";
import MetalReports from "@/pages/MetalReports";
import LinkAuth from "@/pages/LinkAuth";
import NotFound from "@/pages/NotFound";
import LoadingTransition from "@/components/LoadingTransition";
import "./App.css";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [showTransition, setShowTransition] = useState(false);
  const [transitionComplete, setTransitionComplete] = useState(false);
  
  useEffect(() => {
    if (user && !loading) {
      // Check if we just logged in (transition should show)
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
    return <Navigate to="/auth" replace />;
  }

  if (showTransition && !transitionComplete) {
    return <LoadingTransition onComplete={handleTransitionComplete} />;
  }
  
  return <div className="animate-fade-in">{children}</div>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
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
    return <Navigate to="/dashboard" replace />;
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


function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          {/* Homepage - Always dark mode, isolated from ThemeProvider */}
          <Route path="/" element={<HomePage />} />
          
          {/* Auth and Protected Routes - Wrapped with ThemeProvider for individual user themes */}
          <Route path="/auth" element={
            <AuthProvider>
              <ThemeProvider>
                <PublicRoute>
                  <Auth />
                </PublicRoute>
              </ThemeProvider>
            </AuthProvider>
          } />
              <Route path="/dashboard" element={
                <AuthProvider>
                  <ThemeProvider>
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  </ThemeProvider>
                </AuthProvider>
              } />
              <Route path="/projects" element={
                <AuthProvider>
                  <ThemeProvider>
                    <ProtectedRoute>
                      <Projects />
                    </ProtectedRoute>
                  </ThemeProvider>
                </AuthProvider>
              } />
              <Route path="/project/:id" element={
                <AuthProvider>
                  <ThemeProvider>
                    <ProtectedRoute>
                      <ProjectViewWrapper />
                    </ProtectedRoute>
                  </ThemeProvider>
                </AuthProvider>
              } />
              <Route path="/project/:id/acordos" element={
                <AuthProvider>
                  <ThemeProvider>
                    <ProtectedRoute>
                      <AcordosViewWrapper />
                    </ProtectedRoute>
                  </ThemeProvider>
                </AuthProvider>
              } />
              <Route path="/agenda" element={
                <AuthProvider>
                  <ThemeProvider>
                    <ProtectedRoute>
                      <Agenda />
                    </ProtectedRoute>
                  </ThemeProvider>
                </AuthProvider>
              } />
              <Route path="/crm" element={
                <AuthProvider>
                  <ThemeProvider>
                    <ProtectedRoute>
                      <CRM />
                    </ProtectedRoute>
                  </ThemeProvider>
                </AuthProvider>
              } />
              <Route path="/financial" element={
                <AuthProvider>
                  <ThemeProvider>
                    <ProtectedRoute>
                      <Financial />
                    </ProtectedRoute>
                  </ThemeProvider>
                </AuthProvider>
              } />
              <Route path="/controladoria" element={
                <AuthProvider>
                  <ThemeProvider>
                    <ProtectedRoute>
                      <Controladoria />
                    </ProtectedRoute>
                  </ThemeProvider>
                </AuthProvider>
              } />
              <Route path="/controladoria/novo" element={
                <AuthProvider>
                  <ThemeProvider>
                    <ProtectedRoute>
                      <ControladoriaNovoProcesso />
                    </ProtectedRoute>
                  </ThemeProvider>
                </AuthProvider>
              } />
              <Route path="/controladoria/processo/:id" element={
                <AuthProvider>
                  <ThemeProvider>
                    <ProtectedRoute>
                      <ControladoriaProcessoDetalhes />
                    </ProtectedRoute>
                  </ThemeProvider>
                </AuthProvider>
              } />
              <Route path="/controladoria/processo/:id/editar" element={
                <AuthProvider>
                  <ThemeProvider>
                    <ProtectedRoute>
                      <ControladoriaNovoProcesso />
                    </ProtectedRoute>
                  </ThemeProvider>
                </AuthProvider>
              } />
              
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
                      <div className="min-h-screen flex items-center justify-center">
                        <h1 className="text-4xl font-bold">Vouti.bio Dashboard</h1>
                      </div>
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
              
              {/* Landing Pages - Marketing - Always dark mode, isolated from ThemeProvider */}
              <Route path="/landing-1" element={<LandingPage1 />} />
              <Route path="/landing-2" element={<LandingPage2 />} />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </BrowserRouter>
        </TooltipProvider>
  );
}

export default App;