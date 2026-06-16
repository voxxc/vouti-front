import { useMemo } from "react";
import { useAgendaData } from "@/hooks/useAgendaData";
import { usePlanejadorTasks, PlanejadorTask } from "@/hooks/usePlanejadorTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Deadline } from "@/types/agenda";
import { isToday, isBefore, isWithinInterval, startOfDay, endOfWeek, addWeeks, startOfWeek, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, AlertTriangle, CalendarDays, CalendarCheck, CheckCircle2, User, CheckSquare, Loader2 } from "lucide-react";
import { PlanejadorLabel, PlanejadorLabelAssignment } from "@/hooks/usePlanejadorLabels";

type HelloItem =
  | { kind: "task"; id: string; date: Date | null; task: PlanejadorTask }
  | { kind: "deadline"; id: string; date: Date | null; deadline: Deadline };

interface PlanejadorHelloViewProps {
  onTaskClick: (task: PlanejadorTask) => void;
  onDeadlineClick: (deadlineId: string) => void;
  searchQuery?: string;
  selectedUserId?: string | null;
  currentUserId?: string | null;
  selectedLabelIds?: string[];
  labels?: PlanejadorLabel[];
  allLabelAssignments?: PlanejadorLabelAssignment[];
  participantTaskIds?: string[];
}

export function PlanejadorHelloView({
  onTaskClick,
  onDeadlineClick,
  searchQuery = "",
  selectedUserId,
  currentUserId,
  selectedLabelIds = [],
  labels = [],
  allLabelAssignments = [],
  participantTaskIds,
}: PlanejadorHelloViewProps) {
  const { deadlines, isLoading: loadingDeadlines } = useAgendaData();
  const { tasksByColumn, isLoading: loadingTasks } = usePlanejadorTasks();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const columns = useMemo(() => {
    const effectiveUserId =
      selectedUserId === undefined ? (currentUserId ?? user?.id ?? null) : selectedUserId;
    const q = searchQuery.trim().toLowerCase();

    // ---- Tasks (flatten + filter)
    const allTasks = Object.values(tasksByColumn).flat();
    const filteredTasks = allTasks.filter((t) => {
      if (q && !t.titulo.toLowerCase().includes(q)) return false;
      if (effectiveUserId !== null) {
        const ok =
          t.proprietario_id === effectiveUserId ||
          t.responsavel_id === effectiveUserId ||
          (participantTaskIds && participantTaskIds.includes(t.id));
        if (!ok) return false;
      }
      if (selectedLabelIds.length > 0) {
        const taskIdsWithLabels = new Set(
          allLabelAssignments.filter((a) => selectedLabelIds.includes(a.label_id)).map((a) => a.task_id),
        );
        if (!taskIdsWithLabels.has(t.id)) return false;
      }
      return true;
    });

    // ---- Deadlines (filter)
    const filteredDeadlines = deadlines.filter((d) => {
      if (effectiveUserId !== null) {
        const ok =
          d.advogadoResponsavel?.userId === effectiveUserId ||
          d.taggedUsers?.some((t) => t.userId === effectiveUserId);
        if (!ok) return false;
      }
      if (q) {
        const hit =
          d.title?.toLowerCase().includes(q) ||
          d.projectName?.toLowerCase().includes(q) ||
          d.clientName?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      // marcadores aplicam só a tarefas; se houver filtro de marcador, oculta prazos
      if (selectedLabelIds.length > 0) return false;
      return true;
    });

    const items: HelloItem[] = [
      ...filteredTasks.map<HelloItem>((t) => ({
        kind: "task",
        id: t.id,
        date: t.prazo ? new Date(t.prazo) : null,
        task: t,
      })),
      ...filteredDeadlines.map<HelloItem>((d) => ({
        kind: "deadline",
        id: d.id,
        date: d.date,
        deadline: d,
      })),
    ];

    const now = new Date();
    const today = startOfDay(now);
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

    const buckets: Record<string, HelloItem[]> = {
      vencido: [],
      hoje: [],
      esta_semana: [],
      proxima_semana: [],
      futuro: [],
      concluido: [],
    };

    for (const it of items) {
      const isCompleted =
        (it.kind === "task" && it.task.status === "completed") ||
        (it.kind === "deadline" && it.deadline.completed);
      if (isCompleted) {
        buckets.concluido.push(it);
        continue;
      }
      if (!it.date) {
        buckets.futuro.push(it);
        continue;
      }
      const d = startOfDay(it.date);
      if (isToday(d)) buckets.hoje.push(it);
      else if (isBefore(d, today)) buckets.vencido.push(it);
      else if (isBefore(d, thisWeekEnd) || d.getTime() === thisWeekEnd.getTime()) buckets.esta_semana.push(it);
      else if (isWithinInterval(d, { start: nextWeekStart, end: nextWeekEnd })) buckets.proxima_semana.push(it);
      else buckets.futuro.push(it);
    }

    const byDate = (a: HelloItem, b: HelloItem) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.getTime() - b.date.getTime();
    };
    Object.values(buckets).forEach((arr) => arr.sort(byDate));

    return [
      { id: "vencido", label: "Vencido", color: "#ef4444", icon: <AlertTriangle className="h-3.5 w-3.5" />, items: buckets.vencido },
      { id: "hoje", label: "Hoje", color: "#f59e0b", icon: <Clock className="h-3.5 w-3.5" />, items: buckets.hoje },
      { id: "esta_semana", label: "Esta Semana", color: "#3b82f6", icon: <CalendarDays className="h-3.5 w-3.5" />, items: buckets.esta_semana },
      { id: "proxima_semana", label: "Próxima Semana", color: "#8b5cf6", icon: <CalendarDays className="h-3.5 w-3.5" />, items: buckets.proxima_semana },
      { id: "futuro", label: "Futuro", color: "#06b6d4", icon: <CalendarCheck className="h-3.5 w-3.5" />, items: buckets.futuro },
      { id: "concluido", label: "Concluído", color: "#22c55e", icon: <CheckCircle2 className="h-3.5 w-3.5" />, items: buckets.concluido },
    ];
  }, [tasksByColumn, deadlines, searchQuery, selectedUserId, currentUserId, user?.id, selectedLabelIds, allLabelAssignments, participantTaskIds]);

  const text = isDark ? "text-white" : "text-foreground";
  const textMuted = isDark ? "text-white/60" : "text-foreground/60";
  const glassBg = isDark ? "bg-white/[0.06]" : "bg-black/[0.04]";
  const cardBg = isDark ? "bg-white/[0.08] hover:bg-white/[0.12]" : "bg-white/70 hover:bg-white/90";
  const borderColor = isDark ? "border-white/10" : "border-black/10";

  if (loadingDeadlines || loadingTasks) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className={`h-8 w-8 animate-spin ${isDark ? "text-white/50" : "text-foreground/50"}`} />
      </div>
    );
  }

  return (
    <div className="flex gap-3 h-full overflow-x-auto pb-2 planejador-scroll">
      {columns.map((col) => (
        <div key={col.id} className={`flex flex-col min-w-[240px] flex-1 rounded-xl ${glassBg} border ${borderColor} transition-all duration-300`}>
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-inherit">
            <span className="flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0" style={{ backgroundColor: col.color + "30", color: col.color }}>
              {col.icon}
            </span>
            <span className={`text-sm font-semibold ${text} truncate`}>{col.label}</span>
            <span className={`text-xs ml-auto flex-shrink-0 ${textMuted}`}>{col.items.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 planejador-scroll">
            <div className="flex flex-col gap-2">
              {col.items.length === 0 && (
                <div className={`text-xs text-center py-6 ${textMuted}`}>Vazio</div>
              )}
              {col.items.map((it) => {
                if (it.kind === "task") {
                  const t = it.task;
                  return (
                    <button
                      key={`task-${t.id}`}
                      onClick={() => onTaskClick(t)}
                      className={`w-full text-left p-2.5 rounded-lg ${cardBg} border ${borderColor} transition-all duration-300 cursor-pointer`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-500">
                          <CheckSquare className="h-3 w-3" /> Tarefa
                        </span>
                      </div>
                      <p className={`text-sm font-medium ${text} line-clamp-2 break-words`}>{t.titulo}</p>
                      <div className="flex flex-col gap-1 mt-2">
                        {t.prazo && (
                          <span className={`text-xs ${textMuted}`}>
                            {format(new Date(t.prazo), "dd MMM", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                }
                const d = it.deadline;
                return (
                  <button
                    key={`deadline-${d.id}`}
                    onClick={() => onDeadlineClick(d.id)}
                    className={`w-full text-left p-2.5 rounded-lg ${cardBg} border ${borderColor} transition-all duration-300 cursor-pointer`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-500">
                        <Clock className="h-3 w-3" /> Prazo
                      </span>
                    </div>
                    <p className={`text-sm font-medium ${text} line-clamp-2 break-words`}>{d.title}</p>
                    {d.projectName && (
                      <p className={`text-xs mt-1 ${textMuted} truncate`}>{d.projectName}</p>
                    )}
                    <div className="flex flex-col gap-1 mt-2">
                      <span className={`text-xs ${textMuted}`}>
                        {format(d.date, "dd MMM", { locale: ptBR })}
                      </span>
                      {d.advogadoResponsavel && (
                        <span className={`flex items-center gap-1 text-xs ${textMuted} min-w-0`}>
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{d.advogadoResponsavel.name}</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}