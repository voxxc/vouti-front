import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Edit, FileText, History, Clock, Trash2, CheckSquare, CalendarIcon, X, Bell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MovimentacaoCard from '@/components/Controladoria/MovimentacaoCard';
import { useProcessoMovimentacoes } from '@/hooks/useProcessoMovimentacoes';
import { BuscarAndamentosPJE } from '@/components/Controladoria/BuscarAndamentosPJE';
import { extrairTribunalDoNumeroProcesso } from '@/utils/processoHelpers';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';


interface Processo {
  id: string;
  numero_processo: string;
  parte_ativa: string;
  parte_passiva: string;
  status: string;
  prioridade: string;
  valor_causa: number | null;
  observacoes: string | null;
  data_distribuicao: string | null;
  prazo_proximo: string | null;
  created_at: string;
  updated_at: string;
  tribunal_nome?: string | null;
  comarca_nome?: string | null;
  tipo_acao_nome?: string | null;
  tribunais?: { sigla: string; nome: string };
  comarcas?: { nome: string };
  grupos_acoes?: { nome: string };
  tipos_acao?: { nome: string };
}

const ControladoriaProcessoDetalhes = () => {
  const { id } = useParams();
  const { navigate } = useTenantNavigation();
  const { toast } = useToast();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isController, setIsController] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [deletingMovimentacoes, setDeletingMovimentacoes] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  const { 
    movimentacoes, 
    loading: loadingMovimentacoes, 
    pendentes,
    conferidos,
    marcarConferido, 
    marcarEmRevisao,
    refetch: fetchMovimentacoes
  } = useProcessoMovimentacoes(id, dateRange.from, dateRange.to);

  useEffect(() => {
    if (id) {
      fetchProcesso();
      checkUserRole();
    }
  }, [id]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasControllerRole = roles?.some(r => r.role === 'controller' || r.role === 'admin');
      setIsController(!!hasControllerRole);
    } catch (error) {
      console.error('Erro ao verificar role:', error);
    }
  };

  const fetchProcesso = async () => {
    try {
      const { data, error } = await supabase
        .from('processos')
        .select(`
          *,
          tribunais(sigla, nome),
          comarcas(nome),
          grupos_acoes(nome),
          tipos_acao(nome)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setProcesso(data);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar processo',
        description: error.message,
        variant: 'destructive'
      });
      navigate('/controladoria');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'em_andamento': return 'default';
      case 'arquivado': return 'secondary';
      case 'suspenso': return 'outline';
      case 'conciliacao': return 'default';
      case 'sentenca': return 'default';
      case 'transito_julgado': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      em_andamento: 'Em Andamento',
      arquivado: 'Arquivado',
      suspenso: 'Suspenso',
      conciliacao: 'Conciliação',
      sentenca: 'Sentença',
      transito_julgado: 'Trânsito em Julgado'
    };
    return labels[status] || status;
  };

  const getPrioridadeLabel = (prioridade: string) => {
    const labels: Record<string, string> = {
      baixa: 'Baixa',
      normal: 'Normal',
      alta: 'Alta',
      urgente: 'Urgente'
    };
    return labels[prioridade] || prioridade;
  };

  const handleDeleteProcesso = async () => {
    if (!id) return;
    
    setDeleting(true);
    try {
      const { data, error } = await supabase
        .from('processos')
        .delete()
        .eq('id', id)
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: 'Processo excluído',
        description: 'O processo foi excluído com sucesso.',
      });

      navigate('/controladoria');
    } catch (error: any) {
      console.error('Erro ao excluir processo:', error);
      toast({
        title: 'Erro ao excluir processo',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAllMovimentacoes = async () => {
    if (!id) return;
    setDeletingMovimentacoes(true);
    try {
      const { error } = await supabase
        .from('processo_movimentacoes')
        .delete()
        .eq('processo_id', id);
      
      if (error) throw error;

      toast({
        title: 'Movimentações excluídas',
        description: 'Todas as movimentações foram excluídas com sucesso.',
      });
      fetchMovimentacoes();
    } catch (error: any) {
      console.error('Erro ao excluir movimentações:', error);
      toast({
        title: 'Erro ao excluir movimentações',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setDeletingMovimentacoes(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selecionados.size === 0) return;
    
    setDeletingMovimentacoes(true);
    try {
      const { error } = await supabase
        .from('processo_movimentacoes')
        .delete()
        .in('id', Array.from(selecionados));
      
      if (error) throw error;

      toast({
        title: 'Movimentações excluídas',
        description: `${selecionados.size} movimentação(ões) excluída(s) com sucesso.`,
      });
      setSelecionados(new Set());
      setModoSelecao(false);
      fetchMovimentacoes();
    } catch (error: any) {
      console.error('Erro ao excluir movimentações:', error);
      toast({
        title: 'Erro ao excluir movimentações',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setDeletingMovimentacoes(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout currentPage="controladoria">
        <div className="space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!processo) {
    return null;
  }

  return (
    <DashboardLayout currentPage="controladoria">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/controladoria')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{processo.numero_processo}</h1>
              <p className="text-muted-foreground mt-1">
                {processo.parte_ativa} vs {processo.parte_passiva}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate(`/controladoria/processo/${id}/editar`)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir o processo <strong>{processo.numero_processo}</strong>?
                    Esta ação não pode ser desfeita e todos os dados relacionados (movimentações, documentos, etc.) serão permanentemente removidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteProcesso}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir Processo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Tabs defaultValue="visao-geral" className="space-y-6">
          <TabsList>
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={getStatusBadgeVariant(processo.status)}>
                    {getStatusLabel(processo.status)}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Prioridade</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{getPrioridadeLabel(processo.prioridade)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Valor da Causa</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {processo.valor_causa 
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processo.valor_causa)
                      : 'Não informado'
                    }
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Informações do Processo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tribunal</p>
                    <p className="font-medium">
                      {processo.tribunal_nome || 
                       (processo.tribunais ? `${processo.tribunais.sigla} - ${processo.tribunais.nome}` : 'Não informado')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Comarca</p>
                    <p className="font-medium">
                      {processo.comarca_nome || processo.comarcas?.nome || 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Grupo de Ação</p>
                    <p className="font-medium">{processo.grupos_acoes?.nome || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Ação</p>
                    <p className="font-medium">
                      {processo.tipo_acao_nome || processo.tipos_acao?.nome || 'Não informado'}
                    </p>
                  </div>
                  {processo.data_distribuicao && (
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Distribuição</p>
                      <p className="font-medium">
                        {format(new Date(processo.data_distribuicao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                  {processo.prazo_proximo && (
                    <div>
                      <p className="text-sm text-muted-foreground">Próximo Prazo</p>
                      <p className="font-medium">
                        {format(new Date(processo.prazo_proximo), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>
                
                {processo.observacoes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Observações</p>
                    <p className="mt-2 whitespace-pre-wrap">{processo.observacoes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movimentacoes">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Movimentações
                      <Badge variant="outline">{movimentacoes.length}</Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                              <CalendarIcon className="h-4 w-4" />
                              {dateRange.from ? (
                                dateRange.to ? (
                                  <>
                                    {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                                  </>
                                ) : (
                                  format(dateRange.from, "dd/MM/yy")
                                )
                              ) : (
                                "Filtrar período"
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-auto max-w-[95vw] p-0" 
                            align="start"
                            sideOffset={8}
                          >
                            <div className="p-4 flex flex-row gap-4 justify-center">
                              <div className="space-y-2 w-[280px]">
                                <label className="text-sm font-semibold text-foreground">Data Inicial</label>
                                <Calendar
                                  mode="single"
                                  selected={dateRange.from}
                                  onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                                  initialFocus
                                  className="pointer-events-auto rounded-md border"
                                />
                              </div>
                              <div className="space-y-2 w-[280px]">
                                <label className="text-sm font-semibold text-foreground">Data Final</label>
                                <Calendar
                                  mode="single"
                                  selected={dateRange.to}
                                  onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                                  className="pointer-events-auto rounded-md border"
                                />
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        
                        {(dateRange.from || dateRange.to) && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setDateRange({})}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      {pendentes > 0 && (
                        <Badge variant="destructive" className="animate-pulse">
                          {pendentes} Pendente{pendentes > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {conferidos > 0 && (
                        <Badge variant="default" className="bg-green-600">
                          {conferidos} Conferido{conferidos > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {!modoSelecao && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setModoSelecao(true)}
                          disabled={movimentacoes.length === 0}
                        >
                          <CheckSquare className="h-4 w-4 mr-2" />
                          Selecionar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              disabled={movimentacoes.length === 0}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Apagar Todas
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja apagar TODAS as {movimentacoes.length} movimentações deste processo?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteAllMovimentacoes}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Apagar Todas
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                    
                    {modoSelecao && (
                      <>
                        <Badge variant="secondary">
                          {selecionados.size} selecionada(s)
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selecionados.size === movimentacoes.length) {
                              setSelecionados(new Set());
                            } else {
                              setSelecionados(new Set(movimentacoes.map(m => m.id)));
                            }
                          }}
                        >
                          {selecionados.size === movimentacoes.length ? 'Desmarcar' : 'Selecionar'} Todas
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteSelected}
                          disabled={selecionados.size === 0 || deletingMovimentacoes}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Apagar Selecionadas
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setModoSelecao(false);
                            setSelecionados(new Set());
                          }}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                    
                    <BuscarAndamentosPJE
                      processoId={processo.id}
                      numeroProcesso={processo.numero_processo}
                      tribunal={
                        processo.tribunais?.sigla || 
                        extrairTribunalDoNumeroProcesso(processo.numero_processo)
                      }
                      onComplete={fetchMovimentacoes}
                    />
                    {!processo.tribunais?.sigla && (
                      <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">
                        ⚠️ Tribunal extraído
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingMovimentacoes ? (
                  <div className="space-y-4">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                  </div>
                ) : movimentacoes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma movimentação registrada ainda.
                  </p>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-4">
                      {movimentacoes.map((movimentacao) => (
                        <MovimentacaoCard
                          key={movimentacao.id}
                          movimentacao={movimentacao}
                          onMarcarConferido={marcarConferido}
                          onMarcarRevisao={marcarEmRevisao}
                          isController={isController}
                          selectable={modoSelecao}
                          isSelected={selecionados.has(movimentacao.id)}
                          onSelect={(id) => {
                            const newSet = new Set(selecionados);
                            if (newSet.has(id)) {
                              newSet.delete(id);
                            } else {
                              newSet.add(id);
                            }
                            setSelecionados(newSet);
                          }}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Nenhum documento anexado ainda.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ControladoriaProcessoDetalhes;
