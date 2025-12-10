import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  FileText, 
  Calendar,
  Download,
  Edit,
  AlertTriangle,
  ArrowLeft,
  Search,
  Filter
} from 'lucide-react';
import { Cliente } from '@/types/cliente';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { differenceInDays, format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClienteFinanceiroDialog } from '@/components/Financial/ClienteFinanceiroDialog';


interface ClienteFinanceiro extends Cliente {
  status: 'adimplente' | 'inadimplente' | 'contrato_encerrado' | 'inativo';
  diasAtraso?: number;
  proximoVencimento?: Date;
}

const Financial = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<ClienteFinanceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState<ClienteFinanceiro | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [parcelasPorClienteState, setParcelasPorClienteState] = useState<Record<string, any[]>>({});

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Verificar se o usuário é admin
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      const isAdmin = !!userRole;

      // Query condicional: admins veem todos, usuários normais veem apenas seus clientes
      let query = supabase
        .from('clientes')
        .select('*')
        .order('data_fechamento', { ascending: false });

      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Buscar parcelas de todos os clientes
      const clienteIds = (data || []).map(c => c.id);
      const { data: parcelasData } = await supabase
        .from('cliente_parcelas')
        .select('*')
        .in('cliente_id', clienteIds);

      const parcelasPorCliente = (parcelasData || []).reduce((acc, parcela) => {
        if (!acc[parcela.cliente_id]) {
          acc[parcela.cliente_id] = [];
        }
        acc[parcela.cliente_id].push(parcela);
        return acc;
      }, {} as Record<string, any[]>);

      // Guardar parcelas para uso posterior
      setParcelasPorClienteState(parcelasPorCliente);

      const clientesComStatus: ClienteFinanceiro[] = (data || []).map((cliente: any) => {
        const hoje = new Date();
        let status: 'adimplente' | 'inadimplente' | 'contrato_encerrado' | 'inativo' = 'adimplente';
        let diasAtraso = 0;
        let proximoVencimento: Date | undefined;

        const parcelas = parcelasPorCliente[cliente.id] || [];

        // Verificar se tem parcelas
        if (parcelas.length > 0) {
          const parcelasPagas = parcelas.filter(p => p.status === 'pago');
          const parcelasAtrasadas = parcelas.filter(p => p.status === 'atrasado');
          const parcelasPendentes = parcelas.filter(p => p.status === 'pendente');

          // Contrato encerrado: todas parcelas pagas
          if (parcelasPagas.length === parcelas.length) {
            status = 'contrato_encerrado';
          }
          // Inadimplente: tem parcelas atrasadas
          else if (parcelasAtrasadas.length > 0) {
            const parcelaMaisAtrasada = parcelasAtrasadas.sort((a, b) => 
              new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
            )[0];
            diasAtraso = differenceInDays(hoje, new Date(parcelaMaisAtrasada.data_vencimento));
            
            // Inativo: mais de 60 dias em atraso
            if (diasAtraso > 60) {
              status = 'inativo';
            } else {
              status = 'inadimplente';
            }
          }
          // Adimplente: tem parcelas pendentes mas nenhuma atrasada
          else if (parcelasPendentes.length > 0) {
            status = 'adimplente';
            const proximaParcela = parcelasPendentes.sort((a, b) => 
              new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
            )[0];
            proximoVencimento = new Date(proximaParcela.data_vencimento);
          }
        } else if (cliente.forma_pagamento === 'a_vista') {
          // Cliente à vista é considerado encerrado após pagamento
          status = 'contrato_encerrado';
        } else if (cliente.forma_pagamento === 'parcelado' && cliente.dia_vencimento) {
          // Lógica antiga para clientes parcelados sem parcelas no sistema
          const diaVencimento = cliente.dia_vencimento;
          const mesAtual = hoje.getMonth();
          const anoAtual = hoje.getFullYear();
          
          let dataVencimento = new Date(anoAtual, mesAtual, diaVencimento);
          
          if (dataVencimento < hoje) {
            diasAtraso = differenceInDays(hoje, dataVencimento);
            if (diasAtraso > 60) {
              status = 'inativo';
            } else if (diasAtraso > 5) {
              status = 'inadimplente';
            }
            proximoVencimento = new Date(anoAtual, mesAtual + 1, diaVencimento);
          } else {
            proximoVencimento = dataVencimento;
          }
        }

        return {
          ...cliente,
          status,
          diasAtraso: diasAtraso > 0 ? diasAtraso : undefined,
          proximoVencimento
        };
      });

      setClientes(clientesComStatus);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar clientes
  const clientesFiltrados = clientes.filter((cliente) => {
    const matchesSearch = searchTerm === '' || 
      getNomeCliente(cliente).toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.telefone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'todos' || cliente.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const clientesAdimplentes = clientes.filter(c => c.status === 'adimplente').length;
  const clientesInadimplentes = clientes.filter(c => c.status === 'inadimplente').length;
  const clientesEncerrados = clientes.filter(c => c.status === 'contrato_encerrado').length;
  const clientesInativos = clientes.filter(c => c.status === 'inativo').length;
  
  // Calcular receita mensal usando dados reais das parcelas pendentes
  const receitaMensal = Object.values(parcelasPorClienteState).flat()
    .filter(p => p.status === 'pendente')
    .reduce((sum, p) => sum + (p.valor_parcela || 0), 0);
  
  const receitaPendente = Object.values(parcelasPorClienteState).flat()
    .filter(p => p.status === 'atrasado')
    .reduce((sum, p) => sum + (p.valor_parcela || 0), 0);

  const receitaTotal = clientes
    .filter(c => c.status !== 'inativo')
    .reduce((sum, c) => sum + c.valor_contrato, 0);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      adimplente: { variant: 'default', label: 'Adimplente' },
      inadimplente: { variant: 'destructive', label: 'Inadimplente' },
      contrato_encerrado: { variant: 'secondary', label: 'Encerrado' },
      inativo: { variant: 'outline', label: 'Inativo' },
    };
    return variants[status] || variants.adimplente;
  };

  const getNomeCliente = (cliente: Cliente) => {
    return cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || 'Sem nome';
  };

  if (loading) {
    return (
      <DashboardLayout currentPage="financial">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="financial">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft size={16} />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
              <p className="text-muted-foreground">Gestão financeira integrada com CRM</p>
            </div>
          </div>
          <Button variant="outline" className="gap-2">
            <Download size={16} />
            Exportar Relatório
          </Button>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientes.length}</div>
              <p className="text-xs text-muted-foreground">
                Cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Adimplentes</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{clientesAdimplentes}</div>
              <p className="text-xs text-muted-foreground">
                Em dia
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inadimplentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{clientesInadimplentes}</div>
              <p className="text-xs text-muted-foreground">
                Requer atenção
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(receitaMensal)}
              </div>
              <p className="text-xs text-muted-foreground">
                Parcelas mensais
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(receitaTotal)}
              </div>
              <p className="text-xs text-destructive">
                {formatCurrency(receitaPendente)} em atraso
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Pesquisa */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="adimplente">Adimplentes</SelectItem>
                <SelectItem value="inadimplente">Inadimplentes</SelectItem>
                <SelectItem value="contrato_encerrado">Contratos Encerrados</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="clients" className="space-y-4">
          <TabsList>
            <TabsTrigger value="clients">
              Clientes ({clientesFiltrados.length})
            </TabsTrigger>
            <TabsTrigger value="contracts">Contratos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-4">
            {clientesFiltrados.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'todos' 
                      ? 'Nenhum cliente encontrado com os filtros selecionados'
                      : 'Nenhum cliente cadastrado no CRM'}
                  </p>
                  {!searchTerm && statusFilter === 'todos' && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/crm')}
                    >
                      Ir para CRM
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientesFiltrados.map((cliente) => {
                  const statusConfig = getStatusBadge(cliente.status);
                  return (
                    <Card key={cliente.id} className={cliente.status === 'inadimplente' ? 'border-destructive' : ''}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{getNomeCliente(cliente)}</CardTitle>
                          <Badge variant={statusConfig.variant}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Valor Contrato:</span>
                        <span className="font-medium">
                          {formatCurrency(cliente.valor_contrato)}
                        </span>
                      </div>
                      
                      {cliente.forma_pagamento === 'parcelado' && (() => {
                        const parcelas = parcelasPorClienteState[cliente.id] || [];
                        const totalParcelas = parcelas.length;
                        const parcelasPagas = parcelas.filter(p => p.status === 'pago').length;
                        const valorMedioParcela = totalParcelas > 0 
                          ? parcelas.reduce((s, p) => s + p.valor_parcela, 0) / totalParcelas 
                          : 0;
                        return (
                          <>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Parcela:</span>
                              <span className="font-medium">
                                {formatCurrency(valorMedioParcela)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Parcelas:</span>
                              <span className="text-sm">
                                {parcelasPagas}/{totalParcelas} pagas
                              </span>
                            </div>
                          </>
                        );
                      })()}
                      {cliente.proximoVencimento && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Próximo Venc.:</span>
                          <span className="text-sm">
                            {format(cliente.proximoVencimento, "dd/MM/yyyy")}
                          </span>
                        </div>
                      )}
                      
                      {cliente.forma_pagamento === 'a_vista' && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Forma:</span>
                          <Badge variant="outline">À Vista</Badge>
                        </div>
                      )}

                      {cliente.diasAtraso && cliente.diasAtraso > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="text-xs text-destructive font-medium">
                            {cliente.diasAtraso} dias em atraso
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Data Fechamento:</span>
                        <span className="text-sm">
                          {format(new Date(cliente.data_fechamento), "dd/MM/yyyy")}
                        </span>
                      </div>

                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full gap-2"
                        onClick={() => {
                          setSelectedCliente(cliente);
                          setDialogOpen(true);
                        }}
                      >
                        <DollarSign size={14} />
                        Ver Detalhes Financeiros
                      </Button>
                    </CardContent>
                  </Card>
                );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="contracts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumo de Contratos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">À Vista</div>
                    <div className="text-2xl font-bold">
                      {clientes.filter(c => c.forma_pagamento === 'a_vista').length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(
                        clientes
                          .filter(c => c.forma_pagamento === 'a_vista')
                          .reduce((sum, c) => sum + c.valor_contrato, 0)
                      )}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Parcelado</div>
                    <div className="text-2xl font-bold">
                      {clientes.filter(c => c.forma_pagamento === 'parcelado').length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(receitaMensal)}/mês
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Total Geral</div>
                    <div className="text-2xl font-bold">
                      {clientes.length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(receitaTotal)}
                    </div>
                  </div>
                </div>
                <div className="text-center py-6 text-muted-foreground border-t">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Documentos contratuais disponíveis no CRM</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => navigate('/crm')}
                  >
                    Acessar Documentos no CRM
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Alterações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Histórico de ações financeiras será exibido aqui</p>
                  <p className="text-sm">Pagamentos, alterações de status, atualizações de valores</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ClienteFinanceiroDialog
        cliente={selectedCliente}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={loadClientes}
      />
    </DashboardLayout>
  );
};

export default Financial;