import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
import LandingPage1 from "@/pages/LandingPage1";
import LandingPage2 from "@/pages/LandingPage2";
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
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing Page - Public, no auth/theme providers */}
          <Route path="/" element={<LandingPage2 />} />
          
          {/* Auth and Protected Routes - Wrapped with providers */}
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
              
              {/* Additional Landing Pages */}
              <Route path="/landing-page-1" element={<LandingPage1 />} />
              <Route path="/landing-page-2" element={<LandingPage2 />} />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </BrowserRouter>
    </TooltipProvider>
  );
}

export default App;