import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, Clock, AlertCircle, ChevronRight, Briefcase, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { format, differenceInDays, isPast, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PrazosAbertosPanelProps {
  userId: string;
  maxItems?: number;
  onOpenAgendaDrawer?: () => void;
}

interface PrazoAberto {
  id: string;
  title: string;
  date: string;
  projectName: string;
  clientName: string;
  protocoloEtapaId: string | null;
}

interface TarefaItem {
  id: string;
  titulo: string;
  dataExecucao: string | null;
  contexto: string;
  subContexto?: string;
}

const PrazosAbertosPanel = ({ userId, maxItems = 10, onOpenAgendaDrawer }: PrazosAbertosPanelProps) => {
  const [prazos, setPrazos] = useState<PrazoAberto[]>([]);
  const [tarefasAdmin, setTarefasAdmin] = useState<TarefaItem[]>([]);
  const [tarefasJuridico, setTarefasJuridico] = useState<TarefaItem[]>([]);
  const [loadingPrazos, setLoadingPrazos] = useState(true);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [loadingJuridico, setLoadingJuridico] = useState(true);
  const { tenantId } = useTenantId();
  const { navigate } = useTenantNavigation();

  useEffect(() => {
    if (tenantId && userId) {
      fetchPrazosAbertos();
      fetchTarefasAdmin();
      fetchTarefasJuridico();
    }
  }, [tenantId, userId]);

  const fetchPrazosAbertos = async () => {
    try {
      setLoadingPrazos(true);

      // Buscar prazos onde o usuário é responsável, criador ou está tagueado
      const { data: taggedDeadlines } = await supabase
        .from('deadline_tags')
        .select('deadline_id')
        .eq('tagged_user_id', userId);

      const taggedIds = taggedDeadlines?.map(t => t.deadline_id) || [];

      let query = supabase
        .from('deadlines')
        .select(`
          id,
          title,
          date,
          user_id,
          advogado_responsavel_id,
          protocolo_etapa_id,
          project:projects(name, client)
        `)
        .eq('completed', false)
        .eq('tenant_id', tenantId)
        .or(`user_id.eq.${userId},advogado_responsavel_id.eq.${userId}${taggedIds.length > 0 ? `,id.in.(${taggedIds.join(',')})` : ''}`)
        .order('date', { ascending: true })
        .limit(maxItems);

      const { data, error } = await query;

      if (error) throw error;

      const formattedPrazos: PrazoAberto[] = (data || []).map((prazo: any) => ({
        id: prazo.id,
        title: prazo.title,
        date: prazo.date,
        projectName: prazo.project?.name || 'Sem projeto',
        clientName: prazo.project?.client || 'Sem cliente',
        protocoloEtapaId: prazo.protocolo_etapa_id,
      }));

      setPrazos(formattedPrazos);
    } catch (error) {
      console.error('Erro ao buscar prazos:', error);
    } finally {
      setLoadingPrazos(false);
    }
  };

  const fetchTarefasAdmin = async () => {
    try {
      setLoadingAdmin(true);

      // Query com tipagem explícita para evitar erro TS2589
      const { data, error } = await supabase
        .from('task_tarefas')
        .select('id, titulo, data_execucao, task_id')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId!)
        .order('data_execucao', { ascending: true, nullsFirst: false })
        .limit(maxItems) as { data: Array<{ id: string; titulo: string; data_execucao: string | null; task_id: string }> | null; error: any };

      if (error) throw error;

      // Buscar informações das tasks separadamente
      const taskIds = (data || []).map(t => t.task_id).filter(Boolean);
      const tasksMap: Record<string, { title: string; projectName: string; client: string }> = {};

      if (taskIds.length > 0) {
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, title, project_id')
          .in('id', taskIds);

        const projectIds = (tasksData || []).map(t => t.project_id).filter(Boolean) as string[];
        const projectsMap: Record<string, { name: string; client: string }> = {};

        if (projectIds.length > 0) {
          const { data: projectsData } = await supabase
            .from('projects')
            .select('id, name, client')
            .in('id', projectIds);

          (projectsData || []).forEach((p) => {
            projectsMap[p.id] = { name: p.name, client: p.client || '' };
          });
        }

        (tasksData || []).forEach((task) => {
          const project = projectsMap[task.project_id] || { name: 'Sem projeto', client: '' };
          tasksMap[task.id] = {
            title: task.title,
            projectName: project.name || 'Sem projeto',
            client: project.client || ''
          };
        });
      }

      const formattedTarefas: TarefaItem[] = (data || []).map((tarefa) => {
        const taskInfo = tasksMap[tarefa.task_id] || { title: '', projectName: 'Sem projeto', client: '' };
        return {
          id: tarefa.id,
          titulo: tarefa.titulo,
          dataExecucao: tarefa.data_execucao,
          contexto: taskInfo.client || taskInfo.projectName || 'Sem projeto',
          subContexto: taskInfo.title,
        };
      });

      setTarefasAdmin(formattedTarefas);
    } catch (error) {
      console.error('Erro ao buscar tarefas administrativas:', error);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const fetchTarefasJuridico = async () => {
    try {
      setLoadingJuridico(true);

      // Query com tipagem explícita para evitar erro TS2589
      const { data, error } = await supabase
        .from('processos_oab_tarefas')
        .select('id, titulo, data_execucao, processo_oab_id')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId!)
        .order('data_execucao', { ascending: true, nullsFirst: false })
        .limit(maxItems) as { data: Array<{ id: string; titulo: string; data_execucao: string | null; processo_oab_id: string }> | null; error: any };

      if (error) throw error;

      // Buscar informações dos processos separadamente
      const processoIds = (data || []).map(t => t.processo_oab_id).filter(Boolean);
      const processosMap: Record<string, { numero_cnj: string; parte_ativa: string; parte_passiva: string }> = {};

      if (processoIds.length > 0) {
        const { data: processosData } = await supabase
          .from('processos_oab')
          .select('id, numero_cnj, parte_ativa, parte_passiva')
          .in('id', processoIds);

        (processosData || []).forEach((p) => {
          processosMap[p.id] = { 
            numero_cnj: p.numero_cnj || '', 
            parte_ativa: p.parte_ativa || '', 
            parte_passiva: p.parte_passiva || '' 
          };
        });
      }

      const formattedTarefas: TarefaItem[] = (data || []).map((tarefa) => {
        const processo = processosMap[tarefa.processo_oab_id] || { numero_cnj: '', parte_ativa: '', parte_passiva: '' };
        return {
          id: tarefa.id,
          titulo: tarefa.titulo,
          dataExecucao: tarefa.data_execucao,
          contexto: processo.numero_cnj || 'Sem processo',
          subContexto: processo.parte_ativa ? `${processo.parte_ativa} x ${processo.parte_passiva || ''}` : undefined,
        };
      });

      setTarefasJuridico(formattedTarefas);
    } catch (error) {
      console.error('Erro ao buscar tarefas jurídicas:', error);
    } finally {
      setLoadingJuridico(false);
    }
  };

  const getUrgencyBadge = (dateStr: string | null) => {
    if (!dateStr) {
      return (
        <Badge variant="outline" className="text-xs">
          Sem data
        </Badge>
      );
    }

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

  const handleNavigateToProjetos = () => {
    navigate('projects');
  };

  const handleNavigateToControladoria = () => {
    navigate('controladoria');
  };

  const isLoading = loadingPrazos && loadingAdmin && loadingJuridico;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Minhas Tarefas e Prazos
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

  const renderPrazosList = () => (
    <>
      {loadingPrazos ? (
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
      ) : prazos.length === 0 ? (
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
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-3">
            {prazos.map((prazo) => (
              <div
                key={prazo.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={onOpenAgendaDrawer || handleNavigateToAgenda}
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
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {prazo.title}
                      </p>
                      {prazo.protocoloEtapaId && (
                        <Badge variant="outline" className="text-xs shrink-0 px-1.5 py-0 h-5">
                          Protocolo
                        </Badge>
                      )}
                    </div>
                    {getUrgencyBadge(prazo.date)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {prazo.clientName}
                  </p>
                  <span className="text-xs text-muted-foreground/70">
                    {format(new Date(prazo.date), "dd 'de' MMM", { locale: ptBR })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
      {prazos.length > 0 && (
        <div className="pt-3 border-t mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNavigateToAgenda}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            Ver todos na Agenda
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </>
  );

  const renderTarefasList = (
    tarefas: TarefaItem[],
    loading: boolean,
    emptyIcon: React.ReactNode,
    emptyMessage: string,
    onNavigate: () => void,
    navigateLabel: string
  ) => (
    <>
      {loading ? (
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
      ) : tarefas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          {emptyIcon}
          <p className="text-muted-foreground text-sm">
            {emptyMessage}
          </p>
          <p className="text-muted-foreground/70 text-xs mt-1">
            Nenhuma tarefa pendente!
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-3">
            {tarefas.map((tarefa) => (
              <div
                key={tarefa.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={onNavigate}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {tarefa.dataExecucao && isPast(new Date(tarefa.dataExecucao)) && !isToday(new Date(tarefa.dataExecucao)) ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm truncate">
                      {tarefa.titulo}
                    </p>
                    {getUrgencyBadge(tarefa.dataExecucao)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {tarefa.contexto}
                  </p>
                  {tarefa.subContexto && (
                    <p className="text-xs text-muted-foreground/70 truncate">
                      {tarefa.subContexto}
                    </p>
                  )}
                  {tarefa.dataExecucao && (
                    <span className="text-xs text-muted-foreground/70">
                      {format(new Date(tarefa.dataExecucao), "dd 'de' MMM", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
      {tarefas.length > 0 && (
        <div className="pt-3 border-t mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigate}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            {navigateLabel}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Minhas Tarefas e Prazos
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="prazos" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="prazos" className="flex items-center gap-1 text-xs sm:text-sm">
              <Calendar className="h-4 w-4 hidden sm:block" />
              Prazos
              {prazos.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {prazos.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="administrativo" className="flex items-center gap-1 text-xs sm:text-sm">
              <Briefcase className="h-4 w-4 hidden sm:block" />
              Admin
              {tarefasAdmin.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {tarefasAdmin.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="juridico" className="flex items-center gap-1 text-xs sm:text-sm">
              <Scale className="h-4 w-4 hidden sm:block" />
              Jurídico
              {tarefasJuridico.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {tarefasJuridico.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prazos" className="mt-0">
            {renderPrazosList()}
          </TabsContent>

          <TabsContent value="administrativo" className="mt-0">
            {renderTarefasList(
              tarefasAdmin,
              loadingAdmin,
              <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-3" />,
              "Nenhuma tarefa administrativa",
              handleNavigateToProjetos,
              "Ver todos os projetos"
            )}
          </TabsContent>

          <TabsContent value="juridico" className="mt-0">
            {renderTarefasList(
              tarefasJuridico,
              loadingJuridico,
              <Scale className="h-12 w-12 text-muted-foreground/50 mb-3" />,
              "Nenhuma tarefa jurídica",
              handleNavigateToControladoria,
              "Ver controladoria"
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PrazosAbertosPanel;
