import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/components/Common/ThemeToggle";
import { GlobalSearch } from "@/components/Search/GlobalSearch";
import NotificationCenter from "@/components/Communication/NotificationCenter";
import InternalMessaging from "@/components/Communication/InternalMessaging";
import { ArrowLeft, Calendar, FolderOpen, Users, LogOut, BarChart3, DollarSign, Settings, FileCheck, Video } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { User as UserType } from "@/types/user";

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage?: 'dashboard' | 'projects' | 'agenda' | 'crm' | 'financial' | 'controladoria' | 'reunioes';
  onNavigate?: (page: 'dashboard' | 'projects' | 'agenda' | 'crm' | 'financial' | 'controladoria' | 'reunioes') => void;
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
      console.log('DashboardLayout - Loading users...');
      
      // First, fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, avatar_url, created_at, updated_at');

      if (profilesError) {
        console.error('DashboardLayout - Error loading profiles:', profilesError);
        return;
      }

      if (!profilesData || profilesData.length === 0) {
        console.warn('DashboardLayout - No profiles found');
        return;
      }

      console.log('DashboardLayout - Profiles loaded:', profilesData.length);

      // Second, fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('DashboardLayout - Error loading roles:', rolesError);
      }

      console.log('DashboardLayout - Roles loaded:', rolesData?.length || 0);

      // Merge profiles with roles
      const mappedUsers = profilesData.map((p: any) => {
        const userRole = rolesData?.find((r: any) => r.user_id === p.user_id);
        return {
          id: p.user_id,
          email: p.email,
          name: p.full_name || p.email,
          avatar: p.avatar_url || undefined,
          role: (userRole?.role || 'advogado') as 'admin' | 'advogado' | 'comercial' | 'financeiro',
          createdAt: new Date(p.created_at),
          updatedAt: new Date(p.updated_at),
        };
      });

      console.log('DashboardLayout - Final mapped users:', mappedUsers.length, mappedUsers);
      setUsers(mappedUsers);

      // Set up real-time subscription for new users
      const channel = supabase
        .channel('profiles-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles'
          },
          () => {
            console.log('DashboardLayout - Profile change detected, reloading users...');
            loadUsers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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
    navigate('/auth');
  };

  const handleNavigation = (page: string) => {
    if (onNavigate) {
      onNavigate(page as any);
    } else {
      navigate(`/${page}`);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Floating Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-10 w-2 h-2 rounded-full bg-primary animate-float opacity-60" />
        <div className="absolute bottom-1/3 right-20 w-3 h-3 rounded-full bg-accent animate-float opacity-40" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-primary animate-float opacity-50" style={{ animationDelay: '2s' }} />
        <div className="absolute top-20 left-1/4 w-2 h-2 rounded-full bg-primary animate-float opacity-50" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-40 right-1/3 w-3 h-3 rounded-full bg-accent animate-float opacity-40" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-32 left-1/3 w-2 h-2 rounded-full bg-primary animate-float opacity-60" style={{ animationDelay: '2.5s' }} />
        <div className="absolute top-1/3 right-12 w-2 h-2 rounded-full bg-primary animate-float opacity-60" style={{ animationDelay: '0.3s' }} />
        <div className="absolute bottom-1/4 left-16 w-3 h-3 rounded-full bg-accent animate-float opacity-50" style={{ animationDelay: '1.8s' }} />
        <div className="absolute top-2/3 right-1/3 w-2 h-2 rounded-full bg-primary animate-float opacity-40" style={{ animationDelay: '3s' }} />
        <div className="absolute top-10 left-1/3 w-3 h-3 rounded-full bg-primary animate-float opacity-50" style={{ animationDelay: '0.7s' }} />
        <div className="absolute bottom-20 right-1/4 w-2 h-2 rounded-full bg-accent animate-float opacity-60" style={{ animationDelay: '2.3s' }} />
        <div className="absolute top-1/3 left-12 w-2 h-2 rounded-full bg-primary animate-float opacity-50" style={{ animationDelay: '1.2s' }} />
        <div className="absolute bottom-1/2 right-10 w-3 h-3 rounded-full bg-accent animate-float opacity-40" style={{ animationDelay: '1.7s' }} />
        <div className="absolute top-3/4 left-1/4 w-2 h-2 rounded-full bg-primary animate-float opacity-60" style={{ animationDelay: '0.9s' }} />
      </div>

      {/* Header */}
      <header className="border-b border-border bg-card shadow-card relative z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <button 
            onClick={() => handleNavigation('dashboard')}
            className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg"
            aria-label="Ir para Dashboard"
          >
            <Logo size="sm" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              {/* Ícones de Acesso Rápido */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/projects')}
                title="Projetos"
              >
                <FolderOpen size={18} />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/agenda')}
                title="Agenda"
              >
                <Calendar size={18} />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/crm')}
                title="Clientes"
              >
                <Users size={18} />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/financial')}
                title="Financeiro"
              >
                <DollarSign size={18} />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/controladoria')}
                title="Controladoria"
              >
                <FileCheck size={18} />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/reunioes')}
                title="Reuniões"
              >
                <Video size={18} />
              </Button>

              {/* Separador Visual */}
              <div className="h-6 w-px bg-border mx-2" />

              {/* Botão Dashboard */}
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

              {currentUser && (
                <InternalMessaging currentUser={currentUser} users={users} />
              )}
              
              {user && (
                <NotificationCenter 
                  userId={user.id} 
                  onProjectNavigation={(pid) => navigate(`/project/${pid}`)}
                />
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
      <main className="container max-w-7xl mx-auto px-6 py-8 relative z-10">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;