import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, LayoutGrid, X, Settings, Lock, Unlock, Columns } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PlanejadorTopBarProps {
  onCreateTask: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose: () => void;
  locked: boolean;
  onToggleLock: () => void;
  onOpenSettings: () => void;
}

const TABS = [
  { id: 'prazo', label: 'Prazo' },
  { id: 'lista', label: 'Lista' },
  { id: 'calendario', label: 'Calendário' },
];

export function PlanejadorTopBar({
  onCreateTask, searchQuery, onSearchChange, activeTab, onTabChange,
  onClose, locked, onToggleLock, onOpenSettings
}: PlanejadorTopBarProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const text = isDark ? 'text-white' : 'text-foreground';
  const textMuted = isDark ? 'text-white/60' : 'text-foreground/60';
  const textDimmer = isDark ? 'text-white/50' : 'text-foreground/50';
  const textCounter = isDark ? 'text-white/40' : 'text-foreground/40';
  const glassBg = isDark ? 'bg-white/10' : 'bg-black/5';
  const glassBgHover = isDark ? 'hover:bg-white/15' : 'hover:bg-black/10';
  const borderColor = isDark ? 'border-white/10' : 'border-black/10';

  return (
    <div className="flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 pl-6">
          <div className="flex items-center gap-2">
            <LayoutGrid className={`h-6 w-6 ${text}`} />
            <h1 className={`text-xl font-bold tracking-tight ${text}`}>Planejador</h1>
          </div>
          <Button
            onClick={onCreateTask}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 h-9 rounded-lg shadow-lg shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Criar
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center justify-center w-9 h-9 rounded-lg ${glassBg} ${glassBgHover} transition-colors`}
                title="Configurações"
              >
                <Settings className={`h-4 w-4 ${textMuted}`} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onOpenSettings} className="gap-2 cursor-pointer">
                <Columns className="h-4 w-4" />
                Configurar Colunas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Lock */}
          <button
            onClick={onToggleLock}
            className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
              locked ? 'bg-amber-500/20 hover:bg-amber-500/30' : `${glassBg} ${glassBgHover}`
            }`}
            title={locked ? "Desbloquear movimentação" : "Travar movimentação"}
          >
            {locked ? (
              <Lock className="h-4 w-4 text-amber-400" />
            ) : (
              <Unlock className={`h-4 w-4 ${textMuted}`} />
            )}
          </button>

          {/* Search */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${textCounter}`} />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Pesquisar tarefa..."
              className={`pl-9 h-9 w-64 ${glassBg} ${borderColor} ${text} placeholder:${textCounter} focus:${isDark ? 'bg-white/15' : 'bg-black/[0.07]'} focus:${isDark ? 'border-white/20' : 'border-black/15'}`}
            />
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className={`flex items-center justify-center w-9 h-9 rounded-lg ${glassBg} ${glassBgHover} transition-colors`}
            title="Fechar"
          >
            <X className={`h-4 w-4 ${textMuted}`} />
          </button>
        </div>
      </div>

      {/* Tabs row */}
      <div className={`flex items-center gap-1 border-b ${borderColor} pb-0 pl-6`}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? text
                : `${textDimmer} ${isDark ? 'hover:text-white/70' : 'hover:text-foreground/70'}`
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDark ? 'bg-white' : 'bg-foreground'} rounded-full`} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
