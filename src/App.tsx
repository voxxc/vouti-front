import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MetalAuthProvider, useMetalAuth } from "@/contexts/MetalAuthContext";
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
import LandingPage2 from "@/pages/LandingPage2";
import LandingPage3 from "@/pages/LandingPage3";
import MetalAuth from "@/pages/MetalAuth";
import MetalDashboard from "@/pages/MetalDashboard";
import MetalAdminUsers from "@/pages/MetalAdminUsers";
import MetalReports from "@/pages/MetalReports";
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


function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
        <Routes>
          {/* Landing Page - Public, no auth/theme providers */}
          <Route path="/" element={<LandingPage2 />} />
          
          {/* Auth and Protected Routes - Wrapped with providers */}
          <Route path="/auth" element={
            <AuthProvider>
              <PublicRoute>
                <Auth />
              </PublicRoute>
            </AuthProvider>
          } />
              <Route path="/dashboard" element={
                <AuthProvider>
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                </AuthProvider>
              } />
              <Route path="/projects" element={
                <AuthProvider>
                  <ProtectedRoute>
                    <Projects />
                  </ProtectedRoute>
                </AuthProvider>
              } />
              <Route path="/project/:id" element={
                <AuthProvider>
                  <ProtectedRoute>
                    <ProjectViewWrapper />
                  </ProtectedRoute>
                </AuthProvider>
              } />
              <Route path="/project/:id/acordos" element={
                <AuthProvider>
                  <ProtectedRoute>
                    <AcordosViewWrapper />
                  </ProtectedRoute>
                </AuthProvider>
              } />
              <Route path="/agenda" element={
                <AuthProvider>
                  <ProtectedRoute>
                    <Agenda />
                  </ProtectedRoute>
                </AuthProvider>
              } />
              <Route path="/crm" element={
                <AuthProvider>
                  <ProtectedRoute>
                    <CRM />
                  </ProtectedRoute>
                </AuthProvider>
              } />
              <Route path="/financial" element={
                <AuthProvider>
                  <ProtectedRoute>
                    <Financial />
                  </ProtectedRoute>
                </AuthProvider>
              } />
              <Route path="/controladoria" element={
                <AuthProvider>
                  <ProtectedRoute>
                    <Controladoria />
                  </ProtectedRoute>
                </AuthProvider>
              } />
              <Route path="/controladoria/novo" element={
                <AuthProvider>
                  <ProtectedRoute>
                    <ControladoriaNovoProcesso />
                  </ProtectedRoute>
                </AuthProvider>
              } />
              <Route path="/controladoria/processo/:id" element={
                <AuthProvider>
                  <ProtectedRoute>
                    <ControladoriaProcessoDetalhes />
                  </ProtectedRoute>
                </AuthProvider>
              } />
              <Route path="/controladoria/processo/:id/editar" element={
                <AuthProvider>
                  <ProtectedRoute>
                    <ControladoriaNovoProcesso />
                  </ProtectedRoute>
                </AuthProvider>
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
              
              {/* Landing Page 3 - Optional direct access */}
              <Route path="/landing-page-3" element={<LandingPage3 />} />
              
              {/* Redirect old landing routes to homepage */}
              <Route path="/landing-page-1" element={<Navigate to="/" replace />} />
              <Route path="/landing-page-2" element={<Navigate to="/" replace />} />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
  );
}

export default App;