import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, LayoutGrid, X, Settings, Lock, Unlock, Columns, Filter, User, ChevronDown, Clock, CheckSquare } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlanejadorLabel } from "@/hooks/usePlanejadorLabels";
import { useIsMobile } from "@/hooks/use-mobile";

interface TenantProfile {
  user_id: string;
  full_name: string;
}

interface PlanejadorTopBarProps {
  onCreateTask: () => void;
  onCreateDeadline?: () => void;
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
  showRevisionais?: boolean;
}

const BASE_TABS = [
  { id: 'hello', label: 'Hello' },
  { id: 'prazos', label: 'Prazos' },
  { id: 'prazo', label: 'Tarefas' },
  { id: 'lista', label: 'Lista' },
  { id: 'calendario', label: 'Calendário' },
];

export function PlanejadorTopBar({
  onCreateTask, onCreateDeadline, searchQuery, onSearchChange, activeTab, onTabChange,
  onClose, locked, onToggleLock, onOpenSettings,
  profiles = [], selectedUserId, onUserFilterChange,
  labels = [], selectedLabelIds, onLabelFilterChange,
  currentUserId, showRevisionais = false,
}: PlanejadorTopBarProps) {
  const TABS = showRevisionais
    ? [...BASE_TABS, { id: 'revisionais', label: 'Revisionais' }]
    : BASE_TABS;
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const isDark = theme === 'dark';

  const text = isDark ? 'text-white' : 'text-foreground';
  const textMuted = isDark ? 'text-white/60' : 'text-foreground/60';
  const textDimmer = isDark ? 'text-white/50' : 'text-foreground/50';
  const textCounter = isDark ? 'text-white/40' : 'text-foreground/40';
  const glassBg = isDark ? 'bg-white/10' : 'bg-black/5';
  const glassBgHover = isDark ? 'hover:bg-white/15' : 'hover:bg-black/10';
  const borderColor = isDark ? 'border-white/10' : 'border-black/10';

  const isMyTasks = selectedUserId === currentUserId;
  const isAllTasks = selectedUserId === null;
  const isCustomUser = !isMyTasks && !isAllTasks;
  const customUserName = isCustomUser
    ? profiles.find(p => p.user_id === selectedUserId)?.full_name || 'Usuário'
    : '';

  const renderCreateButton = (sizeClass: string) => {
    if (activeTab === 'hello') {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className={`bg-emerald-500 hover:bg-emerald-600 text-white font-semibold ${sizeClass} rounded-lg shadow-md shadow-emerald-500/20 shrink-0`}>
              <Plus className="h-4 w-4 mr-1" /> Criar
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onClick={onCreateTask} className="gap-2 cursor-pointer">
              <CheckSquare className="h-4 w-4" /> Tarefa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateDeadline?.()} className="gap-2 cursor-pointer">
              <Clock className="h-4 w-4" /> Prazo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    return (
      <Button
        onClick={() => {
          if (activeTab === 'prazos' && onCreateDeadline) onCreateDeadline();
          else onCreateTask();
        }}
        className={`bg-emerald-500 hover:bg-emerald-600 text-white font-semibold ${sizeClass} rounded-lg shadow-md shadow-emerald-500/20 shrink-0`}
      >
        <Plus className="h-4 w-4 mr-1" /> Criar
      </Button>
    );
  };

  if (isMobile) {
    return (
      <div className="flex flex-col gap-2">
        {/* Linha 1: título + ações */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <LayoutGrid className={`h-5 w-5 shrink-0 ${text}`} />
            <h1 className={`text-base font-bold tracking-tight truncate ${text}`}>Planejador</h1>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center justify-center w-8 h-8 rounded-lg ${glassBg} ${glassBgHover}`} title="Configurações">
                  <Settings className={`h-4 w-4 ${textMuted}`} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onOpenSettings} className="gap-2 cursor-pointer">
                  <Columns className="h-4 w-4" /> Configurar Colunas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={onToggleLock}
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                locked ? 'bg-amber-500/20' : `${glassBg} ${glassBgHover}`
              }`}
              title={locked ? "Desbloquear" : "Travar"}
            >
              {locked ? <Lock className="h-4 w-4 text-amber-400" /> : <Unlock className={`h-4 w-4 ${textMuted}`} />}
            </button>
            <button onClick={onClose} className={`flex items-center justify-center w-8 h-8 rounded-lg ${glassBg} ${glassBgHover}`} title="Fechar">
              <X className={`h-4 w-4 ${textMuted}`} />
            </button>
          </div>
        </div>

        {/* Linha 2: criar + busca */}
        <div className="flex items-center gap-2">
          {renderCreateButton('h-9 px-3')}
          <div className="relative flex-1 min-w-0">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 ${textCounter}`} />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Pesquisar..."
              className={`pl-8 pr-8 h-9 w-full ${glassBg} ${borderColor} ${text} placeholder:${textCounter}`}
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full ${glassBgHover} ${textCounter}`}
                title="Limpar pesquisa"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Linha 3: filtros */}
        <div className="flex items-center gap-1.5 overflow-x-auto planejador-scroll">
          <div className={`flex items-center rounded-lg overflow-hidden ${glassBg} ${borderColor} border shrink-0`}>
            <button
              onClick={() => onUserFilterChange(currentUserId)}
              className={`px-2.5 h-7 text-xs font-medium transition-colors ${
                isMyTasks ? (isDark ? 'bg-white/20 text-white' : 'bg-black/10 text-foreground') : `${textDimmer}`
              }`}
            >Minhas</button>
            <button
              onClick={() => onUserFilterChange(null)}
              className={`px-2.5 h-7 text-xs font-medium transition-colors ${
                isAllTasks ? (isDark ? 'bg-white/20 text-white' : 'bg-black/10 text-foreground') : `${textDimmer}`
              }`}
            >Todos</button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center gap-1 px-2 h-7 rounded-lg text-xs ${glassBg} ${glassBgHover} ${isCustomUser ? 'ring-1 ring-primary/50' : ''} ${text} shrink-0`}>
                <User className="h-3.5 w-3.5" />
                {isCustomUser && <span className="max-w-[80px] truncate">{customUserName}</span>}
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto">
              <DropdownMenuItem onClick={() => onUserFilterChange(currentUserId)}>Minhas tarefas</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUserFilterChange(null)}>Todos</DropdownMenuItem>
              {profiles.filter(p => p.user_id !== currentUserId).map(p => (
                <DropdownMenuItem key={p.user_id} onClick={() => onUserFilterChange(p.user_id)}>{p.full_name || 'Usuário'}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center gap-1 px-2.5 h-7 rounded-lg text-xs ${glassBg} ${glassBgHover} ${selectedLabelIds.length > 0 ? 'ring-1 ring-primary/50' : ''} ${text} shrink-0`}>
                <Filter className="h-3.5 w-3.5" />
                <span>{selectedLabelIds.length > 0 ? `${selectedLabelIds.length}` : 'Marcadores'}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto">
              {selectedLabelIds.length > 0 && (
                <DropdownMenuItem onClick={() => onLabelFilterChange([])} className="text-destructive">Limpar filtros</DropdownMenuItem>
              )}
              {labels.map(l => {
                const isActive = selectedLabelIds.includes(l.id);
                return (
                  <DropdownMenuItem key={l.id} onClick={() => {
                    if (isActive) onLabelFilterChange(selectedLabelIds.filter(id => id !== l.id));
                    else onLabelFilterChange([...selectedLabelIds, l.id]);
                  }} className="gap-2">
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

        {/* Tabs */}
        <div className={`flex items-center gap-0 border-b ${borderColor} overflow-x-auto planejador-scroll`}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors relative shrink-0 ${
                activeTab === tab.id ? text : `${textDimmer}`
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

  return (
    <div className="flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 pl-6">
          <div className="flex items-center gap-2">
            <LayoutGrid className={`h-6 w-6 ${text}`} />
            <h1 className={`text-xl font-bold tracking-tight ${text}`}>Planejador</h1>
          </div>
          {renderCreateButton('px-5 h-9')}

          {/* User filter toggle */}
          <div className="flex items-center">
            <div className={`flex items-center rounded-lg overflow-hidden ${glassBg} ${borderColor} border`}>
              <button
                onClick={() => onUserFilterChange(currentUserId)}
                className={`px-3 h-8 text-sm font-medium transition-colors ${
                  isMyTasks
                    ? (isDark ? 'bg-white/20 text-white' : 'bg-black/10 text-foreground')
                    : `${textDimmer} ${glassBgHover}`
                }`}
              >
                Minhas
              </button>
              <button
                onClick={() => onUserFilterChange(null)}
                className={`px-3 h-8 text-sm font-medium transition-colors ${
                  isAllTasks
                    ? (isDark ? 'bg-white/20 text-white' : 'bg-black/10 text-foreground')
                    : `${textDimmer} ${glassBgHover}`
                }`}
              >
                Todos
              </button>
            </div>

            {/* Specific user dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center gap-1 px-2 h-8 ml-1 rounded-lg text-sm ${glassBg} ${glassBgHover} transition-colors ${isCustomUser ? 'ring-1 ring-primary/50' : ''} ${text}`}>
                  <User className="h-3.5 w-3.5" />
                  {isCustomUser && <span className="max-w-[100px] truncate text-xs">{customUserName}</span>}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto">
                <DropdownMenuItem onClick={() => onUserFilterChange(currentUserId)} className="cursor-pointer">
                  <span className="font-medium">Minhas tarefas</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUserFilterChange(null)} className="cursor-pointer">
                  <span className="font-medium">Todos</span>
                </DropdownMenuItem>
                {profiles.filter(p => p.user_id !== currentUserId).map(p => (
                  <DropdownMenuItem key={p.user_id} onClick={() => onUserFilterChange(p.user_id)} className="cursor-pointer">
                    {p.full_name || 'Usuário'}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

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
              className={`pl-9 pr-8 h-9 w-64 ${glassBg} ${borderColor} ${text} placeholder:${textCounter}`}
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full ${glassBgHover} ${textCounter}`}
                title="Limpar pesquisa"
              >
                <X className="h-3 w-3" />
              </button>
            )}
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
