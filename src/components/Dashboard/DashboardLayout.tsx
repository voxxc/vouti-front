import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { LogOut, FolderOpen, Calendar, Users, Home } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  onLogout: () => void;
  currentPage?: 'dashboard' | 'projects' | 'agenda' | 'crm';
  onNavigate?: (page: 'dashboard' | 'projects' | 'agenda' | 'crm') => void;
}

const DashboardLayout = ({ children, onLogout, currentPage, onNavigate }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-card">
        <div className="flex items-center justify-between px-6 py-4">
          <Logo size="sm" />
          
          <div className="flex items-center gap-4">
            {onNavigate && (
              <nav className="flex items-center gap-2">
                <Button
                  variant={currentPage === 'dashboard' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate('dashboard')}
                  className="gap-2"
                >
                  <Home size={16} />
                  Dashboard
                </Button>
                <Button
                  variant={currentPage === 'projects' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate('projects')}
                  className="gap-2"
                >
                  <FolderOpen size={16} />
                  CLIENTES
                </Button>
                <Button
                  variant={currentPage === 'agenda' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate('agenda')}
                  className="gap-2"
                >
                  <Calendar size={16} />
                  Agenda
                </Button>
                <Button
                  variant={currentPage === 'crm' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate('crm')}
                  className="gap-2"
                >
                  <Users size={16} />
                  CRM
                </Button>
              </nav>
            )}
            <span className="text-sm text-muted-foreground">
              Bem-vindo ao sistema
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="gap-2"
            >
              <LogOut size={16} />
              Sair
            </Button>
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