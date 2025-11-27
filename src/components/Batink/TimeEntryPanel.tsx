import { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBatinkAuth } from '@/contexts/BatinkAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type EntryType = 'entrada' | 'saida';

interface TimeEntry {
  id: string;
  entry_type: EntryType;
  registered_at: string;
}

const TimeEntryPanel = () => {
  const { user } = useBatinkAuth();
  const { toast } = useToast();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastEntry, setLastEntry] = useState<TimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [justRegistered, setJustRegistered] = useState(false);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch last entry on mount
  useEffect(() => {
    if (user) {
      fetchLastEntry();
    }
  }, [user]);

  const fetchLastEntry = async () => {
    if (!user) return;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('batink_time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('registered_at', today.toISOString())
        .order('registered_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching last entry:', error);
      }

      setLastEntry(data as TimeEntry | null);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleRegisterEntry = async () => {
    if (!user) return;

    const nextType: EntryType = lastEntry?.entry_type === 'entrada' ? 'saida' : 'entrada';
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('batink_time_entries')
        .insert({
          user_id: user.id,
          entry_type: nextType,
          registered_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setLastEntry(data as TimeEntry);
      setJustRegistered(true);
      
      toast({
        title: nextType === 'entrada' ? '✅ Entrada registrada!' : '✅ Saída registrada!',
        description: `Horário: ${new Date().toLocaleTimeString('pt-BR')}`,
      });

      // Reset animation after 2 seconds
      setTimeout(() => setJustRegistered(false), 2000);
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextEntryType: EntryType = lastEntry?.entry_type === 'entrada' ? 'saida' : 'entrada';

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Time Display */}
      <div className="text-center">
        <div className="text-5xl font-bold text-foreground tabular-nums">
          {currentTime.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </div>
        <p className="text-muted-foreground mt-1">
          {currentTime.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
          })}
        </p>
      </div>

      {/* Status */}
      {lastEntry && (
        <div className="text-center">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            lastEntry.entry_type === 'entrada'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-orange-500/20 text-orange-400'
          }`}>
            <CheckCircle2 className="w-4 h-4" />
            Último registro: {lastEntry.entry_type === 'entrada' ? 'Entrada' : 'Saída'} às{' '}
            {new Date(lastEntry.registered_at).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      )}

      {/* Register Button */}
      <Button
        size="lg"
        className={`w-full py-8 text-lg font-semibold transition-all ${
          justRegistered
            ? 'bg-green-600 hover:bg-green-600'
            : nextEntryType === 'entrada'
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-orange-600 hover:bg-orange-700'
        } text-white`}
        onClick={handleRegisterEntry}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Registrando...
          </>
        ) : justRegistered ? (
          <>
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Registrado!
          </>
        ) : nextEntryType === 'entrada' ? (
          <>
            <LogIn className="w-5 h-5 mr-2" />
            Registrar Entrada
          </>
        ) : (
          <>
            <LogOut className="w-5 h-5 mr-2" />
            Registrar Saída
          </>
        )}
      </Button>

      {/* Helper text */}
      <p className="text-center text-sm text-muted-foreground">
        {nextEntryType === 'entrada'
          ? 'Clique para iniciar sua jornada'
          : 'Clique para encerrar sua jornada'}
      </p>
    </div>
  );
};

export default TimeEntryPanel;
