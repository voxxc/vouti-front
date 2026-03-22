import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, LayoutGrid, X, Settings, Lock, Unlock, Columns, Filter, User, ChevronDown } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlanejadorLabel } from "@/hooks/usePlanejadorLabels";

interface TenantProfile {
  user_id: string;
  full_name: string;
}

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
  // Filters
  profiles?: TenantProfile[];
  selectedUserId: string | null;
  onUserFilterChange: (userId: string | null) => void;
  labels?: PlanejadorLabel[];
  selectedLabelIds: string[];
  onLabelFilterChange: (labelIds: string[]) => void;
  currentUserId: string | null;
}

const TABS = [
  { id: 'prazo', label: 'Prazo' },
  { id: 'lista', label: 'Lista' },
  { id: 'calendario', label: 'Calendário' },
];

export function PlanejadorTopBar({
  onCreateTask, searchQuery, onSearchChange, activeTab, onTabChange,
  onClose, locked, onToggleLock, onOpenSettings,
  profiles = [], selectedUserId, onUserFilterChange,
  labels = [], selectedLabelIds, onLabelFilterChange,
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

  const selectedUserName = selectedUserId
    ? profiles.find(p => p.user_id === selectedUserId)?.full_name || 'Usuário'
    : 'Todos';

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

          {/* User filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm ${glassBg} ${glassBgHover} transition-colors ${selectedUserId ? 'ring-1 ring-primary/50' : ''} ${text}`}>
                <User className="h-3.5 w-3.5" />
                <span className="max-w-[120px] truncate">{selectedUserName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto">
              <DropdownMenuItem onClick={() => onUserFilterChange(null)} className="cursor-pointer">
                <span className="font-medium">Todos</span>
              </DropdownMenuItem>
              {profiles.map(p => (
                <DropdownMenuItem key={p.user_id} onClick={() => onUserFilterChange(p.user_id)} className="cursor-pointer">
                  {p.full_name || 'Usuário'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Label filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm ${glassBg} ${glassBgHover} transition-colors ${selectedLabelIds.length > 0 ? 'ring-1 ring-primary/50' : ''} ${text}`}>
                <Filter className="h-3.5 w-3.5" />
                <span>{selectedLabelIds.length > 0 ? `${selectedLabelIds.length} marcador${selectedLabelIds.length > 1 ? 'es' : ''}` : 'Marcadores'}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto">
              {selectedLabelIds.length > 0 && (
                <DropdownMenuItem onClick={() => onLabelFilterChange([])} className="cursor-pointer text-destructive">
                  Limpar filtros
                </DropdownMenuItem>
              )}
              {labels.map(l => {
                const isActive = selectedLabelIds.includes(l.id);
                return (
                  <DropdownMenuItem
                    key={l.id}
                    onClick={() => {
                      if (isActive) onLabelFilterChange(selectedLabelIds.filter(id => id !== l.id));
                      else onLabelFilterChange([...selectedLabelIds, l.id]);
                    }}
                    className="cursor-pointer gap-2"
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                    <span className="flex-1">{l.name}</span>
                    {isActive && <span className="text-primary font-bold">✓</span>}
                  </DropdownMenuItem>
                );
              })}
              {labels.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum marcador criado</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center justify-center w-9 h-9 rounded-lg ${glassBg} ${glassBgHover} transition-colors`} title="Configurações">
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
            {locked ? <Lock className="h-4 w-4 text-amber-400" /> : <Unlock className={`h-4 w-4 ${textMuted}`} />}
          </button>

          {/* Search */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${textCounter}`} />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Pesquisar tarefa..."
              className={`pl-9 h-9 w-64 ${glassBg} ${borderColor} ${text} placeholder:${textCounter}`}
            />
          </div>

          {/* Close */}
          <button onClick={onClose} className={`flex items-center justify-center w-9 h-9 rounded-lg ${glassBg} ${glassBgHover} transition-colors`} title="Fechar">
            <X className={`h-4 w-4 ${textMuted}`} />
          </button>
        </div>
      </div>

      {/* Tabs + active label chips */}
      <div className={`flex items-center gap-1 border-b ${borderColor} pb-0 pl-6`}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.id ? text : `${textDimmer} ${isDark ? 'hover:text-white/70' : 'hover:text-foreground/70'}`
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDark ? 'bg-white' : 'bg-foreground'} rounded-full`} />
            )}
          </button>
        ))}

        {/* Active label chips */}
        {selectedLabelIds.length > 0 && (
          <div className="flex items-center gap-1.5 ml-4">
            {labels.filter(l => selectedLabelIds.includes(l.id)).map(l => (
              <span
                key={l.id}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white cursor-pointer hover:opacity-80"
                style={{ backgroundColor: l.color }}
                onClick={() => onLabelFilterChange(selectedLabelIds.filter(id => id !== l.id))}
              >
                {l.name}
                <X className="h-3 w-3" />
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
