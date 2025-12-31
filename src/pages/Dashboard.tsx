import { useState, useEffect } from "react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { Button } from "@/components/ui/button";
import { OverviewSection } from "@/components/Dashboard/OverviewSection";
import UserManagement from "@/components/Admin/UserManagement";
import { User } from "@/types/user";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import RoleMetricsPanel from "@/components/Dashboard/RoleMetricsPanel";
import { DadosSensiveisProvider } from "@/contexts/DadosSensiveisContext";

const Dashboard = () => {
  const { navigate } = useTenantNavigation();
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
        role: user.highest_role as 'admin' | 'advogado' | 'comercial' | 'financeiro' | 'controller' | 'agenda',
        personalInfo: {},
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at)
      }));

      setSystemUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuarios.",
        variant: "destructive",
      });
    }
  };

  const handleAddUser = (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    fetchUsers();
  };

  const handleEditUser = async (userId: string, userData: Partial<User>) => {
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: userData.name,
          avatar_url: userData.avatar,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      if (userData.role) {
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        if (deleteError) throw deleteError;

        // Buscar tenant_id do usuario
        const { data: profileData } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', userId)
          .single();

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: userData.role,
            tenant_id: profileData?.tenant_id
          });

        if (roleError) throw roleError;
      }

      toast({
        title: "Sucesso",
        description: "Usuario atualizado com sucesso!",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar usuario.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setSystemUsers(systemUsers.filter(user => user.id !== userId));

      toast({
        title: "Sucesso",
        description: "Usuario removido com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover usuario.",
        variant: "destructive",
      });
    }
  };

  const currentUserRole: 'admin' | 'advogado' | 'comercial' | 'financeiro' | 'controller' | 'agenda' = (userRole as any) || 'advogado';

  if (showUserManagement) {
    return (
      <DashboardLayout currentPage="dashboard">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setShowUserManagement(false)}>
              Voltar ao Dashboard
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
      <DashboardLayout currentPage="dashboard">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setShowOverview(false)}>
              Voltar ao Dashboard
            </Button>
          </div>
          <OverviewSection users={systemUsers} projects={[]} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DadosSensiveisProvider>
      <DashboardLayout
        currentPage="dashboard"
        isAdmin={currentUserRole === 'admin'}
        onCreateUser={() => setShowUserManagement(true)}
      >
        <div className="space-y-6">
          <RoleMetricsPanel currentUser={systemUsers.find(u => u.id === user?.id) || null} />
        </div>
      </DashboardLayout>
    </DadosSensiveisProvider>
  );
};

export default Dashboard;
