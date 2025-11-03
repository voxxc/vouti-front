import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OverviewSection } from "@/components/Dashboard/OverviewSection";
import UserManagement from "@/components/Admin/UserManagement";
import { FolderOpen, Calendar, Users, DollarSign, FileCheck } from "lucide-react";
import { User } from "@/types/user";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import RoleMetricsPanel from "@/components/Dashboard/RoleMetricsPanel";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [showOverview, setShowOverview] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [systemUsers, setSystemUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_users_with_roles');

      if (error) throw error;

      const mappedUsers: User[] = (data || []).map((user: any) => ({
        id: user.user_id,
        email: user.email,
        name: user.full_name || user.email,
        avatar: user.avatar_url,
        role: user.highest_role as 'admin' | 'advogado' | 'comercial' | 'financeiro',
        personalInfo: {},
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at)
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
      // Atualizar informações do perfil (sem role)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: userData.name,
          avatar_url: userData.avatar,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Se a role foi alterada, atualizar na tabela user_roles
      if (userData.role) {
        // Primeiro, remover todas as roles antigas do usuário
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        if (deleteError) throw deleteError;

        // Inserir a nova role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: userData.role
          });

        if (roleError) throw roleError;
      }

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!",
      });

      // Recarregar lista de usuários para refletir mudanças
      fetchUsers();
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

  // Obter role do usuário atual do AuthContext
  const currentUserRole = userRole || 'advogado';

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
        {/* Área Central - Painel de Métricas Personalizado */}
        <div className="flex-1 space-y-6">
          <RoleMetricsPanel currentUser={systemUsers.find(u => u.id === user?.id) || null} />
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