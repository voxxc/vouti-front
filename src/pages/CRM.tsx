import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Search, Plus, User, Phone, Mail, Calendar, Building, FileText, DollarSign, TrendingUp, Clock, CheckCircle2, Layout, Edit } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import WhatsAppBot from "@/components/CRM/WhatsAppBot";
import PJEProcessUpdater from "@/components/CRM/PJEProcessUpdater";
import { CaptacaoSheet } from "@/components/CRM/CaptacaoSheet";
import { ClienteForm } from "@/components/CRM/ClienteForm";
import { ClienteDetails } from "@/components/CRM/ClienteDetails";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useClientes } from "@/hooks/useClientes";
import { Cliente as ClienteType } from "@/types/cliente";


interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa?: string;
  status: 'lead' | 'prospecto' | 'cliente' | 'inativo';
  valorPotencial: number;
  ultimoContato: Date;
  proximoFollowUp?: Date;
  observacoes: string;
  origem: string;
}

interface ClientHistory {
  id: string;
  actionType: string;
  title: string;
  description: string;
  createdAt: Date;
  projectName?: string;
}


const CRM = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { fetchClientes } = useClientes();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("clientes");
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedClientHistory, setSelectedClientHistory] = useState<ClientHistory[]>([]);
  const [selectedClientName, setSelectedClientName] = useState("");
  const [isLandingPagesDialogOpen, setIsLandingPagesDialogOpen] = useState(false);
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [isClientDetailsOpen, setIsClientDetailsOpen] = useState(false);
  const [clientes, setClientes] = useState<ClienteType[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<ClienteType | undefined>(undefined);

  const fetchClientHistory = async (clientName: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('client_history')
        .select(`
          *,
          projects (name)
        `)
        .eq('client_name', clientName)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching client history:', error);
        return;
      }

      const mappedHistory: ClientHistory[] = (data || []).map(item => ({
        id: item.id,
        actionType: item.action_type,
        title: item.title,
        description: item.description || '',
        createdAt: new Date(item.created_at),
        projectName: item.projects?.name
      }));

      setSelectedClientHistory(mappedHistory);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const openClientHistory = async (clientName: string) => {
    setSelectedClientName(clientName);
    await fetchClientHistory(clientName);
    setIsHistoryDialogOpen(true);
  };


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
    loadClientes();
  };


  const filteredClientes = clientes.filter(cliente => {
    const nome = cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || '';
    const email = cliente.email || '';
    return nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());
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
    <DashboardLayout currentPage="crm">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => window.history.back()} className="gap-2">
              <ArrowLeft size={16} />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">CRM - Gestão de Clientes</h1>
              <p className="text-muted-foreground">Gerencie leads, prospects e clientes</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="professional" className="gap-2" onClick={handleOpenNewCliente}>
              <Plus size={16} />
              Novo Cliente
            </Button>
            <Button 
              variant="default"
              className="gap-2"
              title="Abrir lista de Landing Pages"
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
                  <User className="h-6 w-6 text-law-blue" />
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
                  <DollarSign className="h-6 w-6 text-green-600" />
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
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar clientes, emails, empresas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="captacao">CAPTAÇÃO</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp Bot</TabsTrigger>
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
                            <div className="p-2 bg-law-blue/10 rounded-lg">
                              <User className="h-5 w-5 text-law-blue" />
                            </div>
                            <div>
                              <CardTitle className="text-lg font-semibold">{nomeCliente}</CardTitle>
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

          <TabsContent value="whatsapp">
            <WhatsAppBot />
          </TabsContent>
        </Tabs>

        {/* Modal de Landing Pages */}
        <Dialog open={isLandingPagesDialogOpen} onOpenChange={setIsLandingPagesDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Selecione uma Landing Page</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => {
                    navigate('/landing-1');
                    setIsLandingPagesDialogOpen(false);
                  }}
                >
                  <Layout className="h-6 w-6" />
                  <span>Landing Page 1 - Agronegócio</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => {
                    navigate('/landing-2');
                    setIsLandingPagesDialogOpen(false);
                  }}
                >
                  <Layout className="h-6 w-6" />
                  <span>Landing Page 2 - Advocacia</span>
                </Button>
                {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <Button
                    key={num}
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    disabled
                  >
                    <Layout className="h-6 w-6" />
                    <span>Landing Page {num}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Modal de Histórico do Cliente */}
        <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[600px]">
            <DialogHeader>
              <DialogTitle>Histórico - {selectedClientName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {selectedClientHistory.length > 0 ? (
                selectedClientHistory.map((item) => (
                  <Card key={item.id} className="border border-muted">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {item.actionType === 'deadline_completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-blue-600" />
                          )}
                          <h4 className="font-medium text-sm">{item.title}</h4>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.actionType === 'deadline_completed' ? 'Prazo Concluído' : 'Ação'}
                        </Badge>
                      </div>
                      
                      {item.description && (
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        {item.projectName && (
                          <span>Projeto: {item.projectName}</span>
                        )}
                        <span>{format(item.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum histórico encontrado para este cliente</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Novo/Editar Cliente */}
        <Dialog open={isClientFormOpen} onOpenChange={setIsClientFormOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedCliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            </DialogHeader>
            <ClienteForm
              cliente={selectedCliente}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsClientFormOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog Detalhes do Cliente */}
        <Dialog open={isClientDetailsOpen} onOpenChange={setIsClientDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Cliente</DialogTitle>
            </DialogHeader>
            {selectedCliente && (
              <ClienteDetails
                cliente={selectedCliente}
                onEdit={() => {
                  setIsClientDetailsOpen(false);
                  setIsClientFormOpen(true);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
};

export default CRM;