 import { useState, useEffect } from "react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
 import { Search, Plus, User, Phone, Mail, Calendar, DollarSign, TrendingUp, Edit, Trash2, AlertCircle, Layout } from "lucide-react";
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
 } from '@/components/ui/alert-dialog';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { CaptacaoSheet } from "@/components/CRM/CaptacaoSheet";
 import { ClienteForm } from "@/components/CRM/ClienteForm";
 import { ClienteDetails } from "@/components/CRM/ClienteDetails";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { useToast } from "@/hooks/use-toast";
 import { useClientes } from "@/hooks/useClientes";
 import { Cliente as ClienteType } from "@/types/cliente";
 
 interface ClientHistory {
   id: string;
   actionType: string;
   title: string;
   description: string;
   createdAt: Date;
   projectName?: string;
 }
 
 export function CRMContent() {
   const { user } = useAuth();
   const { toast } = useToast();
   const { fetchClientes, deleteCliente } = useClientes();
   const [searchTerm, setSearchTerm] = useState("");
   const [statusFilter, setStatusFilter] = useState<string>('todos');
   const [activeTab, setActiveTab] = useState("clientes");
   const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
   const [selectedClientHistory, setSelectedClientHistory] = useState<ClientHistory[]>([]);
   const [selectedClientName, setSelectedClientName] = useState("");
   const [isLandingPagesDialogOpen, setIsLandingPagesDialogOpen] = useState(false);
   const [isClientFormOpen, setIsClientFormOpen] = useState(false);
   const [isClientDetailsOpen, setIsClientDetailsOpen] = useState(false);
   const [clientes, setClientes] = useState<ClienteType[]>([]);
   const [selectedCliente, setSelectedCliente] = useState<ClienteType | undefined>(undefined);
 
   useEffect(() => {
     loadClientes();
   }, []);
 
   const loadClientes = async () => {
     const data = await fetchClientes();
     setClientes(data);
   };
 
   const handleOpenNewCliente = () => {
     setSelectedCliente(undefined);
     setIsClientFormOpen(true);
   };
 
   const handleEditCliente = (cliente: ClienteType) => {
     setSelectedCliente(cliente);
     setIsClientFormOpen(true);
   };
 
   const handleViewCliente = (cliente: ClienteType) => {
     setSelectedCliente(cliente);
     setIsClientDetailsOpen(true);
   };
 
   const handleFormSuccess = () => {
     setIsClientFormOpen(false);
     setIsClientDetailsOpen(false);
     setSelectedCliente(undefined);
     loadClientes();
   };
 
   const handleDeleteCliente = async (clienteId: string, nomeCliente: string) => {
     const success = await deleteCliente(clienteId);
     
     if (success) {
       toast({
         title: "Cliente excluído com sucesso",
         description: `${nomeCliente} e todos os registros financeiros foram removidos.`,
       });
       loadClientes();
     }
   };
 
   const filteredClientes = clientes.filter(cliente => {
     const nome = cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || '';
     const email = cliente.email || '';
     const matchesSearch = nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
       email.toLowerCase().includes(searchTerm.toLowerCase());
     
     const matchesStatus = statusFilter === 'todos' || 
       (cliente.status_cliente || 'ativo') === statusFilter;
     
     return matchesSearch && matchesStatus;
   });
 
   const formatCurrency = (value?: number) => {
     if (!value) return 'R$ 0,00';
     return new Intl.NumberFormat('pt-BR', {
       style: 'currency',
       currency: 'BRL'
     }).format(value);
   };
 
   const totalClientes = clientes.length;
   const valorTotalContratos = clientes.reduce((acc, c) => acc + (c.valor_contrato || 0), 0);
 
   return (
     <div className="space-y-6">
       {/* Header */}
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-2xl font-bold text-foreground">CRM - Gestão de Clientes</h1>
           <p className="text-muted-foreground">Gerencie leads, prospects e clientes</p>
         </div>
         <div className="flex flex-wrap gap-3 justify-end">
           <Button variant="professional" className="gap-2" onClick={handleOpenNewCliente}>
             <Plus size={16} />
             Novo Cliente
           </Button>
           <Button 
             variant="default"
             className="gap-2"
             onClick={() => setIsLandingPagesDialogOpen(true)}
           >
             <Layout size={16} />
             LANDING PAGES
           </Button>
         </div>
       </div>
 
       {/* Métricas */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <Card className="border-0 shadow-card">
           <CardContent className="p-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
                 <p className="text-2xl font-bold text-foreground">{totalClientes}</p>
               </div>
               <div className="p-3 bg-law-blue/10 rounded-lg">
                <User className="h-6 w-6 text-primary" />
               </div>
             </div>
           </CardContent>
         </Card>
 
         <Card className="border-0 shadow-card">
           <CardContent className="p-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm font-medium text-muted-foreground">Valor Total (Contratos)</p>
                 <p className="text-2xl font-bold text-foreground">{formatCurrency(valorTotalContratos)}</p>
               </div>
               <div className="p-3 bg-green-500/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
               </div>
             </div>
           </CardContent>
         </Card>
 
         <Card className="border-0 shadow-card">
           <CardContent className="p-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm font-medium text-muted-foreground">Parcelados</p>
                 <p className="text-2xl font-bold text-foreground">
                   {clientes.filter(c => c.forma_pagamento === 'parcelado').length}
                 </p>
               </div>
               <div className="p-3 bg-orange-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
               </div>
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* Search */}
       <div className="flex gap-4 items-center flex-1">
         <div className="relative max-w-md flex-1">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
           <Input
             placeholder="Buscar clientes, emails, empresas..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="pl-10"
           />
         </div>
         
         <Select value={statusFilter} onValueChange={setStatusFilter}>
           <SelectTrigger className="w-[200px]">
             <SelectValue placeholder="Filtrar por status" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="todos">Todos</SelectItem>
             <SelectItem value="ativo">✅ Ativos</SelectItem>
             <SelectItem value="inativo">⏸️ Inativos</SelectItem>
             <SelectItem value="contrato_encerrado">🔒 Contrato Encerrado</SelectItem>
           </SelectContent>
         </Select>
       </div>
 
       {/* Tabs */}
       <Tabs value={activeTab} onValueChange={setActiveTab}>
         <TabsList className="grid w-full grid-cols-3">
           <TabsTrigger value="clientes">Clientes</TabsTrigger>
           <TabsTrigger value="captacao">CAPTAÇÃO</TabsTrigger>
           <TabsTrigger 
             value="whatsapp" 
             disabled 
             className="opacity-60 cursor-not-allowed"
           >
             WhatsApp Bot
             <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
               Em breve
             </Badge>
           </TabsTrigger>
         </TabsList>
 
         <TabsContent value="clientes" className="space-y-4">
           {filteredClientes.length === 0 ? (
             <Card className="p-8 text-center">
               <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
               <p className="text-muted-foreground">
                 {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado. Clique em "Novo Cliente" para começar.'}
               </p>
             </Card>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredClientes.map((cliente) => {
                 const nomeCliente = cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || 'Cliente';
                 return (
                   <Card 
                     key={cliente.id} 
                     className="shadow-card border-0 hover:shadow-elegant transition-all duration-200 cursor-pointer"
                     onClick={() => handleViewCliente(cliente)}
                   >
                     <CardHeader className="pb-4">
                       <div className="flex items-start justify-between">
                         <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <User className="h-5 w-5 text-primary" />
                           </div>
                           <div>
                             <div className="flex items-center gap-2">
                               <CardTitle className="text-lg font-semibold">{nomeCliente}</CardTitle>
                               <Badge 
                                 variant={
                                   (cliente.status_cliente || 'ativo') === 'ativo' ? 'default' :
                                   cliente.status_cliente === 'inativo' ? 'secondary' : 'outline'
                                 }
                                 className={
                                   cliente.status_cliente === 'contrato_encerrado' 
                                     ? 'bg-red-100 text-red-800 border-red-300' 
                                     : ''
                                 }
                               >
                                 {cliente.status_cliente === 'ativo' || !cliente.status_cliente ? '✅ Ativo' :
                                  cliente.status_cliente === 'inativo' ? '⏸️ Inativo' :
                                  '🔒 Encerrado'}
                               </Badge>
                             </div>
                             {cliente.email && (
                               <CardDescription className="flex items-center gap-1">
                                 <Mail className="h-3 w-3" />
                                 {cliente.email}
                               </CardDescription>
                             )}
                           </div>
                         </div>
                         <Badge variant={cliente.forma_pagamento === 'a_vista' ? 'default' : 'secondary'}>
                           {cliente.forma_pagamento === 'a_vista' ? 'À Vista' : 'Parcelado'}
                         </Badge>
                       </div>
                     </CardHeader>
 
                     <CardContent className="pt-0 space-y-3">
                       {cliente.telefone && (
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                           <Phone className="h-4 w-4" />
                           {cliente.telefone}
                         </div>
                       )}
 
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <DollarSign className="h-4 w-4" />
                         Contrato: {formatCurrency(cliente.valor_contrato)}
                       </div>
 
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <Calendar className="h-4 w-4" />
                         Fechamento: {format(new Date(cliente.data_fechamento), "dd/MM/yyyy", { locale: ptBR })}
                       </div>
 
                       {cliente.vendedor && (
                         <div className="pt-2 border-t">
                           <p className="text-xs text-muted-foreground">Vendedor: {cliente.vendedor}</p>
                         </div>
                       )}
 
                       <div className="flex gap-2 mt-3">
                         <Button 
                           variant="outline" 
                           size="sm"
                           onClick={(e) => {
                             e.stopPropagation();
                             handleEditCliente(cliente);
                           }}
                           className="text-xs flex-1"
                         >
                           <Edit className="h-3 w-3 mr-1" />
                           Editar
                         </Button>
                         
                         <AlertDialog>
                           <AlertDialogTrigger asChild>
                             <Button 
                               variant="outline" 
                               size="sm"
                               onClick={(e) => e.stopPropagation()}
                               className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                             >
                               <Trash2 className="h-3 w-3 mr-1" />
                               Excluir
                             </Button>
                           </AlertDialogTrigger>
                           <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                             <AlertDialogHeader>
                               <AlertDialogTitle className="flex items-center gap-2">
                                 <AlertCircle className="h-5 w-5 text-destructive" />
                                 ⚠️ Confirmar Exclusão
                               </AlertDialogTitle>
                               <AlertDialogDescription>
                                 Tem certeza que deseja excluir <strong>{nomeCliente}</strong>?
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Cancelar</AlertDialogCancel>
                               <AlertDialogAction 
                                 onClick={() => handleDeleteCliente(cliente.id, nomeCliente)}
                                 className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                               >
                                 Excluir
                               </AlertDialogAction>
                             </AlertDialogFooter>
                           </AlertDialogContent>
                         </AlertDialog>
                       </div>
                     </CardContent>
                   </Card>
                 );
               })}
             </div>
           )}
         </TabsContent>
 
         <TabsContent value="captacao">
           <CaptacaoSheet />
         </TabsContent>
       </Tabs>
 
       {/* Cliente Form Dialog */}
      <Dialog open={isClientFormOpen} onOpenChange={setIsClientFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCliente ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
          </DialogHeader>
          <ClienteForm
            cliente={selectedCliente}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsClientFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
 
       {/* Cliente Details */}
       {selectedCliente && (
        <Dialog open={isClientDetailsOpen} onOpenChange={setIsClientDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Cliente</DialogTitle>
            </DialogHeader>
            <ClienteDetails
              cliente={selectedCliente}
              onEdit={() => {
                setIsClientDetailsOpen(false);
                setIsClientFormOpen(true);
              }}
            />
          </DialogContent>
        </Dialog>
       )}
     </div>
   );
 }