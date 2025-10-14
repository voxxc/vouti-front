import { useDentalAuth } from '@/contexts/DentalAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const DentalDashboard = () => {
  const { profile, signOut, isAdmin } = useDentalAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/dental-auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">🦷 Sistema Dental</h1>
            <p className="text-muted-foreground">Bem-vindo, {profile?.full_name || profile?.email}</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Sair
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>👥 Pacientes</CardTitle>
              <CardDescription>Gerenciar cadastro de pacientes</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Acessar</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📅 Agenda</CardTitle>
              <CardDescription>Consultas e agendamentos</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Acessar</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📋 Prontuários</CardTitle>
              <CardDescription>Histórico de atendimentos</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Acessar</Button>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="border-amber-500">
              <CardHeader>
                <CardTitle>⚙️ Administração</CardTitle>
                <CardDescription>Gerenciar usuários e configurações</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="default">
                  Acessar
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Informações do Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="font-semibold">Nome:</dt>
                <dd>{profile?.full_name || 'Não informado'}</dd>
              </div>
              <div>
                <dt className="font-semibold">Email:</dt>
                <dd>{profile?.email}</dd>
              </div>
              <div>
                <dt className="font-semibold">Especialidade:</dt>
                <dd>{profile?.especialidade || 'Não informado'}</dd>
              </div>
              <div>
                <dt className="font-semibold">CRM:</dt>
                <dd>{profile?.crm || 'Não informado'}</dd>
              </div>
              <div>
                <dt className="font-semibold">Tipo de Conta:</dt>
                <dd>{isAdmin ? '🔑 Administrador' : '👤 Dentista'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DentalDashboard;
