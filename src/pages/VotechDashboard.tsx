import { useVotechAuth } from '@/contexts/VotechAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign, TrendingUp, TrendingDown, PiggyBank,
  LogOut, LayoutDashboard, Receipt, CreditCard, BarChart3,
  Settings, User
} from 'lucide-react';

const VotechDashboard = () => {
  const { profile, signOut, isAdmin } = useVotechAuth();

  const summaryCards = [
    { title: 'Receitas', value: 'R$ 0,00', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Despesas', value: 'R$ 0,00', icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { title: 'Saldo', value: 'R$ 0,00', icon: DollarSign, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Investimentos', value: 'R$ 0,00', icon: PiggyBank, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: TrendingUp, label: 'Receitas' },
    { icon: TrendingDown, label: 'Despesas' },
    { icon: Receipt, label: 'Contas a Pagar' },
    { icon: CreditCard, label: 'Contas a Receber' },
    { icon: BarChart3, label: 'Relatórios' },
    { icon: PiggyBank, label: 'Investimentos' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-5 border-b border-slate-800">
          <h1 className="text-xl font-black text-white tracking-tight">
            Vo<span className="text-indigo-400">Tech</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Controle Financeiro</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                item.active
                  ? 'bg-indigo-600/20 text-indigo-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}

          {isAdmin && (
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors">
              <Settings className="w-4 h-4" />
              Administração
            </button>
          )}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{profile?.full_name || 'Usuário'}</p>
              <p className="text-xs text-slate-500 truncate">{profile?.empresa || 'VoTech'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">
              Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'} 👋
            </h2>
            <p className="text-slate-400 mt-1">Aqui está o resumo financeiro da sua empresa.</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {summaryCards.map((card) => (
              <Card key={card.title} className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">{card.title}</CardTitle>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-white">{card.value}</p>
                  <p className="text-xs text-slate-500 mt-1">Nenhum registro ainda</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Placeholder sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Últimas Transações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Receipt className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">Nenhuma transação registrada</p>
                  <p className="text-xs mt-1">Comece adicionando receitas ou despesas</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Fluxo de Caixa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">Gráfico disponível em breve</p>
                  <p className="text-xs mt-1">Adicione transações para visualizar</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VotechDashboard;
