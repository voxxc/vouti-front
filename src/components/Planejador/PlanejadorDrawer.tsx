import { useState, useCallback, useMemo } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { PlanejadorTopBar } from "./PlanejadorTopBar";
import { PlanejadorKanban } from "./PlanejadorKanban";
import { PlanejadorCreateTask } from "./PlanejadorCreateTask";
import { PlanejadorTaskDetail } from "./PlanejadorTaskDetail";
import { PlanejadorSettings, ColumnConfig } from "./PlanejadorSettings";
import { usePlanejadorTasks, PlanejadorTask, KANBAN_COLUMNS, KanbanColumn } from "@/hooks/usePlanejadorTasks";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanejadorLabels, useAllLabelAssignments } from "@/hooks/usePlanejadorLabels";
import { useTenantId } from "@/hooks/useTenantId";
import { useTheme } from "@/contexts/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import spaceBg from "@/assets/space-bg.jpg";
import skyLightBg from "@/assets/sky-light-bg.jpg";

interface PlanejadorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTaskId?: string | null;
  onInitialTaskConsumed?: () => void;
}

const STORAGE_KEY_PREFIX = "planejador-column-config-";

function getDefaultColumnConfig(): ColumnConfig[] {
  return KANBAN_COLUMNS.map((col, i) => ({
    id: col.id,
    label: col.label,
    color: col.color,
    visible: true,
    order: i,
  }));
}

function loadColumnConfig(tenantId: string | null): ColumnConfig[] {
  if (!tenantId) return getDefaultColumnConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + tenantId);
    if (raw) return JSON.parse(raw);
  } catch {}
  return getDefaultColumnConfig();
}

function saveColumnConfig(tenantId: string | null, config: ColumnConfig[]) {
  if (!tenantId) return;
  localStorage.setItem(STORAGE_KEY_PREFIX + tenantId, JSON.stringify(config));
}

export function PlanejadorDrawer({ open, onOpenChange }: PlanejadorDrawerProps) {
  const { user } = useAuth();
  const currentUserId = user?.id || null;
  const { tenantId } = useTenantId();
  const { theme } = useTheme();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PlanejadorTask | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("prazo");
  const [isExpanded, setIsExpanded] = useState(false);
  const [locked, setLocked] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(currentUserId);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => loadColumnConfig(tenantId));

  const { tasksByColumn, isLoading, createTask, updateTask, deleteTask } = usePlanejadorTasks();
  const { labels } = usePlanejadorLabels();
  const { data: allLabelAssignments = [] } = useAllLabelAssignments();

  // Fetch profiles for filters
  const { data: profiles = [] } = useQuery({
    queryKey: ['tenant-profiles', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch participant task IDs for user filtering
  const { data: participantData = [] } = useQuery({
    queryKey: ['planejador-all-participants', tenantId, selectedUserId],
    queryFn: async () => {
      if (!tenantId || !selectedUserId) return [];
      const { data, error } = await (supabase as any)
        .from('planejador_task_participants')
        .select('task_id')
        .eq('tenant_id', tenantId)
        .eq('user_id', selectedUserId);
      if (error) throw error;
      return (data || []).map((d: any) => d.task_id as string);
    },
    enabled: !!tenantId && !!selectedUserId,
  });

  const handleColumnConfigChange = useCallback((newConfig: ColumnConfig[]) => {
    setColumnConfig(newConfig);
    saveColumnConfig(tenantId, newConfig);
  }, [tenantId]);

  const handleCreateTask = useCallback((data: { titulo: string; descricao?: string; prazo?: string; prioridade?: string }) => {
    createTask.mutate(data);
  }, [createTask]);

  const handleMoveTask = useCallback((taskId: string, updates: Partial<PlanejadorTask>) => {
    updateTask.mutate({ id: taskId, ...updates });
  }, [updateTask]);

  const handleUpdateTask = useCallback((id: string, updates: Partial<PlanejadorTask>) => {
    updateTask.mutate({ id, ...updates });
    setSelectedTask(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
  }, [updateTask]);

  const handleDeleteTask = useCallback((id: string) => {
    deleteTask.mutate(id);
    setSelectedTask(null);
  }, [deleteTask]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="inset" 
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          className={`p-0 border-0 overflow-hidden [&>button]:hidden transition-all duration-300 ${
            isExpanded ? '!fixed !inset-0 !top-0 !left-0 !bottom-0 !right-0 z-[60]' : ''
          }`}
        >
          <SheetTitle className="sr-only">Planejador</SheetTitle>
          <div 
            className="h-full flex flex-col relative"
            style={{
              backgroundImage: `url(${theme === 'dark' ? spaceBg : skyLightBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className={`absolute inset-0 backdrop-blur-[2px] ${theme === 'dark' ? 'bg-black/40' : 'bg-white/30'}`} />

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`absolute top-3 left-3 z-20 flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'
              }`}
              title={isExpanded ? "Mostrar sidebar" : "Tela cheia"}
            >
              {isExpanded ? (
                <ChevronRight className={`h-4 w-4 ${theme === 'dark' ? 'text-white/70' : 'text-foreground/70'}`} strokeWidth={1.5} />
              ) : (
                <ChevronLeft className={`h-4 w-4 ${theme === 'dark' ? 'text-white/70' : 'text-foreground/70'}`} strokeWidth={1.5} />
              )}
            </button>

            <div className="relative z-10 flex flex-col h-full">
              <div className="px-6 pt-5 pb-2">
                <PlanejadorTopBar
                  onCreateTask={() => setCreateOpen(true)}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onClose={() => onOpenChange(false)}
                  locked={locked}
                  onToggleLock={() => setLocked(!locked)}
                  onOpenSettings={() => setSettingsOpen(true)}
                  profiles={profiles}
                  selectedUserId={selectedUserId}
                  onUserFilterChange={setSelectedUserId}
                  labels={labels}
                  selectedLabelIds={selectedLabelIds}
                  onLabelFilterChange={setSelectedLabelIds}
                  currentUserId={currentUserId}
                />
              </div>

              <div className="flex-1 px-6 pb-4 min-h-0 overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className={`h-8 w-8 animate-spin ${theme === 'dark' ? 'text-white/50' : 'text-foreground/50'}`} />
                  </div>
                ) : (
                  <PlanejadorKanban
                    tasksByColumn={tasksByColumn}
                    onTaskClick={setSelectedTask}
                    onMoveTask={handleMoveTask}
                    searchQuery={searchQuery}
                    locked={locked}
                    columnConfig={columnConfig}
                    selectedUserId={selectedUserId}
                    selectedLabelIds={selectedLabelIds}
                    labels={labels}
                    allLabelAssignments={allLabelAssignments}
                    participantTaskIds={participantData}
                  />
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <PlanejadorSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        columnConfig={columnConfig}
        onColumnConfigChange={handleColumnConfigChange}
      />

      <PlanejadorCreateTask
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateTask}
        isLoading={createTask.isPending}
      />

      {selectedTask && (
        <PlanejadorTaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </>
  );
}
