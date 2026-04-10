import { useVotechAuth } from '@/contexts/VotechAuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, TrendingUp, TrendingDown, Receipt,
  CreditCard, BarChart3, Settings, User, LogOut
} from 'lucide-react';

export type VotechView = 'dashboard' | 'receitas' | 'despesas' | 'contas-pagar' | 'contas-receber' | 'relatorios';

interface Props {
  activeView: VotechView;
  onViewChange: (view: VotechView) => void;
}

const menuItems: { icon: any; label: string; view: VotechView }[] = [
  { icon: LayoutDashboard, label: 'Dashboard', view: 'dashboard' },
  { icon: TrendingUp, label: 'Receitas', view: 'receitas' },
  { icon: TrendingDown, label: 'Despesas', view: 'despesas' },
  { icon: Receipt, label: 'Contas a Pagar', view: 'contas-pagar' },
  { icon: CreditCard, label: 'Contas a Receber', view: 'contas-receber' },
  { icon: BarChart3, label: 'Relatórios', view: 'relatorios' },
];

export function VotechSidebar({ activeView, onViewChange }: Props) {
  const { profile, signOut, isAdmin } = useVotechAuth();

  return (
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
            key={item.view}
            onClick={() => onViewChange(item.view)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activeView === item.view
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
  );
}
