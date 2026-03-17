import { useSpnAuth } from '@/contexts/SpnAuthContext';
import {
  LayoutDashboard, TrendingUp, BookOpen, Trophy, Award,
  Settings, Users, GraduationCap, LogOut, Flame, ChevronDown, ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import LogoSpn from './LogoSpn';

export type SpnView =
  | 'dashboard' | 'progress' | 'modules' | 'leaderboard'
  | 'achievements' | 'settings' | 'admin-levels' | 'admin-users'
  | 'teacher-students' | 'section' | 'books' | 'book-unit' | 'admin-books';

interface SpnSidebarProps {
  activeView: SpnView;
  onViewChange: (view: SpnView, data?: any) => void;
}

interface ModuleTree {
  levels: Array<{
    id: string; name: string;
    modules: Array<{
      id: string; name: string;
      units: Array<{ id: string; name: string }>;
    }>;
  }>;
}

const SpnSidebar = ({ activeView, onViewChange }: SpnSidebarProps) => {
  const { profile, role, isAdmin, isTeacher, signOut } = useSpnAuth();
  const [modulesOpen, setModulesOpen] = useState(false);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [tree, setTree] = useState<ModuleTree>({ levels: [] });

  useEffect(() => {
    if (modulesOpen) loadTree();
  }, [modulesOpen]);

  const loadTree = async () => {
    const { data: levels } = await supabase
      .from('spn_levels').select('id, name, sort_order').order('sort_order');
    const { data: modules } = await supabase
      .from('spn_modules').select('id, name, level_id, sort_order').order('sort_order');
    const { data: units } = await supabase
      .from('spn_units').select('id, name, module_id, sort_order').order('sort_order');

    if (!levels) return;

    setTree({
      levels: (levels as any[]).map(l => ({
        ...l,
        modules: (modules as any[] || [])
          .filter(m => m.level_id === l.id)
          .map(m => ({
            ...m,
            units: (units as any[] || []).filter(u => u.module_id === m.id),
          })),
      })),
    });
  };

  const toggleLevel = (id: string) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const navItems = [
    { key: 'dashboard' as SpnView, label: 'Dashboard', icon: LayoutDashboard },
    { key: 'books' as SpnView, label: 'Books', icon: BookOpen },
    { key: 'progress' as SpnView, label: 'My Progress', icon: TrendingUp },
    { key: 'leaderboard' as SpnView, label: 'Leaderboard', icon: Trophy },
    { key: 'achievements' as SpnView, label: 'Achievements', icon: Award },
  ];

  const adminItems = [
    { key: 'admin-books' as SpnView, label: 'Manage Books', icon: BookOpen },
    { key: 'admin-levels' as SpnView, label: 'Manage Levels', icon: Flame },
    { key: 'admin-users' as SpnView, label: 'Manage Users', icon: Users },
  ];

  return (
    <div className="w-64 h-screen bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <LogoSpn size="sm" />
      </div>

      {/* User info */}
      <div className="p-4 border-b border-border">
        <p className="font-medium text-sm text-foreground truncate">{profile?.full_name || 'User'}</p>
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 capitalize">{role}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map(item => (
          <button key={item.key}
            onClick={() => onViewChange(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
              ${activeView === item.key
                ? 'bg-emerald-100 text-emerald-700 font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}

        {/* Modules dropdown */}
        <div>
          <button
            onClick={() => { setModulesOpen(!modulesOpen); onViewChange('modules'); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
              ${activeView === 'modules' || activeView === 'section'
                ? 'bg-emerald-100 text-emerald-700 font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
            <BookOpen className="h-4 w-4" />
            Modules
            {modulesOpen ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronRight className="h-3 w-3 ml-auto" />}
          </button>

          {modulesOpen && (
            <div className="ml-4 mt-1 space-y-0.5">
              {tree.levels.map(level => (
                <div key={level.id}>
                  <button onClick={() => toggleLevel(level.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded">
                    {expandedLevels.has(level.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="font-medium">{level.name}</span>
                  </button>
                  {expandedLevels.has(level.id) && level.modules.map(mod => (
                    <div key={mod.id} className="ml-4">
                      <button onClick={() => toggleModule(mod.id)}
                        className="w-full flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded">
                        {expandedModules.has(mod.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        {mod.name}
                      </button>
                      {expandedModules.has(mod.id) && mod.units.map(unit => (
                        <button key={unit.id}
                          onClick={() => onViewChange('section', { unitId: unit.id, unitName: unit.name })}
                          className="w-full ml-6 px-2 py-1 text-xs text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded text-left">
                          {unit.name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              {tree.levels.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1">No levels yet</p>
              )}
            </div>
          )}
        </div>

        {/* Admin items */}
        {isAdmin && (
          <div className="pt-4 border-t border-border mt-4">
            <p className="text-xs font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-wider">Admin</p>
            {adminItems.map(item => (
              <button key={item.key}
                onClick={() => onViewChange(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                  ${activeView === item.key
                    ? 'bg-emerald-100 text-emerald-700 font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Teacher items */}
        {isTeacher && (
          <div className="pt-4 border-t border-border mt-4">
            <p className="text-xs font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-wider">Teacher</p>
            <button
              onClick={() => onViewChange('teacher-students')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                ${activeView === 'teacher-students'
                  ? 'bg-emerald-100 text-emerald-700 font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <GraduationCap className="h-4 w-4" />
              Students
            </button>
          </div>
        )}

        {/* Settings */}
        <button
          onClick={() => onViewChange('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
            ${activeView === 'settings'
              ? 'bg-emerald-100 text-emerald-700 font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <button onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default SpnSidebar;
