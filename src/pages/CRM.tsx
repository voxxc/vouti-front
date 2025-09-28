import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Search, Plus, User, Phone, Mail, Calendar, Building, FileText, DollarSign, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";


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

interface Oportunidade {
  id: string;
  titulo: string;
  cliente: string;
  valor: number;
  probabilidade: number;
  estagio: 'qualificacao' | 'proposta' | 'negociacao' | 'fechamento';
  dataFechamento: Date;
  responsavel: string;
}

const CRM = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("clientes");
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedClientHistory, setSelectedClientHistory] = useState<ClientHistory[]>([]);
  const [selectedClientName, setSelectedClientName] = useState("");

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

  // Mock data - substituir por dados do Supabase
  const [clientes] = useState<Cliente[]>([
    {
      id: '1',
      nome: 'Maria Silva Santos',
      email: 'maria.santos@email.com',
      telefone: '(11) 99999-9999',
      empresa: 'Empresa ABC Ltda',
      status: 'cliente',
      valorPotencial: 15000,
      ultimoContato: new Date('2024-01-20'),
      proximoFollowUp: new Date('2024-02-15'),
      observacoes: 'Cliente interessado em consultoria trabalhista',
      origem: 'Indicação'
    },
    {
      id: '2',
      nome: 'João Pedro Oliveira',
      email: 'joao.oliveira@empresa.com',
      telefone: '(11) 88888-8888',
      empresa: 'Tech Solutions',
      status: 'prospecto',
      valorPotencial: 25000,
      ultimoContato: new Date('2024-01-25'),
      proximoFollowUp: new Date('2024-02-10'),
      observacoes: 'Interessado em regularização empresarial',
      origem: 'Site'
    },
    {
      id: '3',
      nome: 'Ana Carolina Costa',
      email: 'ana.costa@gmail.com',
      telefone: '(11) 77777-7777',
      status: 'lead',
      valorPotencial: 8000,
      ultimoContato: new Date('2024-01-28'),
      observacoes: 'Primeira consulta sobre divórcio',
      origem: 'Google Ads'
    }
  ]);

  const [oportunidades] = useState<Oportunidade[]>([
    {
      id: '1',
      titulo: 'Consultoria Trabalhista - Empresa ABC',
      cliente: 'Maria Silva Santos',
      valor: 15000,
      probabilidade: 80,
      estagio: 'negociacao',
      dataFechamento: new Date('2024-03-15'),
      responsavel: 'Dr. Eduardo Silva'
    },
    {
      id: '2',
      titulo: 'Regularização Empresarial - Tech Solutions',
      cliente: 'João Pedro Oliveira',
      valor: 25000,
      probabilidade: 60,
      estagio: 'proposta',
      dataFechamento: new Date('2024-04-20'),
      responsavel: 'Dra. Ana Costa'
    }
  ]);

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'lead': return 'bg-yellow-100 text-yellow-800';
      case 'prospecto': return 'bg-blue-100 text-blue-800';
      case 'cliente': return 'bg-green-100 text-green-800';
      case 'inativo': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstagioColor = (estagio: string) => {
    switch (estagio) {
      case 'qualificacao': return 'bg-orange-100 text-orange-800';
      case 'proposta': return 'bg-blue-100 text-blue-800';
      case 'negociacao': return 'bg-purple-100 text-purple-800';
      case 'fechamento': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalClientes = clientes.length;
  const clientesAtivos = clientes.filter(c => c.status === 'cliente').length;
  const valorPipeline = oportunidades.reduce((acc, opp) => acc + opp.valor, 0);
  const taxaConversao = totalClientes > 0 ? Math.round((clientesAtivos / totalClientes) * 100) : 0;

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
          <Button variant="professional" className="gap-2">
            <Plus size={16} />
            Novo Cliente
          </Button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <p className="text-sm font-medium text-muted-foreground">Clientes Ativos</p>
                  <p className="text-2xl font-bold text-foreground">{clientesAtivos}</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pipeline</p>
                  <p className="text-2xl font-bold text-foreground">
                    {valorPipeline.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taxa de Conversão</p>
                  <p className="text-2xl font-bold text-foreground">{taxaConversao}%</p>
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="oportunidades">Oportunidades</TabsTrigger>
          </TabsList>

          <TabsContent value="clientes" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClientes.map((cliente) => (
                <Card key={cliente.id} className="shadow-card border-0 hover:shadow-elegant transition-all duration-200 cursor-pointer">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-law-blue/10 rounded-lg">
                          <User className="h-5 w-5 text-law-blue" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold">{cliente.nome}</CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {cliente.email}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={getStatusColor(cliente.status)}>
                        {cliente.status.charAt(0).toUpperCase() + cliente.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {cliente.telefone}
                    </div>

                    {cliente.empresa && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building className="h-4 w-4" />
                        {cliente.empresa}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      Valor Potencial: {cliente.valorPotencial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Último contato: {format(cliente.ultimoContato, "dd/MM/yyyy", { locale: ptBR })}
                    </div>

                    {cliente.proximoFollowUp && (
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <Calendar className="h-4 w-4" />
                        Follow-up: {format(cliente.proximoFollowUp, "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    )}

                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Origem: {cliente.origem}</p>
                      {cliente.observacoes && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{cliente.observacoes}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openClientHistory(cliente.nome)}
                          className="text-xs"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Histórico
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="oportunidades" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {oportunidades.map((oportunidade) => (
                <Card key={oportunidade.id} className="shadow-card border-0 hover:shadow-elegant transition-all duration-200 cursor-pointer">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">{oportunidade.titulo}</CardTitle>
                        <CardDescription>{oportunidade.cliente}</CardDescription>
                      </div>
                      <Badge className={getEstagioColor(oportunidade.estagio)}>
                        {oportunidade.estagio.charAt(0).toUpperCase() + oportunidade.estagio.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-foreground">
                        {oportunidade.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span className="text-sm text-muted-foreground">{oportunidade.probabilidade}% prob.</span>
                    </div>

                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${oportunidade.probabilidade}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Fechamento previsto: {format(oportunidade.dataFechamento, "dd/MM/yyyy", { locale: ptBR })}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      Responsável: {oportunidade.responsavel}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

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
      </div>
    </DashboardLayout>
  );
};

export default CRM;