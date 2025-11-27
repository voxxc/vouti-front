import { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, Coffee, UtensilsCrossed, RotateCcw, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBatinkAuth } from '@/contexts/BatinkAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import HoldButton from './HoldButton';

type EntryType = 'entrada' | 'pausa' | 'almoco' | 'retorno_almoco' | 'saida';

interface TimeEntry {
  id: string;
  entry_type: string;
  entry_date: string;
  entry_time: string;
  registered_at: string;
}

const entryTypeConfig = {
  entrada: { label: 'Entrada', icon: LogIn, color: 'text-green-500' },
  pausa: { label: 'Pausa', icon: Coffee, color: 'text-yellow-500' },
  almoco: { label: 'Almoço', icon: UtensilsCrossed, color: 'text-blue-500' },
  retorno_almoco: { label: 'Retorno do Almoço', icon: RotateCcw, color: 'text-cyan-500' },
  saida: { label: 'Saída', icon: LogOut, color: 'text-orange-500' },
};

const TimeEntryPanel = () => {
  const { user } = useBatinkAuth();
  const { toast } = useToast();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedType, setSelectedType] = useState<EntryType>('entrada');
  const [lastEntry, setLastEntry] = useState<TimeEntry | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      fetchLastEntry();
    }
  }, [user]);

  const fetchLastEntry = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('batink_time_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .order('entry_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching last entry:', error);
      }

      setLastEntry(data as TimeEntry | null);
      
      if (data) {
        const nextType = getNextEntryType(data.entry_type as EntryType);
        setSelectedType(nextType);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const getNextEntryType = (lastType: EntryType): EntryType => {
    switch (lastType) {
      case 'entrada': return 'pausa';
      case 'pausa': return 'entrada';
      case 'almoco': return 'retorno_almoco';
      case 'retorno_almoco': return 'saida';
      case 'saida': return 'entrada';
      default: return 'entrada';
    }
  };

  const handleRegisterEntry = async () => {
    if (!user) return;

    const now = new Date();
    const entryDate = now.toISOString().split('T')[0];
    const entryTime = now.toTimeString().split(' ')[0];
    
    try {
      const { data, error } = await supabase
        .from('batink_time_entries')
        .insert({
          user_id: user.id,
          entry_type: selectedType,
          entry_date: entryDate,
          entry_time: entryTime,
          registered_at: now.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setLastEntry(data as TimeEntry);
      const nextType = getNextEntryType(selectedType);
      setSelectedType(nextType);
      
      const config = entryTypeConfig[selectedType];
      toast({
        title: `✅ ${config.label} registrada!`,
        description: `Horário: ${now.toLocaleTimeString('pt-BR')}`,
      });

    } catch (error: any) {
      toast({
        title: 'Erro ao registrar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#9333EA]" />
      </div>
    );
  }

  const SelectedIcon = entryTypeConfig[selectedType].icon;

  return (
    <div className="space-y-6">
      {/* Current Time Display */}
      <div className="text-center">
        <div className="text-5xl font-bold text-white tabular-nums tracking-tight">
          {currentTime.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </div>
        <p className="text-white/60 mt-2">
          {currentTime.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
          })}
        </p>
      </div>

      {/* Last Entry Status */}
      {lastEntry && (
        <div className="text-center">
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm bg-white/10 ${entryTypeConfig[lastEntry.entry_type as EntryType]?.color || 'text-white'}`}>
            <Clock className="w-4 h-4" />
            Último: {entryTypeConfig[lastEntry.entry_type as EntryType]?.label || lastEntry.entry_type} às{' '}
            {lastEntry.entry_time?.substring(0, 5)}
          </span>
        </div>
      )}

      {/* Entry Type Selector */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-white/60">
          Tipo de Registro
        </label>
        <Select value={selectedType} onValueChange={(v) => setSelectedType(v as EntryType)}>
          <SelectTrigger className="w-full h-14 text-lg bg-[#1a1625] border-white/20 text-white">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent className="bg-[#2d2640] border-white/20">
            {Object.entries(entryTypeConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <SelectItem 
                  key={key} 
                  value={key} 
                  className="py-3 text-white focus:bg-[#9333EA]/20 focus:text-white"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <span>{config.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Hold Button */}
      <HoldButton
        onComplete={handleRegisterEntry}
        variant={selectedType}
        className="w-full"
      >
        <SelectedIcon className="w-6 h-6" />
        <span>Registrar {entryTypeConfig[selectedType].label}</span>
      </HoldButton>

      {/* Helper text */}
      <p className="text-center text-sm text-white/50">
        Segure o botão por 3 segundos para confirmar
      </p>
    </div>
  );
};

export default TimeEntryPanel;
