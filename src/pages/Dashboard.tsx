import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OverviewSection } from "@/components/Dashboard/OverviewSection";
import UserManagement from "@/components/Admin/UserManagement";
import { FolderOpen, Calendar, Users, DollarSign, BarChart3, FileCheck } from "lucide-react";
import { User } from "@/types/user";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showOverview, setShowOverview] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [systemUsers, setSystemUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedUsers: User[] = (data || []).map(profile => ({
        id: profile.user_id,
        email: profile.email,
        name: profile.full_name || profile.email,
        avatar: profile.avatar_url,
        role: profile.role as 'admin' | 'advogado' | 'comercial' | 'financeiro',
        personalInfo: {},
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at)
      }));

      setSystemUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários.",
        variant: "destructive",
      });
    }
  };

  const handleAddUser = (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    // User is created via Supabase Auth in UserManagement component
    // Refresh the user list
    fetchUsers();
  };

  const handleEditUser = async (userId: string, userData: Partial<User>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: userData.name,
          role: userData.role,
          avatar_url: userData.avatar,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      setSystemUsers(systemUsers.map(user => 
        user.id === userId 
          ? { ...user, ...userData, updatedAt: new Date() }
          : user
      ));

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!",
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar usuário.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Note: You should implement proper user deletion
      // This is a simplified version
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setSystemUsers(systemUsers.filter(user => user.id !== userId));

      toast({
        title: "Sucesso",
        description: "Usuário removido com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover usuário.",
        variant: "destructive",
      });
    }
  };

  if (showUserManagement) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setShowUserManagement(false)}>
              ← Voltar ao Dashboard
            </Button>
          </div>
          <UserManagement
            users={systemUsers}
            onAddUser={handleAddUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (showOverview) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setShowOverview(false)}>
              ← Voltar ao Dashboard
            </Button>
          </div>
          <OverviewSection users={systemUsers} projects={[]} />
        </div>
      </DashboardLayout>
    );
  }

  // Obter role do usuário atual
  const currentUserRole = systemUsers.find(u => u.id === user?.id)?.role || 'advogado';

  // Função para verificar se o usuário tem acesso a uma seção
  const hasAccess = (section: string) => {
    if (currentUserRole === 'admin') return true;
    if (section === 'clientes' && (currentUserRole === 'advogado')) return true;
    if (section === 'agenda' && (currentUserRole === 'advogado')) return true;
    if (section === 'crm' && (currentUserRole === 'comercial')) return true;
    if (section === 'financeiro' && (currentUserRole === 'financeiro')) return true;
    if (section === 'controladoria' && (currentUserRole === 'advogado')) return true;
    return false;
  };

  const menuItems = [
    { id: 'clientes', icon: FolderOpen, label: 'Clientes', route: '/projects' },
    { id: 'agenda', icon: Calendar, label: 'Agenda', route: '/agenda' },
    { id: 'crm', icon: Users, label: 'CRM', route: '/crm' },
    { id: 'financeiro', icon: DollarSign, label: 'Financeiro', route: '/financial' },
    { id: 'controladoria', icon: FileCheck, label: 'Controladoria', route: '/controladoria' },
  ];

  return (
    <DashboardLayout
      isAdmin={currentUserRole === 'admin'}
      onCreateUser={() => setShowUserManagement(true)}
    >
      <div className="flex gap-6 h-full">
        {/* Área Central - Dados */}
        <div className="flex-1 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Bem-vindo ao MORA
            </h1>
            <p className="text-lg text-muted-foreground">
              Sistema de Gestão Jurídica
            </p>
          </div>

          {/* Visão Geral Section - Apenas para Admin */}
          {currentUserRole === 'admin' && (
            <div className="bg-gradient-primary p-6 rounded-lg border border-border/50 shadow-elegant">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold mb-2 text-primary-foreground">VISÃO GERAL</h2>
                  <p className="text-primary-foreground/90">Métricas e desempenho da equipe</p>
                </div>
                <Button 
                  variant="secondary" 
                  onClick={() => setShowOverview(true)}
                  className="gap-2"
                >
                  <BarChart3 size={16} />
                  Ver Detalhes
                </Button>
              </div>
            </div>
          )}

          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{systemUsers.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Módulos Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {menuItems.filter(item => hasAccess(item.id)).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Seu Perfil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground capitalize">
                  {currentUserRole}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mensagem para usuários sem acesso */}
          {!hasAccess('clientes') && !hasAccess('agenda') && !hasAccess('crm') && !hasAccess('financeiro') && !hasAccess('controladoria') && (
            <div className="text-center p-8">
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">Acesso Restrito</h3>
              <p className="text-sm text-muted-foreground">Entre em contato com o administrador para obter acesso às funcionalidades do sistema.</p>
            </div>
          )}
        </div>

        {/* Menu Lateral Direito */}
        <div className="w-20 border-l border-border bg-card">
          <div className="flex flex-col gap-2 p-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const hasItemAccess = hasAccess(item.id);
              
              return hasItemAccess ? (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(item.route)}
                  className="h-16 w-16 flex flex-col items-center justify-center gap-1 hover:bg-accent group"
                  title={item.label}
                >
                  <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
                    {item.label}
                  </span>
                </Button>
              ) : null;
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;