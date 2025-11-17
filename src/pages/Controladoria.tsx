import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { checkIfUserIsAdminOrController } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Eye, BarChart, Bell, FileSearch, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MonitoramentoJuditBadge } from "@/components/Controladoria/MonitoramentoJuditBadge";
import { AndamentosDrawer } from "@/components/Controladoria/AndamentosDrawer";
import { useMonitoramentoJudit } from "@/hooks/useMonitoramentoJudit";
import { BuscarPorOABTab } from "@/components/Controladoria/BuscarPorOABTab";

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
    monitorados: 0,
    novosAndamentos: 0
  });
  const [monitoramentos, setMonitoramentos] = useState<Record<string, any>>({});
  const [andamentosNaoLidos, setAndamentosNaoLidos] = useState<Record<string, number>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState<any>(null);
  const { toggleMonitoramento, ativando } = useMonitoramentoJudit();

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
          setProcessos(prev => prev.filter(p => p.id !== payload.old.id));
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

      const isAdminUser = await checkIfUserIsAdminOrController(user.id);

      let query = supabase
        .from('processos')
        .select(`
          *,
          tribunais(sigla),
          grupos_acoes(nome)
        `)
        .order('created_at', { ascending: false });

      if (!isAdminUser) {
        query = query.or(`created_by.eq.${user.id},advogado_responsavel_id.eq.${user.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setProcessos(data || []);
      
      // Buscar monitoramentos
      if (data && data.length > 0) {
        const { data: monitoramentosData } = await supabase
          .from('processo_monitoramento_judit')
          .select('*')
          .in('processo_id', data.map(p => p.id));

        const monitoramentosMap: Record<string, any> = {};
        (monitoramentosData || []).forEach(m => {
          monitoramentosMap[m.processo_id] = m;
        });
        setMonitoramentos(monitoramentosMap);

        // Buscar andamentos não lidos
        const { data: andamentosData } = await supabase
          .from('processo_andamentos_judit')
          .select('processo_id, lida')
          .in('processo_id', data.map(p => p.id))
          .eq('lida', false);

        const naoLidosMap: Record<string, number> = {};
        (andamentosData || []).forEach(a => {
          naoLidosMap[a.processo_id] = (naoLidosMap[a.processo_id] || 0) + 1;
        });
        setAndamentosNaoLidos(naoLidosMap);

        const monitorados = Object.values(monitoramentosMap).filter(m => m.monitoramento_ativo).length;
        const novosAndamentos = Object.values(naoLidosMap).reduce((acc, val) => acc + val, 0);
        
        setMetrics({ 
          total: data.length,
          emAndamento: data.filter(p => p.status === 'em_andamento').length,
          arquivados: data.filter(p => p.status === 'arquivado').length,
          suspensos: data.filter(p => p.status === 'suspenso').length,
          monitorados,
          novosAndamentos
        });
      }
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

  const handleToggleMonitoramento = async (processo: any) => {
    const success = await toggleMonitoramento(processo);
    if (success) {
      await fetchProcessos();
    }
  };

  const handleVerAndamentos = (processo: any) => {
    setSelectedProcesso(processo);
    setDrawerOpen(true);
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
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : metrics.emAndamento}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processos Monitorados</CardTitle>
              <Bell className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : metrics.monitorados}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Novos Andamentos</CardTitle>
              <FileSearch className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : metrics.novosAndamentos}</div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Processos</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="processos">
                <TabsList>
                  <TabsTrigger value="processos">Todos os Processos</TabsTrigger>
                  <TabsTrigger value="buscar-oab">
                    <Search className="mr-2 h-4 w-4" />
                    Buscar por OAB
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="buscar-oab">
                  <BuscarPorOABTab />
                </TabsContent>
                <TabsContent value="processos" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número do Processo</TableHead>
                        <TableHead>Partes</TableHead>
                        <TableHead>Tribunal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Monitoramento</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processos.map((processo) => {
                        const monitoramento = monitoramentos[processo.id];
                        const naoLidos = andamentosNaoLidos[processo.id] || 0;
                        
                        return (
                          <TableRow key={processo.id}>
                            <TableCell className="font-medium">{processo.numero_processo}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{processo.parte_ativa}</div>
                                <div className="text-muted-foreground">vs {processo.parte_passiva}</div>
                              </div>
                            </TableCell>
                            <TableCell>{processo.tribunais?.sigla || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(processo.status)}>
                                {getStatusLabel(processo.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={monitoramento?.monitoramento_ativo || false}
                                    onCheckedChange={() => handleToggleMonitoramento(processo)}
                                    disabled={ativando === processo.id}
                                  />
                                  <MonitoramentoJuditBadge 
                                    ativo={monitoramento?.monitoramento_ativo || false}
                                    size="sm"
                                  />
                                </div>
                                {monitoramento && (
                                  <div className="text-xs text-muted-foreground">
                                    {monitoramento.total_movimentacoes || 0} andamentos
                                    {naoLidos > 0 && (
                                      <Badge variant="destructive" className="ml-2 text-xs">
                                        {naoLidos} novos
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                {monitoramento && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleVerAndamentos(processo)}
                                  >
                                    <FileSearch className="h-4 w-4 mr-2" />
                                    Andamentos
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => navigate(`/controladoria/processo/${processo.id}`)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Visualizar
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <AndamentosDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          processo={selectedProcesso}
        />
      </div>
    </DashboardLayout>
  );
};

export default Controladoria;
