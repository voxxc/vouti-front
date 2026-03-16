import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Deadline } from "@/types/agenda";
import { parseLocalDate } from "@/lib/dateUtils";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths, 
  isSameDay, 
  isSameMonth, 
  isToday 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AgendaCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  deadlines: Deadline[];
  compact?: boolean;
}

const AgendaCalendar = ({ selectedDate, onSelectDate, deadlines, compact = false }: AgendaCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDeadlinesForDate = (date: Date): Deadline[] => {
    return deadlines.filter(deadline => isSameDay(deadline.date, date));
  };

  const getDeadlineStatusColor = (deadline: Deadline): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline.date);
    deadlineDate.setHours(0, 0, 0, 0);
    if (deadline.completed) return 'bg-green-500';
    if (deadlineDate <= today) return 'bg-destructive';
    return 'bg-yellow-500';
  };

  const getColorPriority = (color: string): number => {
    if (color === 'bg-destructive') return 3;
    if (color === 'bg-yellow-500') return 2;
    return 1;
  };

  /** Returns unique status dots for a date (compact mode: just colors) */
  const getDotsForDate = (date: Date): string[] => {
    const dayDeadlines = getDeadlinesForDate(date);
    if (dayDeadlines.length === 0) return [];
    const colorSet = new Map<string, number>();
    dayDeadlines.forEach(d => {
      const c = getDeadlineStatusColor(d);
      const existing = colorSet.get(c) ?? 0;
      colorSet.set(c, existing + 1);
    });
    // Return at most 3 distinct colors ordered by priority
    return Array.from(colorSet.keys()).sort((a, b) => getColorPriority(b) - getColorPriority(a)).slice(0, 3);
  };

  const getUsersWithStatusForDate = (date: Date): { name: string; color: string }[] => {
    const dayDeadlines = getDeadlinesForDate(date);
    const usersMap = new Map<string, string>();
    dayDeadlines.forEach(deadline => {
      const color = getDeadlineStatusColor(deadline);
      if (deadline.advogadoResponsavel?.name) {
        const firstName = deadline.advogadoResponsavel.name.split(' ')[0];
        const existingColor = usersMap.get(firstName);
        if (!existingColor || getColorPriority(color) > getColorPriority(existingColor)) {
          usersMap.set(firstName, color);
        }
      }
      deadline.taggedUsers?.forEach(tagged => {
        if (tagged.name) {
          const firstName = tagged.name.split(' ')[0];
          const existingColor = usersMap.get(firstName);
          if (!existingColor || getColorPriority(color) > getColorPriority(existingColor)) {
            usersMap.set(firstName, color);
          }
        }
      });
    });
    return Array.from(usersMap.entries()).map(([name, color]) => ({ name, color }));
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-3">
      <Button
        variant="ghost"
        size="icon"
        className={compact ? "h-7 w-7" : undefined}
        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
      >
        <ChevronLeft className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
      </Button>
      <h2 className={cn("font-semibold capitalize", compact ? "text-sm" : "text-lg")}>
        {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
      </h2>
      <Button
        variant="ghost"
        size="icon"
        className={compact ? "h-7 w-7" : undefined}
        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
      >
        <ChevronRight className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
      </Button>
    </div>
  );

  const renderDaysOfWeek = () => {
    const days = compact
      ? ["D", "S", "T", "Q", "Q", "S", "S"]
      : ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return (
      <div className="grid grid-cols-7 mb-1">
        {days.map((day, index) => (
          <div
            key={index}
            className={cn(
              "text-center font-medium text-muted-foreground py-1",
              compact ? "text-[10px]" : "text-sm py-2"
            )}
          >
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const rows: JSX.Element[] = [];
    let days: JSX.Element[] = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const dayDeadlines = getDeadlinesForDate(currentDay);
        const isCurrentMonth = isSameMonth(currentDay, monthStart);
        const isSelected = isSameDay(currentDay, selectedDate);
        const isTodayDate = isToday(currentDay);
        const hasDeadlines = dayDeadlines.length > 0;

        if (compact) {
          // Compact mode: smaller cells with just dots
          const dots = getDotsForDate(currentDay);
          days.push(
            <div
              key={currentDay.toISOString()}
              onClick={() => onSelectDate(currentDay)}
              className={cn(
                "min-h-[44px] border border-border/40 p-1 cursor-pointer transition-all hover:bg-accent/50 flex flex-col items-center justify-start gap-0.5",
                !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                isSelected && "ring-2 ring-primary bg-primary/5",
                isTodayDate && !isSelected && "bg-accent/30"
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full leading-none",
                  isTodayDate && "bg-primary text-primary-foreground",
                  hasDeadlines && !isTodayDate && "text-primary font-bold"
                )}
              >
                {format(currentDay, "d")}
              </span>
              {dots.length > 0 && (
                <div className="flex gap-0.5 justify-center flex-wrap">
                  {dots.map((color, idx) => (
                    <span key={idx} className={cn("w-1.5 h-1.5 rounded-full", color)} />
                  ))}
                </div>
              )}
            </div>
          );
        } else {
          // Full mode: original cells with user names
          const usersWithStatus = getUsersWithStatusForDate(currentDay);
          days.push(
            <div
              key={currentDay.toISOString()}
              onClick={() => onSelectDate(currentDay)}
              className={cn(
                "min-h-[100px] border border-border/50 p-1.5 cursor-pointer transition-all hover:bg-accent/50",
                !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                isSelected && "ring-2 ring-primary bg-primary/5",
                isTodayDate && !isSelected && "bg-accent/30"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    isTodayDate && "bg-primary text-primary-foreground",
                    hasDeadlines && !isTodayDate && "bg-primary/20 text-primary font-bold"
                  )}
                >
                  {format(currentDay, "d")}
                </span>
                {hasDeadlines && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {dayDeadlines.length}
                  </Badge>
                )}
              </div>
              {usersWithStatus.length > 0 && (
                <div className="space-y-0.5 overflow-hidden">
                  {usersWithStatus.slice(0, 3).map((user, idx) => (
                    <div key={idx} className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", user.color)} />
                      {user.name}
                    </div>
                  ))}
                  {usersWithStatus.length > 3 && (
                    <div className="text-[10px] text-muted-foreground/70 italic">
                      +{usersWithStatus.length - 3} mais
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }

        day = addDays(day, 1);
      }

      rows.push(
        <div key={day.toISOString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }

    return <div>{rows}</div>;
  };

  return (
    <div className="w-full">
      {renderHeader()}
      {renderDaysOfWeek()}
      {renderCells()}
    </div>
  );
};

export default AgendaCalendar;
