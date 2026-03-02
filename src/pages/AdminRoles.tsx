import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import RoleManagement from '@/components/Admin/RoleManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function AdminRoles() {
  return (
    <DashboardLayout currentPage="dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Gerenciamento de Permissões
          </h1>
          <p className="text-muted-foreground mt-2">
            Controle as permissões e roles dos usuários do sistema
          </p>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Sobre as Roles</CardTitle>
            <CardDescription>
              Entenda o que cada role permite fazer no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium">🔴 Admin</p>
              <p className="text-sm text-muted-foreground">Acesso completo a todas as funcionalidades do sistema</p>
            </div>
            <div>
              <p className="font-medium">🟦 Controller</p>
              <p className="text-sm text-muted-foreground">Responsável pela controladoria, pode conferir andamentos processuais</p>
            </div>
            <div>
              <p className="font-medium">⚪ Advogado</p>
              <p className="text-sm text-muted-foreground">Pode gerenciar processos e casos jurídicos</p>
            </div>
            <div>
              <p className="font-medium">⚪ Comercial</p>
              <p className="text-sm text-muted-foreground">Acesso ao CRM e gerenciamento de clientes</p>
            </div>
            <div>
              <p className="font-medium">⚪ Financeiro</p>
              <p className="text-sm text-muted-foreground">Gestão financeira e pagamentos</p>
            </div>
            <div>
              <p className="font-medium">⚪ Agenda</p>
              <p className="text-sm text-muted-foreground">Acesso exclusivo à seção de Reuniões para gerenciamento de agenda</p>
            </div>
            <div>
              <p className="font-medium">⚪ Estagiário(a)</p>
              <p className="text-sm text-muted-foreground">Mesmas permissões do Advogado, ideal para estagiários do escritório</p>
            </div>
          </CardContent>
        </Card>

        <RoleManagement />
      </div>
    </DashboardLayout>
  );
}
