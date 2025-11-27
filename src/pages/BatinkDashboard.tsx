import { Clock, Users, Calendar, BarChart3, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBatinkAuth } from '@/contexts/BatinkAuthContext';

const BatinkDashboard = () => {
  const { profile, isAdmin, signOut } = useBatinkAuth();

  return (
    <div className="min-h-screen bg-[#1a1625] text-white">
      {/* Header */}
      <header className="bg-[#2d2640] border-b border-white/10 px-4 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#9333EA] to-[#7C3AED] flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">BATINK</h1>
              <p className="text-xs text-white/50">Ponto Digital</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{profile?.full_name || 'Usuário'}</p>
              <p className="text-xs text-white/50">{profile?.empresa || 'Empresa'}</p>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white/60 hover:text-white hover:bg-white/10"
              onClick={signOut}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Olá, <span className="text-[#9333EA]">{profile?.full_name?.split(' ')[0] || 'Usuário'}</span>!
          </h2>
          <p className="text-white/60">Bem-vindo ao sistema de ponto digital BATINK.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-[#2d2640] border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Pontos Hoje</CardTitle>
              <Clock className="h-4 w-4 text-[#9333EA]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">0</div>
              <p className="text-xs text-white/50">registros</p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2d2640] border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Horas Trabalhadas</CardTitle>
              <BarChart3 className="h-4 w-4 text-[#facc15]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">0h 00m</div>
              <p className="text-xs text-white/50">este mês</p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2d2640] border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Funcionários</CardTitle>
              <Users className="h-4 w-4 text-[#22c55e]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">0</div>
              <p className="text-xs text-white/50">ativos</p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2d2640] border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Dias no Mês</CardTitle>
              <Calendar className="h-4 w-4 text-[#3b82f6]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{new Date().getDate()}</div>
              <p className="text-xs text-white/50">de {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Action Card */}
        <Card className="bg-gradient-to-br from-[#9333EA]/20 to-[#2d2640] border-[#9333EA]/30 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Registrar Ponto
            </CardTitle>
            <CardDescription className="text-white/60">
              Clique no botão abaixo para registrar seu ponto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              size="lg"
              className="w-full sm:w-auto bg-[#9333EA] hover:bg-[#7C3AED] text-white"
            >
              <Clock className="w-5 h-5 mr-2" />
              Bater Ponto
            </Button>
          </CardContent>
        </Card>

        {/* Admin Section */}
        {isAdmin && (
          <Card className="bg-[#2d2640] border-[#facc15]/30">
            <CardHeader>
              <CardTitle className="text-[#facc15] flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Área do Administrador
              </CardTitle>
              <CardDescription className="text-white/60">
                Gerencie funcionários, relatórios e configurações
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button variant="outline" className="border-[#facc15]/50 text-[#facc15] hover:bg-[#facc15]/10">
                <Users className="w-4 h-4 mr-2" />
                Funcionários
              </Button>
              <Button variant="outline" className="border-[#facc15]/50 text-[#facc15] hover:bg-[#facc15]/10">
                <BarChart3 className="w-4 h-4 mr-2" />
                Relatórios
              </Button>
              <Button variant="outline" className="border-[#facc15]/50 text-[#facc15] hover:bg-[#facc15]/10">
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Placeholder Content */}
        <div className="mt-8 p-8 rounded-2xl border border-dashed border-white/20 text-center">
          <Clock className="w-12 h-12 mx-auto text-white/30 mb-4" />
          <h3 className="text-lg font-medium text-white/50 mb-2">Sistema em Desenvolvimento</h3>
          <p className="text-sm text-white/30 max-w-md mx-auto">
            Em breve você poderá registrar pontos, visualizar relatórios, gerenciar funcionários e muito mais.
          </p>
        </div>
      </main>
    </div>
  );
};

export default BatinkDashboard;
