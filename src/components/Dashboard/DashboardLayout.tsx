import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/components/Common/ThemeToggle";
import { GlobalSearch } from "@/components/Search/GlobalSearch";
import NotificationCenter from "@/components/Communication/NotificationCenter";
import InternalMessaging from "@/components/Communication/InternalMessaging";
import { ArrowLeft, Calendar, FolderOpen, Users, LogOut, BarChart3, DollarSign, Settings } from "lucide-react";
import { User } from "@/types/user";

interface DashboardLayoutProps {
  children: ReactNode;
  onLogout: () => void;
  currentPage?: 'dashboard' | 'projects' | 'agenda' | 'crm' | 'financial';
  onNavigate?: (page: 'dashboard' | 'projects' | 'agenda' | 'crm' | 'financial') => void;
  projects?: any[];
  onCreateUser?: () => void;
  isAdmin?: boolean;
  currentUser?: User;
  users?: User[];
  onProjectNavigation?: (projectId: string) => void;
}

const DashboardLayout = ({ 
  children, 
  onLogout, 
  currentPage, 
  onNavigate, 
  projects = [], 
  onCreateUser, 
  isAdmin = false,
  currentUser,
  users = [],
  onProjectNavigation
}: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-card">
        <div className="flex items-center justify-between px-6 py-4">
          <Logo size="sm" />
          
          <div className="flex items-center gap-4">
            {onNavigate && (
              <div className="flex items-center space-x-4">
                <Button
                  variant={currentPage === 'dashboard' ? 'default' : 'ghost'}
                  onClick={() => onNavigate('dashboard')}
                  className="gap-2"
                >
                  <BarChart3 size={16} />
                  Dashboard
                </Button>
                <Button
                  variant={currentPage === 'projects' ? 'default' : 'ghost'}
                  onClick={() => onNavigate('projects')}
                  className="gap-2"
                >
                  <FolderOpen size={16} />
                  CLIENTES
                </Button>
                <Button
                  variant={currentPage === 'agenda' ? 'default' : 'ghost'}
                  onClick={() => onNavigate('agenda')}
                  className="gap-2"
                >
                  <Calendar size={16} />
                  Agenda
                </Button>
                <Button
                  variant={currentPage === 'crm' ? 'default' : 'ghost'}
                  onClick={() => onNavigate('crm')}
                  className="gap-2"
                >
                  <Users size={16} />
                  CRM
                </Button>
                <Button
                  variant={currentPage === 'financial' ? 'default' : 'ghost'}
                  onClick={() => onNavigate('financial')}
                  className="gap-2"
                >
                  <DollarSign size={16} />
                  Financeiro
                </Button>
              </div>
            )}
            
            <div className="flex items-center space-x-4">
              <GlobalSearch projects={projects} />
              
              {/* Communication and Notifications */}
              {currentUser && (
                <>
                  <InternalMessaging 
                    currentUser={currentUser} 
                    users={users}
                  />
                  <NotificationCenter 
                    userId={currentUser.id}
                    onProjectNavigation={onProjectNavigation}
                  />
                </>
              )}
              
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
              <Button variant="ghost" onClick={onLogout} className="gap-2">
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