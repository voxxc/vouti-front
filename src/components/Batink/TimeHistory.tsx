import { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, Coffee, UtensilsCrossed, RotateCcw, Loader2, CalendarDays } from 'lucide-react';
import { useBatinkAuth } from '@/contexts/BatinkAuthContext';
import { supabase } from '@/integrations/supabase/client';

type EntryType = 'entrada' | 'pausa' | 'almoco' | 'retorno_almoco' | 'saida';

interface TimeEntry {
  id: string;
  entry_type: string;
  entry_date: string;
  entry_time: string;
  registered_at: string;
}

const entryTypeConfig: Record<EntryType, { label: string; icon: typeof LogIn; bgColor: string; textColor: string }> = {
  entrada: { label: 'Entrada', icon: LogIn, bgColor: 'bg-green-500/20', textColor: 'text-green-500' },
  pausa: { label: 'Pausa', icon: Coffee, bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-500' },
  almoco: { label: 'Almoço', icon: UtensilsCrossed, bgColor: 'bg-blue-500/20', textColor: 'text-blue-500' },
  retorno_almoco: { label: 'Retorno', icon: RotateCcw, bgColor: 'bg-cyan-500/20', textColor: 'text-cyan-500' },
  saida: { label: 'Saída', icon: LogOut, bgColor: 'bg-orange-500/20', textColor: 'text-orange-500' },
};

const TimeHistory = () => {
  const { user } = useBatinkAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTodayEntries();
      
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
            const today = new Date().toISOString().split('T')[0];
            if (newEntry.entry_date === today) {
              setEntries((prev) => [newEntry, ...prev]);
            }
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
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('batink_time_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .order('entry_time', { ascending: false });

      if (error) throw error;
      setEntries((data as TimeEntry[]) || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkedTime = (): string => {
    if (entries.length === 0) return '';

    let totalMinutes = 0;
    let lastEntrada: Date | null = null;

    const sortedEntries = [...entries].sort((a, b) => 
      a.entry_time.localeCompare(b.entry_time)
    );

    for (const entry of sortedEntries) {
      const entryTime = new Date(`2000-01-01T${entry.entry_time}`);
      
      switch (entry.entry_type) {
        case 'entrada':
        case 'retorno_almoco':
          lastEntrada = entryTime;
          break;
        case 'pausa':
        case 'almoco':
        case 'saida':
          if (lastEntrada) {
            totalMinutes += (entryTime.getTime() - lastEntrada.getTime()) / 60000;
            lastEntrada = null;
          }
          break;
      }
    }

    // If still working
    if (lastEntrada) {
      const now = new Date();
      const nowTime = new Date(`2000-01-01T${now.toTimeString().split(' ')[0]}`);
      totalMinutes += (nowTime.getTime() - lastEntrada.getTime()) / 60000;
    }

    if (totalMinutes <= 0) return '';

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${hours}h ${minutes}min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#9333EA]" />
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
      {workedTime && (
        <div className="bg-[#9333EA]/10 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">Tempo trabalhado hoje</p>
          <p className="text-2xl font-bold text-[#9333EA]">{workedTime}</p>
        </div>
      )}

      <div className="space-y-2">
        {entries.map((entry) => {
          const config = entryTypeConfig[entry.entry_type as EntryType] || {
            label: entry.entry_type,
            icon: Clock,
            bgColor: 'bg-muted',
            textColor: 'text-foreground',
          };
          const Icon = config.icon;

          return (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${config.bgColor} border-transparent`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-background/50 ${config.textColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`font-medium ${config.textColor}`}>
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="tabular-nums">
                  {entry.entry_time?.substring(0, 5)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeHistory;
