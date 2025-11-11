import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { checkIfUserIsAdminOrController } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, AlertCircle, Clock, CheckCircle, Eye, Bell, Activity } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import EscavadorDashboard from "@/components/Controladoria/EscavadorDashboard";
import { MonitoramentoStatusBadge } from "@/components/Controladoria/MonitoramentoStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Controladoria = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [processos, setProcessos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total: 0,
    emAndamento: 0,
    arquivados: 0,
    suspensos: 0,
    processosMonitorados: 0
  });
  const [filtroMonitoramento, setFiltroMonitoramento] = useState<'todos' | 'monitorados' | 'nao_monitorados'>('todos');

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

      // Verificar se o usuário é admin ou controller
      const isAdminUser = await checkIfUserIsAdminOrController(user.id);
      console.log('[Controladoria] User is admin/controller:', isAdminUser);

      let query = supabase
        .from('processos')
        .select(`
          *,
          tribunais(sigla),
          grupos_acoes(nome)
        `)
        .order('created_at', { ascending: false });

      // Se NÃO for admin/controller, filtrar por created_by ou advogado_responsavel
      if (!isAdminUser) {
        query = query.or(`created_by.eq.${user.id},advogado_responsavel_id.eq.${user.id}`);
      } else {
        console.log('[Controladoria] Admin access: fetching ALL processos');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Buscar monitoramento Escavador para cada processo
      const processosIds = (data || []).map(p => p.id);
      const { data: monitoramentoData } = await supabase
        .from('processo_monitoramento_escavador')
        .select('processo_id, monitoramento_ativo')
        .in('processo_id', processosIds);

      const monitoramentoMap = new Map(
        monitoramentoData?.map(m => [m.processo_id, m.monitoramento_ativo]) || []
      );

      const processosComMonitoramento = (data || []).map(p => ({
        ...p,
        monitoramento_ativo: monitoramentoMap.get(p.id) || false
      }));

      setProcessos(processosComMonitoramento);
      
      const total = data?.length || 0;
      const emAndamento = data?.filter(p => p.status === 'em_andamento').length || 0;
      const arquivados = data?.filter(p => p.status === 'arquivado').length || 0;
      const suspensos = data?.filter(p => p.status === 'suspenso').length || 0;
      const processosMonitorados = Array.from(monitoramentoMap.values()).filter(ativo => ativo).length;

      setMetrics({ total, emAndamento, arquivados, suspensos, processosMonitorados });
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monitorados (Escavador)</CardTitle>
              <Bell className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading ? "..." : metrics.processosMonitorados}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="processos" className="space-y-6">
          <TabsList>
            <TabsTrigger value="processos">Processos</TabsTrigger>
            <TabsTrigger value="monitoramento">
              <Bell className="h-4 w-4 mr-2" />
              Monitoramento Escavador
            </TabsTrigger>
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
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <Label>Filtrar por monitoramento:</Label>
                      <Select value={filtroMonitoramento} onValueChange={(v) => setFiltroMonitoramento(v as any)}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os processos</SelectItem>
                          <SelectItem value="monitorados">Monitorados</SelectItem>
                          <SelectItem value="nao_monitorados">Não Monitorados</SelectItem>
                        </SelectContent>
                      </Select>
                      {filtroMonitoramento !== 'todos' && (
                        <Badge variant="secondary">
                          {processos.filter(p => 
                            filtroMonitoramento === 'monitorados' ? p.monitoramento_ativo : !p.monitoramento_ativo
                          ).length} processo(s)
                        </Badge>
                      )}
                    </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número do Processo</TableHead>
                        <TableHead>Partes</TableHead>
                        <TableHead>Tribunal</TableHead>
                        <TableHead>Grupo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Monitoramento</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processos
                        .filter(p => {
                          if (filtroMonitoramento === 'monitorados') return p.monitoramento_ativo;
                          if (filtroMonitoramento === 'nao_monitorados') return !p.monitoramento_ativo;
                          return true;
                        })
                        .map((processo) => (
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
                            <MonitoramentoStatusBadge ativo={processo.monitoramento_ativo} size="sm" />
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
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoramento">
            <EscavadorDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Controladoria;
