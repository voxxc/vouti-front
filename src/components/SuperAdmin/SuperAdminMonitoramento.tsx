import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, AlertCircle, CheckCircle2, Activity, Loader2, XCircle, MinusCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProcessoDetalhe {
  numero_cnj: string;
  novos_andamentos: number;
  ultimo_andamento_data: string | null;
  status: 'atualizado' | 'sem_novos' | 'erro';
  erro?: string;
}

interface TenantResult {
  tenant_id: string;
  tenant_name: string;
  processos_verificados: number;
  processos_atualizados: number;
  novos_andamentos: number;
  processos_detalhes: ProcessoDetalhe[];
}

interface SyncResult {
  total_processos: number;
  processos_verificados: number;
  processos_atualizados: number;
  novos_andamentos: number;
  erros: string[];
  por_tenant: TenantResult[];
}

export function SuperAdminMonitoramento() {
  const [selectedTenant, setSelectedTenant] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('resumo');
  const [showOnlyUpdated, setShowOnlyUpdated] = useState(false);
  const queryClient = useQueryClient();

  // Fetch tenants for filter
  const { data: tenants } = useQuery({
    queryKey: ['super-admin-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch monitored processes stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['super-admin-monitoramento-stats', selectedTenant],
    queryFn: async () => {
      let query = supabase
        .from('processos_oab')
        .select('id, monitoramento_ativo, tracking_id, tenant_id', { count: 'exact' });

      if (selectedTenant !== 'all') {
        query = query.eq('tenant_id', selectedTenant);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const monitoradosAtivos = data?.filter(p => p.monitoramento_ativo && p.tracking_id).length || 0;
      const semTracking = data?.filter(p => p.monitoramento_ativo && !p.tracking_id).length || 0;

      return {
        total: count || 0,
        monitorados_ativos: monitoradosAtivos,
        sem_tracking: semTracking,
      };
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const body = selectedTenant !== 'all' ? { tenant_id: selectedTenant } : {};

      const response = await fetch(
        `https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/judit-sync-monitorados`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Sync failed');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Sincronização concluída',
        description: `${data.processos_verificados} processos verificados, ${data.novos_andamentos} novos andamentos`,
      });
      queryClient.invalidateQueries({ queryKey: ['super-admin-monitoramento-stats'] });
      // Switch to first tenant tab if we have results
      if (data.por_tenant.length > 0) {
        setActiveTab(data.por_tenant[0].tenant_id);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na sincronização',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const getStatusIcon = (status: ProcessoDetalhe['status']) => {
    switch (status) {
      case 'atualizado':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'sem_novos':
        return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
      case 'erro':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: ProcessoDetalhe['status']) => {
    switch (status) {
      case 'atualizado':
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Atualizado</Badge>;
      case 'sem_novos':
        return <Badge variant="secondary">Sem novos</Badge>;
      case 'erro':
        return <Badge variant="destructive">Erro</Badge>;
    }
  };

  const filterProcessos = (processos: ProcessoDetalhe[]) => {
    if (showOnlyUpdated) {
      return processos.filter(p => p.status === 'atualizado');
    }
    return processos;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Monitoramento de Processos</h2>
          <p className="text-muted-foreground">
            Sincronize atualizações de processos monitorados via API Judit
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedTenant} onValueChange={setSelectedTenant}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecionar tenant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tenants</SelectItem>
              {tenants?.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sincronizar Agora
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Processos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '-' : stats?.total || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              Monitoramento Ativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? '-' : stats?.monitorados_ativos || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Sem Tracking ID
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statsLoading ? '-' : stats?.sem_tracking || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Results with Tabs */}
      {syncMutation.data && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Resultado da Sincronização
                </CardTitle>
                <CardDescription>
                  {syncMutation.data.por_tenant.length} tenant(s) processado(s)
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={showOnlyUpdated ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowOnlyUpdated(!showOnlyUpdated)}
                >
                  {showOnlyUpdated ? 'Mostrar Todos' : 'Apenas Atualizados'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Global Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{syncMutation.data.total_processos}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{syncMutation.data.processos_verificados}</div>
                <div className="text-xs text-muted-foreground">Verificados</div>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {syncMutation.data.processos_atualizados}
                </div>
                <div className="text-xs text-muted-foreground">Atualizados</div>
              </div>
              <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {syncMutation.data.novos_andamentos}
                </div>
                <div className="text-xs text-muted-foreground">Novos Andamentos</div>
              </div>
            </div>

            {/* Tenant Tabs */}
            {syncMutation.data.por_tenant.length > 0 && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full flex flex-wrap h-auto gap-1 justify-start bg-muted/50 p-1">
                  <TabsTrigger value="resumo" className="text-xs">
                    Resumo
                  </TabsTrigger>
                  {syncMutation.data.por_tenant.map((tenant) => (
                    <TabsTrigger 
                      key={tenant.tenant_id} 
                      value={tenant.tenant_id}
                      className="text-xs"
                    >
                      {tenant.tenant_name}
                      {tenant.novos_andamentos > 0 && (
                        <Badge className="ml-1.5 h-5 px-1.5 bg-green-500 text-white">
                          {tenant.novos_andamentos}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="resumo" className="mt-4">
                  <div className="space-y-3">
                    {syncMutation.data.por_tenant.map((tenant) => (
                      <div 
                        key={tenant.tenant_id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setActiveTab(tenant.tenant_id)}
                      >
                        <div>
                          <p className="font-medium">{tenant.tenant_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {tenant.processos_verificados} processos verificados
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <p className="font-bold text-green-600">{tenant.processos_atualizados}</p>
                            <p className="text-xs text-muted-foreground">Atualizados</p>
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-blue-600">{tenant.novos_andamentos}</p>
                            <p className="text-xs text-muted-foreground">Novos</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {syncMutation.data.por_tenant.map((tenant) => (
                  <TabsContent key={tenant.tenant_id} value={tenant.tenant_id} className="mt-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">{tenant.tenant_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {tenant.processos_verificados} processos • {tenant.processos_atualizados} atualizados • {tenant.novos_andamentos} novos andamentos
                      </p>
                    </div>
                    
                    <ScrollArea className="h-[400px] rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">Status</TableHead>
                            <TableHead>Número CNJ</TableHead>
                            <TableHead className="text-center w-[100px]">Novos</TableHead>
                            <TableHead className="w-[180px]">Último Andamento</TableHead>
                            <TableHead className="w-[100px]">Situação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterProcessos(tenant.processos_detalhes).map((processo, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{getStatusIcon(processo.status)}</TableCell>
                              <TableCell className="font-mono text-sm">
                                {processo.numero_cnj}
                              </TableCell>
                              <TableCell className="text-center">
                                {processo.novos_andamentos > 0 ? (
                                  <Badge className="bg-green-500 text-white">
                                    +{processo.novos_andamentos}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(processo.ultimo_andamento_data)}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(processo.status)}
                              </TableCell>
                            </TableRow>
                          ))}
                          {filterProcessos(tenant.processos_detalhes).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                {showOnlyUpdated 
                                  ? 'Nenhum processo atualizado neste tenant'
                                  : 'Nenhum processo encontrado'
                                }
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            )}

            {/* Errors */}
            {syncMutation.data.erros.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-destructive mb-2">
                  Erros ({syncMutation.data.erros.length})
                </h4>
                <ScrollArea className="h-32 rounded border p-2">
                  {syncMutation.data.erros.map((erro, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground py-1">
                      {erro}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-sm">Como funciona?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            1. O sistema busca todos os processos com monitoramento ativo e tracking_id válido.
          </p>
          <p>
            2. Para cada processo, consulta a API Judit (GET /tracking) para obter o histórico.
          </p>
          <p>
            3. Busca os dados completos via GET /responses usando o request_id mais recente.
          </p>
          <p>
            4. Novos andamentos são inseridos com deduplicação automática.
          </p>
          <p className="text-xs pt-2 border-t">
            <strong>Nota:</strong> Esta sincronização manual complementa o webhook automático. 
            Use quando precisar forçar atualização ou verificar se há novos dados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
