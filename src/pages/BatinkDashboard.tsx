import { useNavigate } from 'react-router-dom';
import { Clock, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBatinkAuth } from '@/contexts/BatinkAuthContext';
import TimeEntryPanel from '@/components/Batink/TimeEntryPanel';
import TimeHistory from '@/components/Batink/TimeHistory';

const BatinkDashboard = () => {
  const navigate = useNavigate();
  const { profile, isAdmin, signOut } = useBatinkAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/batink/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Sistema de Ponto</h1>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? 'Administrador' : 'Colaborador'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/batink/admin')}
                className="hidden sm:flex"
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            Olá, <span className="text-primary">{profile?.full_name?.split(' ')[0] || 'Colaborador'}</span>!
          </h2>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Time Entry Card */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Clock className="w-5 h-5 text-primary" />
                Registrar Ponto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimeEntryPanel />
            </CardContent>
          </Card>

          {/* History Card */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Histórico de Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeHistory />
            </CardContent>
          </Card>
        </div>

        {/* Admin Mobile Button */}
        {isAdmin && (
          <div className="mt-6 sm:hidden">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/batink/admin')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Painel Administrativo
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default BatinkDashboard;
