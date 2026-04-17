import { useState, useCallback, useMemo, useEffect } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { PlanejadorTopBar } from "./PlanejadorTopBar";
import { PlanejadorKanban } from "./PlanejadorKanban";
import { PlanejadorListView } from "./PlanejadorListView";
import { PlanejadorCreateTask } from "./PlanejadorCreateTask";
import { PlanejadorTaskDetail } from "./PlanejadorTaskDetail";
import { PlanejadorSettings, ColumnConfig } from "./PlanejadorSettings";
import { PlanejadorPrazosView } from "./PlanejadorPrazosView";
import { DeadlineDetailDialog } from "@/components/Agenda/DeadlineDetailDialog";
import { usePlanejadorTasks, PlanejadorTask, KANBAN_COLUMNS, KanbanColumn } from "@/hooks/usePlanejadorTasks";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanejadorLabels, useAllLabelAssignments } from "@/hooks/usePlanejadorLabels";
import { useTenantId } from "@/hooks/useTenantId";
import { useTheme } from "@/contexts/ThemeContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

export function PlanejadorDrawer({ open, onOpenChange, initialTaskId, onInitialTaskConsumed }: PlanejadorDrawerProps) {
  const { user } = useAuth();
  const currentUserId = user?.id || null;
  const { tenantId } = useTenantId();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PlanejadorTask | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("prazo");
  const [isExpanded, setIsExpanded] = useState(false);
  const [locked, setLocked] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(currentUserId);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [deadlineDetailId, setDeadlineDetailId] = useState<string | null>(null);
  const [deadlineDetailOpen, setDeadlineDetailOpen] = useState(false);
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

  // Open task from notification deep-link
  useEffect(() => {
    if (open && initialTaskId && !isLoading) {
      // Find the task across all columns
      const allTasks = Object.values(tasksByColumn).flat();
      const task = allTasks.find(t => t.id === initialTaskId);
      if (task) {
        setSelectedTask(task);
        // Clear filter to "all" so task is visible
        setSelectedUserId(null);
      }
      onInitialTaskConsumed?.();
    }
  }, [open, initialTaskId, isLoading, tasksByColumn, onInitialTaskConsumed]);

  // Re-hidratar config quando tenantId resolve (no primeiro render é null)
  useEffect(() => {
    if (tenantId) {
      setColumnConfig(loadColumnConfig(tenantId));
    }
  }, [tenantId]);

  const handleColumnConfigChange = useCallback((newConfig: ColumnConfig[]) => {
    setColumnConfig(newConfig);
    if (!tenantId) return; // evita perder config antes do tenantId carregar
    saveColumnConfig(tenantId, newConfig);
  }, [tenantId]);

  const handleCreateTask = useCallback((data: { titulo: string; descricao?: string; prazo?: string; prioridade?: string }) => {
    createTask.mutate(data);
  }, [createTask]);

  const handleMoveTask = useCallback((taskId: string, updates: Partial<PlanejadorTask>) => {
    // Find if this is a subtask
    const allTasks = Object.values(tasksByColumn).flat();
    const movedTask = allTasks.find(t => t.id === taskId);
    if (movedTask?.is_subtask) {
      // Update the subtask record directly
      (supabase as any)
        .from('planejador_task_subtasks')
        .update({
          concluida: updates.status === 'completed',
          prazo: updates.prazo !== undefined ? updates.prazo : movedTask.prazo,
        })
        .eq('id', taskId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['planejador-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['planejador-subtasks'] });
          queryClient.invalidateQueries({ queryKey: ['planejador-subtask-count'] });
        });
      return;
    }
    updateTask.mutate({ id: taskId, ...updates });
  }, [updateTask, tasksByColumn]);

  const handleReorderTask = useCallback(async (taskId: string, newOrdem: number) => {
    const { error } = await (supabase as any).rpc('reorder_planejador_task', {
      p_task_id: taskId,
      p_new_ordem: newOrdem,
    });
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['planejador-tasks'] });
    } else {
      console.error('[reorder_planejador_task]', error);
    }
  }, [queryClient]);

  const handleUpdateTask = useCallback((id: string, updates: Partial<PlanejadorTask>) => {
    // Check if this is a subtask
    const allTasks = Object.values(tasksByColumn).flat();
    const currentTask = allTasks.find(t => t.id === id);
    if (currentTask?.is_subtask) {
      // Update subtask record
      const subtaskUpdates: any = {};
      if (updates.titulo !== undefined) subtaskUpdates.titulo = updates.titulo;
      if (updates.status !== undefined) subtaskUpdates.concluida = updates.status === 'completed';
      if (updates.prazo !== undefined) subtaskUpdates.prazo = updates.prazo;
      (supabase as any)
        .from('planejador_task_subtasks')
        .update(subtaskUpdates)
        .eq('id', id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['planejador-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['planejador-subtasks'] });
        });
      setSelectedTask(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
      return;
    }
    updateTask.mutate({ id, ...updates });
    setSelectedTask(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
  }, [updateTask, tasksByColumn]);

  const handleDeleteTask = useCallback((id: string) => {
    deleteTask.mutate(id);
    setSelectedTask(null);
  }, [deleteTask]);

  return (
    <>
      <Sheet open={open} modal={false} onOpenChange={(newOpen) => {
          if (!newOpen && selectedTask) {
            setSelectedTask(null);
            return;
          }
          onOpenChange(newOpen);
        }}>
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

            {/* Task detail rendered inside Sheet context for proper focus/interaction */}
            {selectedTask && (
              <PlanejadorTaskDetail
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
              />
            )}

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
                ) : activeTab === 'lista' ? (
                  <PlanejadorListView
                    tasksByColumn={tasksByColumn}
                    onTaskClick={setSelectedTask}
                    onMoveTask={handleMoveTask}
                    searchQuery={searchQuery}
                    columnConfig={columnConfig}
                    selectedUserId={selectedUserId}
                    selectedLabelIds={selectedLabelIds}
                    labels={labels}
                    allLabelAssignments={allLabelAssignments}
                    participantTaskIds={participantData}
                  />
                ) : activeTab === 'prazos' ? (
                  <PlanejadorPrazosView
                    onDeadlineClick={(id) => {
                      setDeadlineDetailId(id);
                      setDeadlineDetailOpen(true);
                    }}
                    searchQuery={searchQuery}
                    selectedUserId={selectedUserId}
                    currentUserId={currentUserId}
                  />
                ) : (
                  <PlanejadorKanban
                    tasksByColumn={tasksByColumn}
                    onTaskClick={setSelectedTask}
                    onMoveTask={handleMoveTask}
                    onReorderTask={handleReorderTask}
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

      <DeadlineDetailDialog
        deadlineId={deadlineDetailId}
        open={deadlineDetailOpen}
        onOpenChange={(open) => {
          setDeadlineDetailOpen(open);
          if (!open) setDeadlineDetailId(null);
        }}
      />
    </>
  );
}
