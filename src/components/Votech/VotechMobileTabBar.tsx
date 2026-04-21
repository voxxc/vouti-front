import { LayoutDashboard, TrendingUp, TrendingDown, Receipt, MoreHorizontal } from 'lucide-react';
import type { VotechView } from './VotechSidebar';

interface Props {
  activeView: VotechView;
  onViewChange: (v: VotechView) => void;
  onMore?: () => void;
}

const items: { icon: any; label: string; view: VotechView }[] = [
  { icon: LayoutDashboard, label: 'Resumo', view: 'dashboard' },
  { icon: TrendingUp, label: 'Receitas', view: 'receitas' },
  { icon: TrendingDown, label: 'Despesas', view: 'despesas' },
  { icon: Receipt, label: 'Contas', view: 'contas-pagar' },
];

export function VotechMobileTabBar({ activeView, onViewChange, onMore }: Props) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-black/70 backdrop-blur-2xl border-t border-black/5 dark:border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="h-16 flex items-center justify-around px-2">
        {items.map((it) => {
          const active = activeView === it.view || (it.view === 'contas-pagar' && activeView === 'contas-receber');
          return (
            <button
              key={it.view}
              onClick={() => onViewChange(it.view)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
            >
              <it.icon className={`w-[22px] h-[22px] transition-colors ${active ? 'text-[#30D158]' : 'text-black/50 dark:text-white/50'}`} strokeWidth={active ? 2.4 : 2} />
              <span className={`text-[10px] font-medium ${active ? 'text-[#30D158]' : 'text-black/50 dark:text-white/50'}`}>{it.label}</span>
            </button>
          );
        })}
        <button
          onClick={onMore}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
        >
          <MoreHorizontal className="w-[22px] h-[22px] text-black/50 dark:text-white/50" />
          <span className="text-[10px] font-medium text-black/50 dark:text-white/50">Mais</span>
        </button>
      </div>
    </nav>
  );
}