import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Deadline } from "@/types/agenda";
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
}

const AgendaCalendar = ({ selectedDate, onSelectDate, deadlines }: AgendaCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDeadlinesForDate = (date: Date): Deadline[] => {
    return deadlines.filter(deadline => isSameDay(deadline.date, date));
  };

  const getDeadlineStatusColor = (deadline: Deadline): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const deadlineDate = new Date(deadline.date);
    deadlineDate.setHours(0, 0, 0, 0);
    
    if (deadline.completed) {
      return 'bg-green-500'; // Concluído
    }
    
    if (deadlineDate <= today) {
      return 'bg-red-500'; // Atrasado ou vence hoje
    }
    
    return 'bg-yellow-500'; // Pendente
  };

  const getColorPriority = (color: string): number => {
    if (color === 'bg-red-500') return 3;
    if (color === 'bg-yellow-500') return 2;
    return 1; // green
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

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    );
  };

  const renderDaysOfWeek = () => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day, index) => (
          <div
            key={index}
            className="text-center text-sm font-medium text-muted-foreground py-2"
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
        const usersWithStatus = getUsersWithStatusForDate(currentDay);
        const isCurrentMonth = isSameMonth(currentDay, monthStart);
        const isSelected = isSameDay(currentDay, selectedDate);
        const isTodayDate = isToday(currentDay);
        const hasDeadlines = dayDeadlines.length > 0;

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
            {/* Day number */}
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
                <Badge 
                  variant="secondary" 
                  className="text-[10px] px-1.5 py-0 h-4"
                >
                  {dayDeadlines.length}
                </Badge>
              )}
            </div>

            {/* User names list with status colors */}
            {usersWithStatus.length > 0 && (
              <div className="space-y-0.5 overflow-hidden">
                {usersWithStatus.slice(0, 3).map((user, idx) => (
                  <div
                    key={idx}
                    className="text-[10px] text-muted-foreground truncate flex items-center gap-1"
                  >
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
