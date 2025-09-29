import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/components/Common/ThemeToggle";
import { GlobalSearch } from "@/components/Search/GlobalSearch";
import NotificationCenter from "@/components/Communication/NotificationCenter";
import InternalMessaging from "@/components/Communication/InternalMessaging";
import { ArrowLeft, Calendar, FolderOpen, Users, LogOut, BarChart3, DollarSign, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { User as UserType } from "@/types/user";

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage?: 'dashboard' | 'projects' | 'agenda' | 'crm' | 'financial' | 'controladoria';
  onNavigate?: (page: 'dashboard' | 'projects' | 'agenda' | 'crm' | 'financial' | 'controladoria') => void;
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

  const [users, setUsers] = useState<UserType[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, avatar_url, role, created_at, updated_at');

      if (!error && data) {
        setUsers(
          data.map((p: any) => ({
            id: p.user_id,
            email: p.email,
            name: p.full_name || p.email,
            avatar: p.avatar_url || undefined,
            role: p.role as 'admin' | 'advogado' | 'comercial' | 'financeiro',
            createdAt: new Date(p.created_at),
            updatedAt: new Date(p.updated_at),
          }))
        );
      }
    };
    loadUsers();
  }, []);

  const currentUser: UserType | undefined = user
    ? {
        id: user.id,
        email: user.email ?? '',
        name:
          users.find((u) => u.id === user.id)?.name ||
          (user.user_metadata?.full_name || user.email || 'Usuário'),
        avatar: users.find((u) => u.id === user.id)?.avatar,
        role: users.find((u) => u.id === user.id)?.role || 'advogado',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    : undefined;

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
            </div>
            
            <div className="flex items-center space-x-4">
              <GlobalSearch projects={projects} />

              {user && (
                <NotificationCenter 
                  userId={user.id} 
                  onProjectNavigation={(pid) => navigate(`/project/${pid}`)}
                />
              )}

              {currentUser && users.length > 0 && (
                <InternalMessaging currentUser={currentUser} users={users} />
              )}
              
              <ThemeToggle />
              {isAdmin && onCreateUser && (
                <Button variant="outline" onClick={onCreateUser} className="gap-2">
                  <Settings size={16} />
                  Usuários
                </Button>
              )}
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