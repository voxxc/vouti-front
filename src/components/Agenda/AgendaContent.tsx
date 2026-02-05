 import AgendaCalendar from "./AgendaCalendar";
 import { useAgendaData } from "@/hooks/useAgendaData";
 
 export function AgendaContent() {
   const { deadlines, selectedDate, setSelectedDate } = useAgendaData();
 
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