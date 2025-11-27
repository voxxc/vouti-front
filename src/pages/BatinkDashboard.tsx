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

  const displayName = profile?.apelido || profile?.nome_completo?.split(' ')[0] || 'Colaborador';

  return (
    <div className="min-h-screen bg-[#1a1625]">
      {/* Header */}
      <header className="bg-[#2d2640]/80 backdrop-blur-md border-b border-white/10 px-4 py-4 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#9333EA] to-[#7C3AED] flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">BATINK</h1>
              <p className="text-xs text-white/60">
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
                className="hidden sm:flex border-white/20 text-white hover:bg-white/10"
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-white/60 hover:text-white hover:bg-white/10"
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
          <h2 className="text-2xl font-bold text-white">
            Olá, <span className="text-[#9333EA]">{displayName}</span>!
          </h2>
          <p className="text-white/60">
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
          <Card className="bg-[#2d2640]/80 backdrop-blur-md border-white/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#9333EA]" />
                Registrar Ponto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimeEntryPanel />
            </CardContent>
          </Card>

          {/* History Card */}
          <Card className="bg-[#2d2640]/80 backdrop-blur-md border-white/10 text-white">
            <CardHeader>
              <CardTitle>Histórico de Hoje</CardTitle>
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
              className="w-full bg-[#9333EA] hover:bg-[#7C3AED] text-white"
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
