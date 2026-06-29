import { useState } from 'react';
import { LayoutDashboard, BookOpen, TrendingUp, Trophy, User, Shield, Users, Library, Layers } from 'lucide-react';
import type { SpnView } from './SpnSidebar';
import { useSpnAuth } from '@/contexts/SpnAuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

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

const adminItems: { key: SpnView; label: string; icon: typeof Users }[] = [
  { key: 'admin-users', label: 'Manage Users', icon: Users },
  { key: 'admin-books', label: 'Manage Books', icon: Library },
  { key: 'admin-levels', label: 'Manage Levels', icon: Layers },
];

const SpnMobileNav = ({ activeView, onViewChange }: SpnMobileNavProps) => {
  const { isAdmin } = useSpnAuth();
  const [adminOpen, setAdminOpen] = useState(false);

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
        {isAdmin && (
          <Sheet open={adminOpen} onOpenChange={setAdminOpen}>
            <SheetTrigger asChild>
              <button
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-[56px] transition-colors
                  ${adminItems.some(i => i.key === activeView) ? 'text-emerald-600' : 'text-muted-foreground'}`}
              >
                <Shield className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight">Admin</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Admin</SheetTitle>
              </SheetHeader>
              <div className="mt-4 grid gap-2 pb-6">
                {adminItems.map(item => (
                  <button
                    key={item.key}
                    onClick={() => { onViewChange(item.key); setAdminOpen(false); }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
                  >
                    <item.icon className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
};

export default SpnMobileNav;
