import { PlanejadorTask } from "@/hooks/usePlanejadorTasks";
import { PlanejadorLabel, PlanejadorLabelAssignment } from "@/hooks/usePlanejadorLabels";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User } from "lucide-react";

interface PlanejadorTaskCardProps {
  task: PlanejadorTask;
  onClick: () => void;
  labels?: PlanejadorLabel[];
  labelAssignments?: PlanejadorLabelAssignment[];
}

export function PlanejadorTaskCard({ task, onClick, labels = [], labelAssignments = [] }: PlanejadorTaskCardProps) {
  const taskLabelIds = labelAssignments.filter(a => a.task_id === task.id).map(a => a.label_id);
  const taskLabels = labels.filter(l => taskLabelIds.includes(l.id));

  return (
    <div
      onClick={onClick}
      className="bg-white/95 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg p-3.5 cursor-pointer hover:shadow-lg hover:shadow-black/10 hover:scale-[1.01] transition-all duration-200 border border-white/20 dark:border-white/5 group"
    >
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-slate-700 dark:group-hover:text-white/90 line-clamp-2">
        {task.titulo}
      </h4>

      {/* Label pills */}
      {taskLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {taskLabels.map(l => (
            <span key={l.id} className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: l.color }}>
              {l.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        {task.prazo && (
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-white/50">
            <Clock className="h-3 w-3" />
            <span>{format(new Date(task.prazo), "dd MMM, HH:mm", { locale: ptBR })}</span>
          </div>
        )}
        <div className="flex -space-x-1.5 ml-auto">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ring-2 ring-white dark:ring-slate-800">
            <User className="h-3 w-3 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
