import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, User, DollarSign, TrendingUp, Layout, Bot, MessageCircle } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { CaptacaoSheet } from "@/components/CRM/CaptacaoSheet";
import { ClientesLista } from "@/components/CRM/ClientesLista";
import WhatsAppBot from "@/components/CRM/WhatsAppBot";
import { useClientes } from "@/hooks/useClientes";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { Cliente as ClienteType } from "@/types/cliente";

const CRM = () => {
  const { tenantPath } = useTenantNavigation();
  const { fetchClientes } = useClientes();
  const { stopLoading, navigationId } = useNavigationLoading();
  const { isWhatsAppEnabled } = useTenantFeatures();
  const [activeTab, setActiveTab] = useState("clientes");
  const [isLandingPagesDialogOpen, setIsLandingPagesDialogOpen] = useState(false);
  const [clientes, setClientes] = useState<ClienteType[]>([]);

  useEffect(() => {
    const navId = navigationId;
    loadClientes().finally(() => {
      stopLoading(navId);
    });
  }, []);

  const loadClientes = async () => {
    const data = await fetchClientes();
    setClientes(data);
  };

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

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
                  <p className="text-2xl font-bold text-foreground">{totalClientes}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
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
                <div className="p-3 bg-primary/10 rounded-lg">
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
                <div className="p-3 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="captacao">CAPTAÇÃO</TabsTrigger>
            <TabsTrigger 
              value="whatsapp" 
              disabled={!isWhatsAppEnabled}
              className={!isWhatsAppEnabled ? "opacity-60 cursor-not-allowed" : ""}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              WhatsApp Bot
              {!isWhatsAppEnabled && (
                <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                  Em breve
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clientes" className="space-y-4">
            <ClientesLista 
              clientes={clientes}
              onClienteDeleted={loadClientes}
            />
          </TabsContent>

          <TabsContent value="captacao">
            <CaptacaoSheet />
          </TabsContent>

          <TabsContent value="whatsapp">
            {isWhatsAppEnabled ? (
              <WhatsAppBot />
            ) : (
              <Card className="border-dashed border-2 border-muted">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <div className="p-4 bg-muted/50 rounded-full">
                    <Bot className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      WhatsApp Bot - Em Desenvolvimento
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      Estamos trabalhando para trazer uma integração completa com WhatsApp Business. 
                      Em breve você poderá automatizar conversas, criar respostas automáticas e muito mais.
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-sm px-4 py-1">
                    🚧 Aguarde novidades
                  </Badge>
                </CardContent>
              </Card>
            )}
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
                    window.open(tenantPath('/landing-1'), '_blank');
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
                    window.open(tenantPath('/office'), '_blank');
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
      </div>
    </DashboardLayout>
  );
};

export default CRM;
