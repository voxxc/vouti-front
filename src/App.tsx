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
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={
                <PublicRoute>
                  <Auth />
                </PublicRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/projects" element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              } />
              <Route path="/project/:id" element={
                <ProtectedRoute>
                  <ProjectViewWrapper />
                </ProtectedRoute>
              } />
              <Route path="/project/:id/acordos" element={
                <ProtectedRoute>
                  <AcordosViewWrapper />
                </ProtectedRoute>
              } />
              <Route path="/agenda" element={
                <ProtectedRoute>
                  <Agenda />
                </ProtectedRoute>
              } />
              <Route path="/crm" element={
                <ProtectedRoute>
                  <CRM />
                </ProtectedRoute>
              } />
              <Route path="/financial" element={
                <ProtectedRoute>
                  <Financial />
                </ProtectedRoute>
              } />
              <Route path="/controladoria" element={
                <ProtectedRoute>
                  <Controladoria />
                </ProtectedRoute>
              } />
              <Route path="/landing-page-1" element={<LandingPage1 />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;