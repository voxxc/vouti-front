import { PlanejadorTask } from "@/hooks/usePlanejadorTasks";
import { PlanejadorLabel, PlanejadorLabelAssignment } from "@/hooks/usePlanejadorLabels";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, ListChecks, Flag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PlanejadorTaskCardProps {
  task: PlanejadorTask;
  onClick: () => void;
  labels?: PlanejadorLabel[];
  labelAssignments?: PlanejadorLabelAssignment[];
  needsAttention?: boolean;
}

export function PlanejadorTaskCard({ task, onClick, labels = [], labelAssignments = [], needsAttention = false }: PlanejadorTaskCardProps) {
  const taskLabelIds = labelAssignments.filter(a => a.task_id === task.id).map(a => a.label_id);
  const taskLabels = labels.filter(l => taskLabelIds.includes(l.id));

  // Fetch subtask counts (skip for subtask cards themselves)
  const { data: subtaskData } = useQuery({
    queryKey: ['planejador-subtask-count', task.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('planejador_task_subtasks')
        .select('id, concluida')
        .eq('task_id', task.id);
      if (error) throw error;
      const all = data || [];
      return { total: all.length, completed: all.filter((s: any) => s.concluida).length };
    },
    staleTime: 30000,
    enabled: !task.is_subtask,
  });

  return (
    <div
      onClick={onClick}
      className={`backdrop-blur-sm rounded-xl p-3.5 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group border ${
        needsAttention
          ? "bg-orange-50/90 dark:bg-orange-900/30 border-orange-400/70 dark:border-orange-500/60 ring-1 ring-orange-300/40 dark:ring-orange-500/30"
          : "bg-white/95 dark:bg-slate-800/90 border-black/[0.04] dark:border-white/5"
      }`}
    >
      <div className="flex items-start gap-1.5 mb-2">
        {task.is_subtask && (
          <Flag className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
        )}
        <h4 className="text-sm font-medium tracking-tight text-slate-900 dark:text-white leading-snug group-hover:text-slate-700 dark:group-hover:text-white/90 line-clamp-2">
          {task.titulo}
        </h4>
      </div>

      {task.is_subtask && task.parent_task_titulo && (
        <p className="text-[10px] text-muted-foreground mb-2 truncate">
          ↳ {task.parent_task_titulo}
        </p>
      )}

      {/* Label pills */}
      {taskLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {taskLabels.map(l => (
            <span key={l.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white tracking-tight" style={{ backgroundColor: l.color }}>
              {l.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.prazo && (
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-white/50">
              <Clock className="h-3 w-3" />
              <span>{format(new Date(task.prazo), "dd MMM, HH:mm", { locale: ptBR })}</span>
            </div>
          )}
          {subtaskData && subtaskData.total > 0 && (
            <div className={`flex items-center gap-1 text-xs ${
              subtaskData.completed === subtaskData.total 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-slate-500 dark:text-white/50'
            }`}>
              <ListChecks className="h-3 w-3" />
              <span>{subtaskData.completed}/{subtaskData.total}</span>
            </div>
          )}
        </div>
        <div className="flex -space-x-1.5 ml-auto">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ring-2 ring-white dark:ring-slate-800">
            <User className="h-3 w-3 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
