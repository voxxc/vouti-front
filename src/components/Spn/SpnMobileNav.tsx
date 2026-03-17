import { LayoutDashboard, BookOpen, TrendingUp, Trophy, User } from 'lucide-react';
import type { SpnView } from './SpnSidebar';

interface SpnMobileNavProps {
  activeView: SpnView;
  onViewChange: (view: SpnView) => void;
}

const items = [
  { key: 'dashboard' as SpnView, label: 'Home', icon: LayoutDashboard },
  { key: 'books' as SpnView, label: 'Books', icon: BookOpen },
  { key: 'progress' as SpnView, label: 'Progress', icon: TrendingUp },
  { key: 'leaderboard' as SpnView, label: 'Ranking', icon: Trophy },
  { key: 'settings' as SpnView, label: 'Profile', icon: User },
];

const SpnMobileNav = ({ activeView, onViewChange }: SpnMobileNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {items.map(item => {
          const active = activeView === item.key || (item.key === 'books' && (activeView === 'books' || activeView === 'book-unit'));
          return (
            <button
              key={item.key}
              onClick={() => onViewChange(item.key)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-[56px] transition-colors
                ${active ? 'text-emerald-600' : 'text-muted-foreground'}`}
            >
              <item.icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default SpnMobileNav;
