 import { useState, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
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
   Calendar,
   Edit,
   AlertTriangle,
   Search,
   Filter,
   Receipt,
   UserCheck
 } from 'lucide-react';
 import { Cliente } from '@/types/cliente';
 import { toast } from 'sonner';
 import { useTenantNavigation } from '@/hooks/useTenantNavigation';
 import { differenceInDays, format } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { ClienteFinanceiroDialog } from '@/components/Financial/ClienteFinanceiroDialog';
 import { ColaboradoresTab } from '@/components/Financial/ColaboradoresTab';
 import { CustosTab } from '@/components/Financial/CustosTab';
 import { RelatorioFinanceiroModal } from '@/components/Financial/RelatorioFinanceiroModal';
 
 interface ClienteFinanceiro extends Cliente {
   status: 'adimplente' | 'inadimplente' | 'contrato_encerrado' | 'inativo';
   diasAtraso?: number;
   proximoVencimento?: Date;
 }
 
 export function FinancialContent() {
   const { navigate } = useTenantNavigation();
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
 
       const { data: userRoles } = await supabase
         .from('user_roles')
         .select('role')
         .eq('user_id', user.id);
 
       const isAdmin = userRoles?.some(r => r.role === 'admin');
       const isFinanceiro = userRoles?.some(r => r.role === 'financeiro');
       const hasFullAccess = isAdmin || isFinanceiro;
 
       let query = supabase
         .from('clientes')
         .select('*')
         .order('data_fechamento', { ascending: false });
 
       if (!hasFullAccess) {
         query = query.eq('user_id', user.id);
       }
 
       const { data, error } = await query;
 
       if (error) throw error;
 
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
 
       setParcelasPorClienteState(parcelasPorCliente);
 
       const clientesComStatus: ClienteFinanceiro[] = (data || []).map((cliente: any) => {
         const hoje = new Date();
         let status: 'adimplente' | 'inadimplente' | 'contrato_encerrado' | 'inativo' = 'adimplente';
         let diasAtraso = 0;
         let proximoVencimento: Date | undefined;
 
         const parcelas = parcelasPorCliente[cliente.id] || [];
 
         if (parcelas.length > 0) {
           const parcelasPagas = parcelas.filter(p => p.status === 'pago');
           const parcelasAtrasadas = parcelas.filter(p => p.status === 'atrasado');
           const parcelasPendentes = parcelas.filter(p => p.status === 'pendente');
           const parcelasParciais = parcelas.filter(p => p.status === 'parcial');
 
           if (parcelasPagas.length === parcelas.length) {
             status = 'contrato_encerrado';
           } else if (parcelasAtrasadas.length > 0) {
             const parcelaMaisAtrasada = parcelasAtrasadas.sort((a, b) => 
               new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
             )[0];
             diasAtraso = differenceInDays(hoje, new Date(parcelaMaisAtrasada.data_vencimento));
             
             if (diasAtraso > 60) {
               status = 'inativo';
             } else {
               status = 'inadimplente';
             }
           } else if (parcelasPendentes.length > 0 || parcelasParciais.length > 0) {
             status = 'adimplente';
             const proximaParcela = [...parcelasPendentes, ...parcelasParciais].sort((a, b) => 
               new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
             )[0];
             if (proximaParcela) {
               proximoVencimento = new Date(proximaParcela.data_vencimento);
             }
           }
         } else if (cliente.forma_pagamento === 'a_vista') {
           status = 'contrato_encerrado';
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
 
   const getNomeCliente = (cliente: Cliente) => {
     return cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || 'Sem nome';
   };
 
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
   
   const receitaMensal = Object.values(parcelasPorClienteState).flat()
     .filter(p => p.status === 'pendente' || p.status === 'parcial')
     .reduce((sum, p) => {
       return sum + (p.status === 'parcial' ? (p.saldo_restante || 0) : (p.valor_parcela || 0));
     }, 0);
   
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
 
   if (loading) {
     return (
       <div className="space-y-6">
         <Skeleton className="h-10 w-64" />
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {[...Array(4)].map((_, i) => (
             <Skeleton key={i} className="h-32" />
           ))}
         </div>
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
       {/* Header */}
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
           <p className="text-muted-foreground">Gestão financeira integrada com CRM</p>
         </div>
         <RelatorioFinanceiroModal />
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
             <p className="text-xs text-muted-foreground">Cadastrados</p>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Adimplentes</CardTitle>
             <TrendingUp className="h-4 w-4 text-primary" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-primary">{clientesAdimplentes}</div>
             <p className="text-xs text-muted-foreground">Em dia</p>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Inadimplentes</CardTitle>
             <AlertTriangle className="h-4 w-4 text-destructive" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-destructive">{clientesInadimplentes}</div>
             <p className="text-xs text-muted-foreground">Requer atenção</p>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
             <DollarSign className="h-4 w-4 text-primary" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{formatCurrency(receitaMensal)}</div>
             <p className="text-xs text-muted-foreground">Parcelas mensais</p>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
             <DollarSign className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{formatCurrency(receitaTotal)}</div>
             <p className="text-xs text-destructive">{formatCurrency(receitaPendente)} em atraso</p>
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
           <TabsTrigger value="clients" className="gap-2">
             <Users size={16} />
             Clientes ({clientesFiltrados.length})
           </TabsTrigger>
           <TabsTrigger value="colaboradores" className="gap-2">
             <UserCheck size={16} />
             Colaboradores
           </TabsTrigger>
           <TabsTrigger value="custos" className="gap-2">
             <Receipt size={16} />
             Custos
           </TabsTrigger>
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
                         <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                       </div>
                     </CardHeader>
                     <CardContent className="space-y-2">
                       <div className="flex items-center gap-2 text-sm">
                         <DollarSign className="h-4 w-4 text-muted-foreground" />
                         <span>{formatCurrency(cliente.valor_contrato)}</span>
                       </div>
                       {cliente.proximoVencimento && (
                         <div className="flex items-center gap-2 text-sm">
                           <Calendar className="h-4 w-4 text-muted-foreground" />
                           <span>Próximo: {format(cliente.proximoVencimento, 'dd/MM/yyyy', { locale: ptBR })}</span>
                         </div>
                       )}
                       {cliente.diasAtraso && (
                         <div className="flex items-center gap-2 text-sm text-destructive">
                           <AlertTriangle className="h-4 w-4" />
                           <span>{cliente.diasAtraso} dias em atraso</span>
                         </div>
                       )}
                       <Button 
                         variant="outline" 
                         size="sm" 
                         className="w-full mt-2"
                         onClick={() => {
                           setSelectedCliente(cliente);
                           setDialogOpen(true);
                         }}
                       >
                         <Edit className="h-4 w-4 mr-2" />
                         Ver Detalhes
                       </Button>
                     </CardContent>
                   </Card>
                 );
               })}
             </div>
           )}
         </TabsContent>
 
         <TabsContent value="colaboradores">
           <ColaboradoresTab />
         </TabsContent>
 
         <TabsContent value="custos">
           <CustosTab />
         </TabsContent>
       </Tabs>
 
       {/* Dialog de Detalhes do Cliente */}
       {selectedCliente && (
         <ClienteFinanceiroDialog
           cliente={selectedCliente}
           open={dialogOpen}
           onOpenChange={setDialogOpen}
           onUpdate={loadClientes}
         />
       )}
     </div>
   );
 }