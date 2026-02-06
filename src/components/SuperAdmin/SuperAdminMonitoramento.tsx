import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, AlertCircle, CheckCircle2, Activity, Loader2, XCircle, MinusCircle, 
  Copy, Search, Download, FileText, Clock 
} from 'lucide-react';
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
import { Input } from '@/components/ui/input';
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

interface ProcessoMonitorado {
  id: string;
  numero_cnj: string;
  tracking_id: string | null;
  tracking_request_id: string | null;
  tracking_request_data: string | null;
  detalhes_request_id: string | null;
  monitoramento_ativo: boolean;
  updated_at: string | null;
  tenant_id: string;
  tenant?: { name: string };
}

type FilterType = 'all' | 'with_request' | 'without_request';

export function SuperAdminMonitoramento() {
  const [selectedTenant, setSelectedTenant] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('processos');
  const [showOnlyUpdated, setShowOnlyUpdated] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchCnj, setSearchCnj] = useState('');
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

  // Fetch all monitored processes with details
  const { data: processosMonitorados, isLoading: processosLoading, refetch: refetchProcessos } = useQuery({
    queryKey: ['super-admin-processos-monitorados', selectedTenant],
    queryFn: async () => {
      let query = supabase
        .from('processos_oab')
        .select(`
          id, 
          numero_cnj, 
          tracking_id, 
          tracking_request_id,
          tracking_request_data,
          detalhes_request_id, 
          monitoramento_ativo,
          updated_at,
          tenant_id,
          tenant:tenants(name)
        `)
        .eq('monitoramento_ativo', true)
        .not('tracking_id', 'is', null)
        .order('updated_at', { ascending: false });

      if (selectedTenant !== 'all') {
        query = query.eq('tenant_id', selectedTenant);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProcessoMonitorado[];
    },
  });

  // Compute stats from processosMonitorados
  const stats = {
    total: processosMonitorados?.length || 0,
    comRequestId: processosMonitorados?.filter(p => p.tracking_request_id).length || 0,
    semRequestId: processosMonitorados?.filter(p => !p.tracking_request_id).length || 0,
  };

  // Filter processes based on filter type and search
  const filteredProcessos = processosMonitorados?.filter(p => {
    // Filter by request ID presence
    if (filterType === 'with_request' && !p.tracking_request_id) return false;
    if (filterType === 'without_request' && p.tracking_request_id) return false;
    
    // Filter by CNJ search
    if (searchCnj && !p.numero_cnj.includes(searchCnj)) return false;
    
    return true;
  }) || [];

  // Group processes by tenant for display
  const processosByTenant = filteredProcessos.reduce((acc, processo) => {
    const tenantName = processo.tenant?.name || 'Desconhecido';
    if (!acc[tenantName]) {
      acc[tenantName] = [];
    }
    acc[tenantName].push(processo);
    return acc;
  }, {} as Record<string, ProcessoMonitorado[]>);

  // Sync mutation (all processes)
  const syncMutation = useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const accessToken = refreshed.session?.access_token;
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const body = selectedTenant !== 'all' ? { tenant_id: selectedTenant } : {};

      const response = await fetch(
        `https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/judit-sync-monitorados`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
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
      queryClient.invalidateQueries({ queryKey: ['super-admin-processos-monitorados'] });
      setActiveTab('resultado');
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

  const copyToClipboard = (text: string | null, label: string) => {
    if (!text) {
      toast({ title: 'Nenhum ID para copiar', variant: 'destructive' });
      return;
    }
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado!` });
  };

  const truncateId = (id: string | null, length = 12) => {
    if (!id) return '-';
    return id.length > length ? `${id.substring(0, length)}...` : id;
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
            Gerencie e sincronize processos monitorados via API Judit
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
            Sincronizar Todos
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Total Monitorando
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {processosLoading ? '-' : stats.total}
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${filterType === 'with_request' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setFilterType(filterType === 'with_request' ? 'all' : 'with_request')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Com Request ID
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {processosLoading ? '-' : stats.comRequestId}
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${filterType === 'without_request' ? 'ring-2 ring-orange-500' : ''}`}
          onClick={() => setFilterType(filterType === 'without_request' ? 'all' : 'without_request')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Sem Request ID
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {processosLoading ? '-' : stats.semRequestId}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />
              Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(processosByTenant).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="processos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Processos Monitorados
          </TabsTrigger>
          {syncMutation.data && (
            <TabsTrigger value="resultado" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Último Resultado
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="processos" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Processos com Monitoramento Ativo</CardTitle>
                  <CardDescription>
                    {filteredProcessos.length} processo(s) encontrado(s)
                    {filterType !== 'all' && ` (filtro ativo)`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar CNJ..."
                      value={searchCnj}
                      onChange={(e) => setSearchCnj(e.target.value)}
                      className="pl-9 w-[200px]"
                    />
                  </div>
                  <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="with_request">Com Request ID</SelectItem>
                      <SelectItem value="without_request">Sem Request ID</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => refetchProcessos()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {Object.entries(processosByTenant).map(([tenantName, processos]) => (
                  <div key={tenantName} className="mb-6">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      {tenantName}
                      <Badge variant="secondary">{processos.length}</Badge>
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[220px]">Número CNJ</TableHead>
                          <TableHead className="w-[150px]">Tracking ID</TableHead>
                          <TableHead className="w-[150px]">Request ID (Tracking)</TableHead>
                          <TableHead className="w-[150px]">Request ID (Detalhes)</TableHead>
                          <TableHead className="w-[140px]">Último Sync</TableHead>
                          <TableHead className="w-[80px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {processos.map((processo) => (
                          <TableRow key={processo.id}>
                            <TableCell className="font-mono text-sm">
                              {processo.numero_cnj}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {truncateId(processo.tracking_id)}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(processo.tracking_id, 'Tracking ID')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              {processo.tracking_request_id ? (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-xs text-green-600">
                                    {truncateId(processo.tracking_request_id)}
                                  </span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => copyToClipboard(processo.tracking_request_id, 'Tracking Request ID')}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-orange-500 text-xs">Não sincronizado</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {processo.detalhes_request_id ? (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-xs text-blue-600">
                                    {truncateId(processo.detalhes_request_id)}
                                  </span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => copyToClipboard(processo.detalhes_request_id, 'Detalhes Request ID')}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {processo.tracking_request_data ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(processo.tracking_request_data)}
                                </div>
                              ) : processo.updated_at ? (
                                formatDate(processo.updated_at)
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Copiar todos os IDs
                                  const ids = {
                                    cnj: processo.numero_cnj,
                                    tracking_id: processo.tracking_id,
                                    tracking_request_id: processo.tracking_request_id,
                                    detalhes_request_id: processo.detalhes_request_id,
                                  };
                                  navigator.clipboard.writeText(JSON.stringify(ids, null, 2));
                                  toast({ title: 'IDs copiados!' });
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}

                {filteredProcessos.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    {processosLoading ? (
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    ) : (
                      <>
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum processo encontrado com os filtros atuais.</p>
                      </>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Result Tab */}
        {syncMutation.data && (
          <TabsContent value="resultado" className="mt-4">
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
                  <Button
                    variant={showOnlyUpdated ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setShowOnlyUpdated(!showOnlyUpdated)}
                  >
                    {showOnlyUpdated ? 'Mostrar Todos' : 'Apenas Atualizados'}
                  </Button>
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

                {/* Tenant Tabs for Results */}
                {syncMutation.data.por_tenant.length > 0 && (
                  <Tabs defaultValue={syncMutation.data.por_tenant[0]?.tenant_id} className="w-full">
                    <TabsList className="w-full flex flex-wrap h-auto gap-1 justify-start bg-muted/50 p-1">
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
                        <div key={idx} className="text-sm text-destructive py-1 border-b last:border-b-0">
                          {erro}
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
