import AgendaCalendar from "./AgendaCalendar";
import { useAgendaData } from "@/hooks/useAgendaData";
import { Skeleton } from "@/components/ui/skeleton";

export function AgendaContent() {
  const { deadlines, isLoading, selectedDate, setSelectedDate } = useAgendaData();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AgendaCalendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        deadlines={deadlines}
      />
    </div>
  );
}