import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OverviewSection } from "@/components/Dashboard/OverviewSection";
import UserManagement from "@/components/Admin/UserManagement";
import { FolderOpen, Calendar, Users, DollarSign, BarChart3 } from "lucide-react";
import { User } from "@/types/user";

const Dashboard = () => {
  const navigate = useNavigate();
  const [showOverview, setShowOverview] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [systemUsers, setSystemUsers] = useState<User[]>([]);

  const handleAddUser = (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setSystemUsers([...systemUsers, newUser]);
  };

  const handleEditUser = (userId: string, userData: Partial<User>) => {
    setSystemUsers(systemUsers.map(user => 
      user.id === userId 
        ? { ...user, ...userData, updatedAt: new Date() }
        : user
    ));
  };

  const handleDeleteUser = (userId: string) => {
    setSystemUsers(systemUsers.filter(user => user.id !== userId));
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bem-vindo ao JUS OFFICE
          </h1>
          <p className="text-lg text-muted-foreground">
            Sistema de Gestão Jurídica
          </p>
        </div>

        {/* Visão Geral Section */}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;