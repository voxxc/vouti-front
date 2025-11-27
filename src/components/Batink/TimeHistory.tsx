import { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, Loader2, CalendarDays } from 'lucide-react';
import { useBatinkAuth } from '@/contexts/BatinkAuthContext';
import { supabase } from '@/integrations/supabase/client';

interface TimeEntry {
  id: string;
  entry_type: 'entrada' | 'saida';
  registered_at: string;
}

const TimeHistory = () => {
  const { user } = useBatinkAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTodayEntries();

      // Subscribe to realtime changes
      const channel = supabase
        .channel('batink_time_entries_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'batink_time_entries',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newEntry = payload.new as TimeEntry;
            setEntries((prev) => [newEntry, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchTodayEntries = async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('batink_time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('registered_at', today.toISOString())
        .order('registered_at', { ascending: false });

      if (error) throw error;
      setEntries((data as TimeEntry[]) || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkedTime = () => {
    if (entries.length === 0) return null;

    let totalMinutes = 0;
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime()
    );

    for (let i = 0; i < sortedEntries.length - 1; i += 2) {
      const entrada = sortedEntries[i];
      const saida = sortedEntries[i + 1];

      if (entrada?.entry_type === 'entrada' && saida?.entry_type === 'saida') {
        const entradaTime = new Date(entrada.registered_at).getTime();
        const saidaTime = new Date(saida.registered_at).getTime();
        totalMinutes += (saidaTime - entradaTime) / (1000 * 60);
      }
    }

    // If last entry is 'entrada', calculate time until now
    const lastEntry = sortedEntries[sortedEntries.length - 1];
    if (lastEntry?.entry_type === 'entrada') {
      const entradaTime = new Date(lastEntry.registered_at).getTime();
      const now = new Date().getTime();
      totalMinutes += (now - entradaTime) / (1000 * 60);
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);

    return `${hours}h ${minutes}min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Nenhum registro hoje</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Registre sua entrada para começar
        </p>
      </div>
    );
  }

  const workedTime = calculateWorkedTime();

  return (
    <div className="space-y-4">
      {/* Worked time summary */}
      {workedTime && (
        <div className="bg-primary/10 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">Tempo trabalhado hoje</p>
          <p className="text-2xl font-bold text-primary">{workedTime}</p>
        </div>
      )}

      {/* Entries list */}
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              entry.entry_type === 'entrada'
                ? 'bg-green-500/5 border-green-500/20'
                : 'bg-orange-500/5 border-orange-500/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  entry.entry_type === 'entrada'
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-orange-500/20 text-orange-500'
                }`}
              >
                {entry.entry_type === 'entrada' ? (
                  <LogIn className="w-4 h-4" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
              </div>
              <span className="font-medium text-foreground">
                {entry.entry_type === 'entrada' ? 'Entrada' : 'Saída'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="tabular-nums">
                {new Date(entry.registered_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimeHistory;
