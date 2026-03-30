import { useMemo } from "react";
import { useAgendaData } from "@/hooks/useAgendaData";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Deadline } from "@/types/agenda";
import { isToday, isPast, isFuture, startOfDay, endOfWeek, addWeeks, startOfWeek, isBefore, isAfter, isWithinInterval } from "date-fns";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, AlertTriangle, CalendarDays, CalendarCheck, CheckCircle2, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PlanejadorPrazosViewProps {
  onDeadlineClick: (deadlineId: string) => void;
}

interface PrazosColumn {
  id: string;
  label: string;
  color: string;
  icon: React.ReactNode;
  items: Deadline[];
}

export function PlanejadorPrazosView({ onDeadlineClick }: PlanejadorPrazosViewProps) {
  const { deadlines, isLoading } = useAgendaData();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const columns = useMemo<PrazosColumn[]>(() => {
    const userId = user?.id;
    if (!userId) return [];

    // Filter deadlines assigned to user (responsible or tagged)
    const myDeadlines = deadlines.filter(d => {
      if (d.advogadoResponsavel?.userId === userId) return true;
      if (d.taggedUsers?.some(t => t.userId === userId)) return true;
      
      return false;
    });

    const now = new Date();
    const today = startOfDay(now);
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

    const vencido: Deadline[] = [];
    const hoje: Deadline[] = [];
    const estaSemana: Deadline[] = [];
    const proximaSemana: Deadline[] = [];
    const futuro: Deadline[] = [];
    const concluido: Deadline[] = [];

    myDeadlines.forEach(d => {
      if (d.completed) {
        concluido.push(d);
        return;
      }
      const dDate = startOfDay(d.date);
      if (isToday(dDate)) {
        hoje.push(d);
      } else if (isBefore(dDate, today)) {
        vencido.push(d);
      } else if (isBefore(dDate, thisWeekEnd) || dDate.getTime() === thisWeekEnd.getTime()) {
        estaSemana.push(d);
      } else if (isWithinInterval(dDate, { start: nextWeekStart, end: nextWeekEnd })) {
        proximaSemana.push(d);
      } else {
        futuro.push(d);
      }
    });

    return [
      { id: "vencido", label: "Vencido", color: "#ef4444", icon: <AlertTriangle className="h-3.5 w-3.5" />, items: vencido },
      { id: "hoje", label: "Hoje", color: "#f59e0b", icon: <Clock className="h-3.5 w-3.5" />, items: hoje },
      { id: "esta_semana", label: "Esta Semana", color: "#3b82f6", icon: <CalendarDays className="h-3.5 w-3.5" />, items: estaSemana },
      { id: "proxima_semana", label: "Próxima Semana", color: "#8b5cf6", icon: <CalendarDays className="h-3.5 w-3.5" />, items: proximaSemana },
      { id: "futuro", label: "Futuro", color: "#06b6d4", icon: <CalendarCheck className="h-3.5 w-3.5" />, items: futuro },
      { id: "concluido", label: "Concluído", color: "#22c55e", icon: <CheckCircle2 className="h-3.5 w-3.5" />, items: concluido },
    ];
  }, [deadlines, user?.id]);

  const text = isDark ? "text-white" : "text-foreground";
  const textMuted = isDark ? "text-white/60" : "text-foreground/60";
  const glassBg = isDark ? "bg-white/[0.06]" : "bg-black/[0.04]";
  const cardBg = isDark ? "bg-white/[0.08] hover:bg-white/[0.12]" : "bg-white/70 hover:bg-white/90";
  const borderColor = isDark ? "border-white/10" : "border-black/10";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Clock className={`h-8 w-8 animate-spin ${isDark ? "text-white/50" : "text-foreground/50"}`} />
      </div>
    );
  }

  return (
    <div className="flex gap-3 h-full overflow-x-auto pb-2">
      {columns.map(col => (
        <div key={col.id} className={`flex flex-col min-w-[260px] max-w-[300px] flex-1 rounded-xl ${glassBg} border ${borderColor}`}>
          {/* Column header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-inherit">
            <span className="flex items-center justify-center w-5 h-5 rounded-md" style={{ backgroundColor: col.color + "30", color: col.color }}>
              {col.icon}
            </span>
            <span className={`text-sm font-semibold ${text}`}>{col.label}</span>
            <span className={`text-xs ml-auto ${textMuted}`}>{col.items.length}</span>
          </div>

          {/* Cards */}
          <ScrollArea className="flex-1 px-2 py-2">
            <div className="flex flex-col gap-2">
              {col.items.length === 0 && (
                <div className={`text-xs text-center py-6 ${textMuted}`}>Nenhum prazo</div>
              )}
              {col.items.map(deadline => (
                <button
                  key={deadline.id}
                  onClick={() => onDeadlineClick(deadline.id)}
                  className={`w-full text-left p-3 rounded-lg ${cardBg} border ${borderColor} transition-colors cursor-pointer`}
                >
                  <p className={`text-sm font-medium ${text} line-clamp-2`}>{deadline.title}</p>
                  {deadline.projectName && (
                    <p className={`text-xs mt-1 ${textMuted} truncate`}>{deadline.projectName}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs ${textMuted}`}>
                      {format(deadline.date, "dd MMM", { locale: ptBR })}
                    </span>
                    {deadline.advogadoResponsavel && (
                      <span className={`flex items-center gap-1 text-xs ${textMuted}`}>
                        <User className="h-3 w-3" />
                        <span className="max-w-[80px] truncate">{deadline.advogadoResponsavel.name?.split(" ")[0]}</span>
                      </span>
                    )}
                  </div>
                  {deadline.deadlineCategory && (
                    <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400">
                      {deadline.deadlineCategory}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
