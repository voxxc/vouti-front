import { useState, useEffect } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, CheckCircle2, Clock, AlertTriangle, Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseLocalDate } from '@/lib/dateUtils';
import { toast } from 'sonner';

interface PrazosCasoTabProps {
  processoOabId: string;
}

interface PrazoCaso {
  id: string;
  title: string;
  description: string | null;
  date: string;
  completed: boolean;
  concluido_em: string | null;
  advogado: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  projects: {
    name: string;
    client: string | null;
  } | null;
}

export const PrazosCasoTab = ({ processoOabId }: PrazosCasoTabProps) => {
  const [prazos, setPrazos] = useState<PrazoCaso[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchPrazos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('deadlines')
      .select(`
        id, title, description, date, completed, concluido_em,
        advogado:profiles!deadlines_advogado_responsavel_id_fkey(user_id, full_name, avatar_url),
        projects(name, client)
      `)
      .eq('processo_oab_id', processoOabId)
      .order('date', { ascending: true });

    if (error) {
      console.error('[PrazosCasoTab] Error:', error);
    } else {
      setPrazos((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPrazos();
  }, [processoOabId]);

  const handleToggleCompleted = async (prazo: PrazoCaso) => {
    setToggling(prazo.id);
    const newCompleted = !prazo.completed;
    const { error } = await supabase
      .from('deadlines')
      .update({
        completed: newCompleted,
        concluido_em: newCompleted ? new Date().toISOString() : null,
      })
      .eq('id', prazo.id);

    if (error) {
      toast.error('Erro ao atualizar prazo');
    } else {
      setPrazos(prev => prev.map(p =>
        p.id === prazo.id ? { ...p, completed: newCompleted, concluido_em: newCompleted ? new Date().toISOString() : null } : p
      ));
      toast.success(newCompleted ? 'Prazo concluído' : 'Prazo reaberto');
    }
    setToggling(null);
  };

  const getStatusInfo = (prazo: PrazoCaso) => {
    if (prazo.completed) {
      return { label: 'Concluído', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' };
    }
    const prazoDate = parseLocalDate(prazo.date);
    if (isToday(prazoDate)) {
      return { label: 'Hoje', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' };
    }
    if (isPast(prazoDate)) {
      return { label: 'Vencido', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' };
    }
    return { label: 'Pendente', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendentes = prazos.filter(p => !p.completed);
  const concluidos = prazos.filter(p => p.completed);

  if (prazos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Calendar className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">Nenhum prazo vinculado</p>
        <p className="text-xs mt-1">Os prazos automáticos aparecerão aqui quando detectados</p>
      </div>
    );
  }

  const renderPrazo = (prazo: PrazoCaso) => {
    const status = getStatusInfo(prazo);
    const StatusIcon = status.icon;

    return (
      <Card key={prazo.id} className={`p-3 ${status.bg} border`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusIcon className={`w-4 h-4 shrink-0 ${status.color}`} />
              <span className="font-medium text-sm truncate">{prazo.title}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground ml-6">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(parseLocalDate(prazo.date), "dd/MM/yyyy", { locale: ptBR })}
              </span>
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {status.label}
              </Badge>
            </div>
            {prazo.description && (
              <p className="text-xs text-muted-foreground mt-1 ml-6 line-clamp-2">{prazo.description}</p>
            )}
            {prazo.advogado && (
              <div className="flex items-center gap-2 mt-2 ml-6">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={prazo.advogado.avatar_url || ''} />
                  <AvatarFallback className="text-[10px]">
                    {prazo.advogado.full_name?.charAt(0) || <User className="w-3 h-3" />}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">{prazo.advogado.full_name}</span>
              </div>
            )}
          </div>
          <Switch
            checked={prazo.completed}
            onCheckedChange={() => handleToggleCompleted(prazo)}
            disabled={toggling === prazo.id}
          />
        </div>
      </Card>
    );
  };

  return (
    <ScrollArea className="h-[calc(100vh-420px)]">
      <div className="space-y-4 pr-4">
        {pendentes.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pendentes ({pendentes.length})
            </h4>
            <div className="space-y-2">
              {pendentes.map(renderPrazo)}
            </div>
          </div>
        )}
        {concluidos.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Concluídos ({concluidos.length})
            </h4>
            <div className="space-y-2">
              {concluidos.map(renderPrazo)}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
