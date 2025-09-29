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

  return (
    <DashboardLayout
      isAdmin={currentUserRole === 'admin'}
      onCreateUser={() => setShowUserManagement(true)}
    >
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bem-vindo ao JUS OFFICE
          </h1>
          <p className="text-lg text-muted-foreground">
            Sistema de Gestão Jurídica
          </p>
        </div>

        {/* Visão Geral Section - Apenas para Admin */}
        {currentUserRole === 'admin' && (
          <div className="bg-gradient-primary p-6 rounded-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">VISÃO GERAL</h2>
                <p className="text-white/90">Métricas e desempenho da equipe</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* CLIENTES - Acesso para Admin e Advogado */}
          {hasAccess('clientes') && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/projects')}>
              <CardHeader className="text-center">
                <div className="mx-auto p-3 bg-law-blue/10 rounded-lg w-fit">
                  <FolderOpen className="h-8 w-8 text-law-blue" />
                </div>
                <CardTitle className="text-xl">CLIENTES</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">CLIENTES</h3>
                    <p className="text-sm text-muted-foreground">Gerencie todos os seus clientes e casos jurídicos</p>
                  </div>
                  <div className="p-3 bg-law-blue/10 rounded-lg">
                    <FolderOpen className="h-6 w-6 text-law-blue" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AGENDA - Acesso para Admin e Advogado */}
          {hasAccess('agenda') && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/agenda')}>
              <CardHeader className="text-center">
                <div className="mx-auto p-3 bg-law-blue/10 rounded-lg w-fit">
                  <Calendar className="h-8 w-8 text-law-blue" />
                </div>
                <CardTitle className="text-xl">Agenda</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Agenda</h3>
                    <p className="text-sm text-muted-foreground">Organize compromissos e prazos importantes</p>
                  </div>
                  <div className="p-3 bg-law-blue/10 rounded-lg">
                    <Calendar className="h-6 w-6 text-law-blue" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* CRM - Acesso para Admin e Comercial */}
          {hasAccess('crm') && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/crm')}>
              <CardHeader className="text-center">
                <div className="mx-auto p-3 bg-law-blue/10 rounded-lg w-fit">
                  <Users className="h-8 w-8 text-law-blue" />
                </div>
                <CardTitle className="text-xl">CRM</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">CRM</h3>
                    <p className="text-sm text-muted-foreground">Gestão de relacionamento com clientes</p>
                  </div>
                  <div className="p-3 bg-law-blue/10 rounded-lg">
                    <Users className="h-6 w-6 text-law-blue" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* FINANCEIRO - Acesso para Admin e Financeiro */}
          {hasAccess('financeiro') && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/financial')}>
              <CardHeader className="text-center">
                <div className="mx-auto p-3 bg-law-blue/10 rounded-lg w-fit">
                  <DollarSign className="h-8 w-8 text-law-blue" />
                </div>
                <CardTitle className="text-xl">Financeiro</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Financeiro</h3>
                    <p className="text-sm text-muted-foreground">Controle financeiro e inadimplência</p>
                  </div>
                  <div className="p-3 bg-law-blue/10 rounded-lg">
                    <DollarSign className="h-6 w-6 text-law-blue" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* CONTROLADORIA - Acesso para Admin e Advogado */}
          {hasAccess('controladoria') && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/controladoria')}>
              <CardHeader className="text-center">
                <div className="mx-auto p-3 bg-law-blue/10 rounded-lg w-fit">
                  <FileCheck className="h-8 w-8 text-law-blue" />
                </div>
                <CardTitle className="text-xl">Controladoria</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Controladoria</h3>
                    <p className="text-sm text-muted-foreground">Gestão e controle de processos</p>
                  </div>
                  <div className="p-3 bg-law-blue/10 rounded-lg">
                    <FileCheck className="h-6 w-6 text-law-blue" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mensagem para usuários sem acesso */}
        {!hasAccess('clientes') && !hasAccess('agenda') && !hasAccess('crm') && !hasAccess('financeiro') && !hasAccess('controladoria') && (
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">Acesso Restrito</h3>
            <p className="text-sm text-muted-foreground">Entre em contato com o administrador para obter acesso às funcionalidades do sistema.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;