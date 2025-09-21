import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Plus, Search, Users, Calendar } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";

interface DashboardProps {
  onLogout: () => void;
  onNavigateToProjects: () => void;
  onNavigateToAgenda: () => void;
}

const Dashboard = ({ onLogout, onNavigateToProjects, onNavigateToAgenda }: DashboardProps) => {
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
              <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                +2 novos esta semana
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <div className="h-4 w-4 bg-status-progress rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">
                Tarefas em progresso
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">25</div>
              <p className="text-xs text-muted-foreground">
                Total de clientes ativos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-card border-0 hover:shadow-elegant transition-shadow cursor-pointer" onClick={onNavigateToProjects}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-law-blue/10 rounded-lg">
                  <FolderOpen className="h-6 w-6 text-law-blue" />
                </div>
                <div>
                  <CardTitle>Projetos</CardTitle>
                  <CardDescription>
                    Gerencie todos os seus casos e projetos jurídicos
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button onClick={onNavigateToProjects} className="gap-2" variant="professional">
                  <FolderOpen size={16} />
                  Acessar Projetos
                </Button>
                <Button onClick={onNavigateToAgenda} className="gap-2" variant="outline">
                  <Calendar size={16} />
                  Acessar Agenda
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0 opacity-60">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-muted-foreground">Outras Seções</CardTitle>
                  <CardDescription>
                    Funcionalidades adicionais em breve
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="minimal" className="w-full" disabled>
                Em Desenvolvimento
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;