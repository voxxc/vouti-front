import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  FileText, 
  Calendar,
  Download,
  Edit,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { Cliente } from '@/types/cliente';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { differenceInDays, format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';


interface ClienteFinanceiro extends Cliente {
  status: 'ativo' | 'inadimplente';
  diasAtraso?: number;
  proximoVencimento?: Date;
}

const Financial = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<ClienteFinanceiro[]>([]);
  const [loading, setLoading] = useState(true);

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

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', user.id)
        .order('data_fechamento', { ascending: false });

      if (error) throw error;

      const clientesComStatus: ClienteFinanceiro[] = (data || []).map((cliente: any) => {
        const hoje = new Date();
        let status: 'ativo' | 'inadimplente' = 'ativo';
        let diasAtraso = 0;
        let proximoVencimento: Date | undefined;

        if (cliente.forma_pagamento === 'parcelado' && cliente.dia_vencimento) {
          const diaVencimento = cliente.dia_vencimento;
          const mesAtual = hoje.getMonth();
          const anoAtual = hoje.getFullYear();
          
          let dataVencimento = new Date(anoAtual, mesAtual, diaVencimento);
          
          if (dataVencimento < hoje) {
            diasAtraso = differenceInDays(hoje, dataVencimento);
            if (diasAtraso > 5) {
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

  const clientesAtivos = clientes.filter(c => c.status === 'ativo').length;
  const clientesInadimplentes = clientes.filter(c => c.status === 'inadimplente').length;
  
  const receitaMensal = clientes
    .filter(c => c.status === 'ativo' && c.forma_pagamento === 'parcelado')
    .reduce((sum, c) => sum + (c.valor_parcela || 0), 0);
  
  const receitaPendente = clientes
    .filter(c => c.status === 'inadimplente')
    .reduce((sum, c) => sum + (c.valor_parcela || c.valor_contrato), 0);

  const receitaTotal = clientes.reduce((sum, c) => sum + c.valor_contrato, 0);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{clientesAtivos}</div>
              <p className="text-xs text-muted-foreground">
                Adimplentes
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

        {/* Main Content */}
        <Tabs defaultValue="clients" className="space-y-4">
          <TabsList>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
            <TabsTrigger value="contracts">Contratos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-4">
            {clientes.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
                  <p className="text-muted-foreground">Nenhum cliente cadastrado no CRM</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/crm')}
                  >
                    Ir para CRM
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientes.map((cliente) => (
                  <Card key={cliente.id} className={cliente.status === 'inadimplente' ? 'border-destructive' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{getNomeCliente(cliente)}</CardTitle>
                        <Badge 
                          variant={cliente.status === 'ativo' ? 'default' : 'destructive'}
                        >
                          {cliente.status === 'ativo' ? 'Ativo' : 'Inadimplente'}
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
                      
                      {cliente.forma_pagamento === 'parcelado' && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Parcela:</span>
                            <span className="font-medium">
                              {formatCurrency(cliente.valor_parcela || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Parcelas:</span>
                            <span className="text-sm">
                              {cliente.numero_parcelas}x
                            </span>
                          </div>
                          {cliente.proximoVencimento && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Próximo Venc.:</span>
                              <span className="text-sm">
                                {format(cliente.proximoVencimento, "dd/MM/yyyy")}
                              </span>
                            </div>
                          )}
                        </>
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
                        variant="outline" 
                        size="sm" 
                        className="w-full gap-2"
                        onClick={() => navigate('/crm')}
                      >
                        <Edit size={14} />
                        Ver no CRM
                      </Button>
                    </CardContent>
                  </Card>
                ))}
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
    </DashboardLayout>
  );
};

export default Financial;