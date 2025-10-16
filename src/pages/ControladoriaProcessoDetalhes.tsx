import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Edit, FileText, History, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MovimentacaoCard from '@/components/Controladoria/MovimentacaoCard';
import { useProcessoMovimentacoes } from '@/hooks/useProcessoMovimentacoes';

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isController, setIsController] = useState(false);
  
  const { 
    movimentacoes, 
    loading: loadingMovimentacoes, 
    pendentes,
    conferidos,
    marcarConferido, 
    marcarEmRevisao 
  } = useProcessoMovimentacoes(id);

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
          <Button onClick={() => navigate(`/controladoria/processo/${id}/editar`)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
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
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Movimentações
                  </CardTitle>
                  <div className="flex items-center gap-2">
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
                  <div className="space-y-4">
                    {movimentacoes.map((movimentacao) => (
                      <MovimentacaoCard
                        key={movimentacao.id}
                        movimentacao={movimentacao}
                        onMarcarConferido={marcarConferido}
                        onMarcarRevisao={marcarEmRevisao}
                        isController={isController}
                      />
                    ))}
                  </div>
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
