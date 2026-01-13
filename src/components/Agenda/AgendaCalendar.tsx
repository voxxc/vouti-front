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

  const getUniqueUsersForDate = (date: Date): string[] => {
    const dayDeadlines = getDeadlinesForDate(date);
    const userNames = new Set<string>();

    dayDeadlines.forEach(deadline => {
      if (deadline.advogadoResponsavel?.name) {
        const firstName = deadline.advogadoResponsavel.name.split(' ')[0];
        userNames.add(firstName);
      }
      deadline.taggedUsers?.forEach(tagged => {
        if (tagged.name) {
          const firstName = tagged.name.split(' ')[0];
          userNames.add(firstName);
        }
      });
    });

    return Array.from(userNames);
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
        const uniqueUsers = getUniqueUsersForDate(currentDay);
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

            {/* User names list */}
            {uniqueUsers.length > 0 && (
              <div className="space-y-0.5 overflow-hidden">
                {uniqueUsers.slice(0, 3).map((name, idx) => (
                  <div
                    key={idx}
                    className="text-[10px] text-muted-foreground truncate flex items-center gap-1"
                  >
                    <span className="w-1 h-1 rounded-full bg-primary/60 flex-shrink-0" />
                    {name}
                  </div>
                ))}
                {uniqueUsers.length > 3 && (
                  <div className="text-[10px] text-muted-foreground/70 italic">
                    +{uniqueUsers.length - 3} mais
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
