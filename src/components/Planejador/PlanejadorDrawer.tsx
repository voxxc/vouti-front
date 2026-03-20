import { useState, useCallback } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { PlanejadorTopBar } from "./PlanejadorTopBar";
import { PlanejadorKanban } from "./PlanejadorKanban";
import { PlanejadorCreateTask } from "./PlanejadorCreateTask";
import { PlanejadorTaskDetail } from "./PlanejadorTaskDetail";
import { usePlanejadorTasks, PlanejadorTask } from "@/hooks/usePlanejadorTasks";
import { Loader2 } from "lucide-react";
import spaceBg from "@/assets/space-bg.jpg";

interface PlanejadorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanejadorDrawer({ open, onOpenChange }: PlanejadorDrawerProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PlanejadorTask | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("prazo");

  const { tasksByColumn, isLoading, createTask, updateTask, deleteTask } = usePlanejadorTasks();

  const handleCreateTask = useCallback((data: { titulo: string; descricao?: string; prazo?: string; prioridade?: string }) => {
    createTask.mutate(data);
  }, [createTask]);

  const handleMoveTask = useCallback((taskId: string, updates: Partial<PlanejadorTask>) => {
    updateTask.mutate({ id: taskId, ...updates });
  }, [updateTask]);

  const handleUpdateTask = useCallback((id: string, updates: Partial<PlanejadorTask>) => {
    updateTask.mutate({ id, ...updates });
    // Update selected task locally for instant feedback
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
          side="right" 
          className="w-full sm:max-w-full p-0 border-0 overflow-hidden [&>button]:hidden"
          style={{ maxWidth: '100vw' }}
        >
          <div 
            className="h-full flex flex-col relative"
            style={{
              backgroundImage: `url(${spaceBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Overlay for readability */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full">
              {/* Top Bar */}
              <div className="px-6 pt-5 pb-2">
                <PlanejadorTopBar
                  onCreateTask={() => setCreateOpen(true)}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
              </div>

              {/* Kanban Board */}
              <div className="flex-1 px-6 pb-4 min-h-0 overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                  </div>
                ) : (
                  <PlanejadorKanban
                    tasksByColumn={tasksByColumn}
                    onTaskClick={setSelectedTask}
                    onMoveTask={handleMoveTask}
                    searchQuery={searchQuery}
                  />
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Task Dialog */}
      <PlanejadorCreateTask
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateTask}
        isLoading={createTask.isPending}
      />

      {/* Task Detail View */}
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
