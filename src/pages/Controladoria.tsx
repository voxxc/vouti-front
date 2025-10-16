import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, AlertCircle, Clock, CheckCircle, Search, Eye, RefreshCw } from "lucide-react";
import PJEProcessUpdater from "@/components/CRM/PJEProcessUpdater";
import AtualizadorAndamentos from "@/components/Controladoria/AtualizadorAndamentos";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Controladoria = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isPJEModalOpen, setIsPJEModalOpen] = useState(false);
  const [processos, setProcessos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total: 0,
    emAndamento: 0,
    arquivados: 0,
    suspensos: 0
  });

  useEffect(() => {
    fetchProcessos();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('processos-changes')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'processos'
        },
        (payload) => {
          // Remove o processo deletado da lista local
          setProcessos(prev => prev.filter(p => p.id !== payload.old.id));
          // Atualiza as métricas
          setMetrics(prev => ({
            ...prev,
            total: prev.total - 1,
            emAndamento: payload.old.status === 'em_andamento' ? prev.emAndamento - 1 : prev.emAndamento,
            arquivados: payload.old.status === 'arquivado' ? prev.arquivados - 1 : prev.arquivados,
            suspensos: payload.old.status === 'suspenso' ? prev.suspensos - 1 : prev.suspensos
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProcessos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('processos')
        .select(`
          *,
          tribunais(sigla),
          grupos_acoes(nome)
        `)
        .or(`created_by.eq.${user.id},advogado_responsavel_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProcessos(data || []);
      
      const total = data?.length || 0;
      const emAndamento = data?.filter(p => p.status === 'em_andamento').length || 0;
      const arquivados = data?.filter(p => p.status === 'arquivado').length || 0;
      const suspensos = data?.filter(p => p.status === 'suspenso').length || 0;

      setMetrics({ total, emAndamento, arquivados, suspensos });
    } catch (error) {
      console.error('Error fetching processos:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os processos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'em_andamento': return 'default';
      case 'arquivado': return 'secondary';
      case 'suspenso': return 'outline';
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

  return (
    <DashboardLayout currentPage="controladoria">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Controladoria</h1>
            <p className="text-muted-foreground mt-2">Gestão e controle de processos jurídicos</p>
          </div>
          <Button onClick={() => navigate('/controladoria/novo')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Processo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Processos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : metrics.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : metrics.emAndamento}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Arquivados</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : metrics.arquivados}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspensos</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : metrics.suspensos}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="processos" className="space-y-6">
          <TabsList>
            <TabsTrigger value="processos">Processos</TabsTrigger>
            <TabsTrigger value="atualizar">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Andamentos
            </TabsTrigger>
            <TabsTrigger value="push">PUSH - Busca Processos</TabsTrigger>
          </TabsList>

          <TabsContent value="processos">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Processos</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Carregando...</p>
                ) : processos.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum processo cadastrado</h3>
                    <p className="text-muted-foreground mb-4">
                      Comece cadastrando seu primeiro processo
                    </p>
                    <Button onClick={() => navigate('/controladoria/novo')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Processo
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número do Processo</TableHead>
                        <TableHead>Partes</TableHead>
                        <TableHead>Tribunal</TableHead>
                        <TableHead>Grupo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processos.map((processo) => (
                        <TableRow key={processo.id}>
                          <TableCell className="font-medium">{processo.numero_processo}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{processo.parte_ativa}</div>
                              <div className="text-muted-foreground">vs {processo.parte_passiva}</div>
                            </div>
                          </TableCell>
                          <TableCell>{processo.tribunais?.sigla || '-'}</TableCell>
                          <TableCell>{processo.grupos_acoes?.nome || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(processo.status)}>
                              {getStatusLabel(processo.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(processo.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/controladoria/processo/${processo.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="atualizar">
            <AtualizadorAndamentos onComplete={fetchProcessos} />
          </TabsContent>

          <TabsContent value="push">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Sistema PUSH - Atualização de Processos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Utilize o sistema PUSH para buscar e atualizar informações de processos no PJE.
                </p>
                <Button onClick={() => setIsPJEModalOpen(true)}>
                  <Search className="mr-2 h-4 w-4" />
                  Iniciar Busca PUSH
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <PJEProcessUpdater
        isOpen={isPJEModalOpen}
        onClose={() => setIsPJEModalOpen(false)}
        clientName=""
      />
    </DashboardLayout>
  );
};

export default Controladoria;
