import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/components/Common/ThemeToggle";
import { GlobalSearch } from "@/components/Search/GlobalSearch";
import NotificationCenter from "@/components/Communication/NotificationCenter";
import InternalMessaging from "@/components/Communication/InternalMessaging";
import { ArrowLeft, Calendar, FolderOpen, Users, LogOut, BarChart3, DollarSign, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage?: 'dashboard' | 'projects' | 'agenda' | 'crm' | 'financial';
  onNavigate?: (page: 'dashboard' | 'projects' | 'agenda' | 'crm' | 'financial') => void;
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
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  const handleNavigation = (page: string) => {
    if (onNavigate) {
      onNavigate(page as any);
    } else {
      navigate(`/${page}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-card">
        <div className="flex items-center justify-between px-6 py-4">
          <Logo size="sm" />
          
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-4">
              <Button
                variant={currentPage === 'dashboard' ? 'default' : 'ghost'}
                onClick={() => handleNavigation('dashboard')}
                className="gap-2"
              >
                <BarChart3 size={16} />
                Dashboard
              </Button>
              <Button
                variant={currentPage === 'projects' ? 'default' : 'ghost'}
                onClick={() => handleNavigation('projects')}
                className="gap-2"
              >
                <FolderOpen size={16} />
                CLIENTES
              </Button>
              <Button
                variant={currentPage === 'agenda' ? 'default' : 'ghost'}
                onClick={() => handleNavigation('agenda')}
                className="gap-2"
              >
                <Calendar size={16} />
                Agenda
              </Button>
              <Button
                variant={currentPage === 'crm' ? 'default' : 'ghost'}
                onClick={() => handleNavigation('crm')}
                className="gap-2"
              >
                <Users size={16} />
                CRM
              </Button>
              <Button
                variant={currentPage === 'financial' ? 'default' : 'ghost'}
                onClick={() => handleNavigation('financial')}
                className="gap-2"
              >
                <DollarSign size={16} />
                Financeiro
              </Button>
            </div>
            
            <div className="flex items-center space-x-4">
              <GlobalSearch projects={projects} />
              
              {/* Communication and Notifications - Temporariamente desabilitado */}
              
              <ThemeToggle />
              {isAdmin && onCreateUser && (
                <Button variant="outline" onClick={onCreateUser} className="gap-2">
                  <Settings size={16} />
                  Usuários
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                Bem-vindo ao JUS OFFICE
              </span>
              <Button variant="ghost" onClick={handleLogout} className="gap-2">
                <LogOut size={16} />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;