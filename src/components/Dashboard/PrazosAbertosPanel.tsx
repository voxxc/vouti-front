import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { format, differenceInDays, isPast, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PrazosAbertosPanelProps {
  userId: string;
  isAdmin?: boolean;
  maxItems?: number;
}

interface PrazoAberto {
  id: string;
  title: string;
  date: string;
  projectName: string;
  clientName: string;
  advogadoName?: string;
}

const PrazosAbertosPanel = ({ userId, isAdmin = false, maxItems = 10 }: PrazosAbertosPanelProps) => {
  const [prazos, setPrazos] = useState<PrazoAberto[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantId } = useTenantId();
  const { navigate } = useTenantNavigation();

  useEffect(() => {
    if (tenantId) {
      fetchPrazosAbertos();
    }
  }, [tenantId, userId, isAdmin]);

  const fetchPrazosAbertos = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('deadlines')
        .select(`
          id,
          title,
          date,
          user_id,
          advogado_responsavel_id,
          project:projects(name, client_name),
          advogado:profiles!deadlines_advogado_responsavel_id_fkey(full_name)
        `)
        .eq('completed', false)
        .eq('tenant_id', tenantId)
        .order('date', { ascending: true });

      // Se não for admin, filtra apenas prazos do usuário
      if (!isAdmin) {
        // Buscar prazos onde o usuário é responsável, criador ou está tagueado
        const { data: taggedDeadlines } = await supabase
          .from('deadline_tags')
          .select('deadline_id')
          .eq('tagged_user_id', userId);

        const taggedIds = taggedDeadlines?.map(t => t.deadline_id) || [];

        query = query.or(`user_id.eq.${userId},advogado_responsavel_id.eq.${userId}${taggedIds.length > 0 ? `,id.in.(${taggedIds.join(',')})` : ''}`);
      }

      const { data, error } = await query.limit(maxItems);

      if (error) throw error;

      const formattedPrazos: PrazoAberto[] = (data || []).map((prazo: any) => ({
        id: prazo.id,
        title: prazo.title,
        date: prazo.date,
        projectName: prazo.project?.name || 'Sem projeto',
        clientName: prazo.project?.client_name || 'Sem cliente',
        advogadoName: prazo.advogado?.full_name || undefined,
      }));

      setPrazos(formattedPrazos);
    } catch (error) {
      console.error('Erro ao buscar prazos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyBadge = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isPast(date) && !isToday(date)) {
      const daysLate = Math.abs(differenceInDays(date, today));
      return (
        <Badge variant="destructive" className="text-xs">
          Vencido há {daysLate} dia{daysLate > 1 ? 's' : ''}
        </Badge>
      );
    }
    
    if (isToday(date)) {
      return (
        <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs">
          Hoje
        </Badge>
      );
    }
    
    if (isTomorrow(date)) {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
          Amanhã
        </Badge>
      );
    }
    
    const daysUntil = differenceInDays(date, today);
    
    if (daysUntil <= 7) {
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs">
          {daysUntil} dias
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="text-xs">
        {daysUntil} dias
      </Badge>
    );
  };

  const handleNavigateToAgenda = () => {
    navigate('agenda');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Prazos em Aberto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Prazos em Aberto
            {prazos.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {prazos.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNavigateToAgenda}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Ver todos
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {prazos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">
              Nenhum prazo em aberto
            </p>
            <p className="text-muted-foreground/70 text-xs mt-1">
              Todos os prazos foram concluídos!
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[320px] pr-4">
            <div className="space-y-3">
              {prazos.map((prazo) => (
                <div
                  key={prazo.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={handleNavigateToAgenda}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {isPast(new Date(prazo.date)) && !isToday(new Date(prazo.date)) ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">
                        {prazo.title}
                      </p>
                      {getUrgencyBadge(prazo.date)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {prazo.clientName}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-muted-foreground/70">
                        {format(new Date(prazo.date), "dd 'de' MMM", { locale: ptBR })}
                      </span>
                      {isAdmin && prazo.advogadoName && (
                        <>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="text-xs text-muted-foreground/70">
                            {prazo.advogadoName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default PrazosAbertosPanel;
