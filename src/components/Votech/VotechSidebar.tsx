import { useVotechAuth } from '@/contexts/VotechAuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, TrendingUp, TrendingDown, Receipt,
  CreditCard, BarChart3, Settings, LogOut
} from 'lucide-react';

export type VotechView = 'dashboard' | 'receitas' | 'despesas' | 'contas-pagar' | 'contas-receber' | 'relatorios';

interface Props {
  activeView: VotechView;
  onViewChange: (view: VotechView) => void;
}

const menuItems: { icon: any; label: string; view: VotechView }[] = [
  { icon: LayoutDashboard, label: 'Resumo', view: 'dashboard' },
  { icon: TrendingUp, label: 'Receitas', view: 'receitas' },
  { icon: TrendingDown, label: 'Despesas', view: 'despesas' },
  { icon: Receipt, label: 'Contas a Pagar', view: 'contas-pagar' },
  { icon: CreditCard, label: 'Contas a Receber', view: 'contas-receber' },
  { icon: BarChart3, label: 'Relatórios', view: 'relatorios' },
];

export function VotechSidebar({ activeView, onViewChange }: Props) {
  const { profile, signOut, isAdmin } = useVotechAuth();
  const initial = (profile?.full_name || 'U').trim().charAt(0).toUpperCase();

  return (
    <aside className="w-64 bg-white border-r border-black/5 flex flex-col">
      <div className="p-6 border-b border-black/5">
        <h1 className="flex items-center gap-1.5">
          <span className="text-[20px] font-semibold tracking-tight text-black">Vo</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#30D158]" />
          <span className="text-[20px] font-semibold tracking-tight text-black">tech</span>
        </h1>
        <p className="text-[11px] text-black/40 mt-0.5">Controle Financeiro</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {menuItems.map((item) => {
          const active = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                active
                  ? 'bg-[#30D158]/12 text-[#30D158]'
                  : 'text-black/60 hover:bg-black/5 hover:text-black'
              }`}
            >
              <item.icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </button>
          );
        })}

        {isAdmin && (
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-black/60 hover:bg-black/5 hover:text-black transition-all">
            <Settings className="w-[18px] h-[18px]" />
            Administração
          </button>
        )}
      </nav>

      <div className="p-3 border-t border-black/5">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#30D158] to-[#0A84FF] text-white text-[13px] font-semibold flex items-center justify-center">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-black truncate">{profile?.full_name || 'Usuário'}</p>
            <p className="text-[11px] text-black/40 truncate">{profile?.empresa || 'VoTech'}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-black/60 hover:text-[#FF453A] hover:bg-[#FF453A]/8 rounded-xl text-[13px]"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
