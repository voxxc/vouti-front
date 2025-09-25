import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Plus, Search, Users, Calendar } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";

interface DashboardProps {
  onLogout: () => void;
  onNavigateToProjects: () => void;
  onNavigateToAgenda: () => void;
  onNavigateToCRM: () => void;
}

const Dashboard = ({ onLogout, onNavigateToProjects, onNavigateToAgenda, onNavigateToCRM }: DashboardProps) => {
  return (
    <DashboardLayout onLogout={onLogout}>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Painel de Controle
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus casos e projetos jurídicos de forma eficiente
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                Clientes com pagamento em dia
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contrato em Andamento</CardTitle>
              <div className="h-4 w-4 bg-status-progress rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">
                Clientes em prospecção
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">25</div>
              <p className="text-xs text-muted-foreground">
                Todos os clientes cadastrados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-card border-0 hover:shadow-elegant transition-all duration-200 cursor-pointer" onClick={onNavigateToProjects}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Contratos</h3>
                  <p className="text-sm text-muted-foreground">Gerencie todos os seus contratos e casos jurídicos</p>
                </div>
                <div className="p-3 bg-law-blue/10 rounded-lg">
                  <FolderOpen className="h-6 w-6 text-law-blue" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0 hover:shadow-elegant transition-all duration-200 cursor-pointer" onClick={onNavigateToAgenda}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Agenda</h3>
                  <p className="text-sm text-muted-foreground">Próximos compromissos e reuniões</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0 hover:shadow-elegant transition-all duration-200 cursor-pointer" onClick={onNavigateToCRM}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">CRM</h3>
                  <p className="text-sm text-muted-foreground">Gestão de clientes e oportunidades</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-orange-600" />
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