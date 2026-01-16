import { useState, useEffect, useMemo } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/useTenantId";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";

const Dashboard = () => {
  const { navigate } = useTenantNavigation();
  const { user, userRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [showOverview, setShowOverview] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const { tenantId } = useTenantId();
  const { stopLoading, navigationId } = useNavigationLoading();

  // Optimized: Use React Query with cache for users
  // Usa a função com parâmetro para suportar Super Admin acessando tenants
  const { data: systemUsers = [], refetch: refetchUsers, isFetched } = useQuery({
    queryKey: ['system-users', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_users_with_roles_by_tenant', {
        target_tenant_id: tenantId
      });
      if (error) throw error;
      
      return (data || []).map((user: any) => ({
        id: user.user_id,
        email: user.email,
        name: user.full_name || user.email,
        avatar: user.avatar_url,
        role: user.highest_role as 'admin' | 'advogado' | 'comercial' | 'financeiro' | 'controller' | 'agenda' | 'reunioes',
        personalInfo: {},
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at)
      })) as User[];
    },
    enabled: !!tenantId && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Sinalizar que a página está pronta quando os dados carregarem
  useEffect(() => {
    if (isFetched || (!authLoading && !tenantId)) {
      stopLoading(navigationId);
    }
  }, [isFetched, authLoading, tenantId, stopLoading, navigationId]);

  const handleAddUser = () => {
    refetchUsers();
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

      toast({
        title: "Sucesso",
        description: "Usuario atualizado com sucesso!",
      });

      refetchUsers();
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

      toast({
        title: "Sucesso",
        description: "Usuario removido com sucesso!",
      });

      refetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover usuario.",
        variant: "destructive",
      });
    }
  };

  const currentUserRole: 'admin' | 'advogado' | 'comercial' | 'financeiro' | 'controller' | 'agenda' | 'reunioes' = (userRole as any) || 'advogado';

  // Get current user's name from auth metadata or systemUsers (whichever loads first)
  const currentUserName = useMemo(() => {
    const fromAuth = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
    const fromUsers = systemUsers.find(u => u.id === user?.id)?.name;
    return fromUsers || fromAuth;
  }, [user, systemUsers]);

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

  // Optimized: Render immediately without blocking on users loading
  return (
    <DadosSensiveisProvider>
      <DashboardLayout
        currentPage="dashboard"
        isAdmin={currentUserRole === 'admin'}
        onCreateUser={() => setShowUserManagement(true)}
      >
        <div className="space-y-6">
          <RoleMetricsPanel 
            userId={user?.id}
            userRole={currentUserRole}
            userName={currentUserName}
          />
        </div>
      </DashboardLayout>
    </DadosSensiveisProvider>
  );
};

export default Dashboard;
