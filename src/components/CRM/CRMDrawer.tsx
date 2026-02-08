import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, ArrowLeft, Loader2, User, DollarSign, TrendingUp } from "lucide-react";
import { CRMContent } from "./CRMContent";
import { ClienteDetails } from "./ClienteDetails";
import { ClienteForm } from "./ClienteForm";
import { useClientes } from "@/hooks/useClientes";
import { Cliente } from "@/types/cliente";

interface CRMDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DrawerView = 'lista' | 'detalhes' | 'novo';

export function CRMDrawer({ open, onOpenChange }: CRMDrawerProps) {
  const [view, setView] = useState<DrawerView>('lista');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loadingCliente, setLoadingCliente] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  
  // Estados para criar projeto vinculado
  const [criarProjeto, setCriarProjeto] = useState(false);
  const [nomeProjeto, setNomeProjeto] = useState('');
  
  const { fetchClienteById, fetchClientes, loading } = useClientes();

  // Carregar clientes ao abrir drawer
  useEffect(() => {
    if (open) {
      loadClientes();
    }
  }, [open]);

  const loadClientes = async () => {
    const data = await fetchClientes();
    setClientes(data);
  };

  // Resetar view ao fechar drawer
  useEffect(() => {
    if (!open) {
      setView('lista');
      setSelectedClienteId(null);
      setIsEditing(false);
      setCliente(null);
      setCriarProjeto(false);
      setNomeProjeto('');
    }
  }, [open]);

  // Carregar cliente quando selecionado
  useEffect(() => {
    if (selectedClienteId && view === 'detalhes') {
      setLoadingCliente(true);
      fetchClienteById(selectedClienteId)
        .then(data => {
          setCliente(data);
        })
        .finally(() => setLoadingCliente(false));
    }
  }, [selectedClienteId, view]);

  const handleViewCliente = (clienteId: string) => {
    setSelectedClienteId(clienteId);
    setView('detalhes');
    setIsEditing(false);
  };

  const handleNewCliente = () => {
    setView('novo');
    setIsEditing(false);
    setCriarProjeto(false);
    setNomeProjeto('');
  };

  const handleBack = () => {
    setView('lista');
    setSelectedClienteId(null);
    setIsEditing(false);
    setCliente(null);
    setCriarProjeto(false);
    setNomeProjeto('');
  };

  const handleFormSuccess = async () => {
    // Atualizar lista de clientes
    await loadClientes();
    
    if (view === 'novo') {
      handleBack();
    } else if (view === 'detalhes' && selectedClienteId) {
      // Recarregar dados do cliente após edição
      setIsEditing(false);
      const updated = await fetchClienteById(selectedClienteId);
      setCliente(updated);
    }
  };

  const getHeaderTitle = () => {
    if (view === 'lista') return 'Clientes';
    if (view === 'novo') return 'Novo Cliente';
    if (view === 'detalhes' && isEditing) return 'Editar Cliente';
    if (view === 'detalhes' && cliente) {
      return cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || 'Cliente';
    }
    return 'Cliente';
  };

  // Calcular métricas
  const totalClientes = clientes.length;
  const valorTotalContratos = clientes.reduce((acc, c) => acc + (c.valor_contrato || 0), 0);
  const totalParcelados = clientes.filter(c => (c.numero_parcelas || 0) > 1).length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent 
        side="inset"
        className="p-0 flex flex-col"
      >
        <SheetTitle className="sr-only">CRM - {getHeaderTitle()}</SheetTitle>
        
        {/* Header dinâmico */}
        <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
          {view !== 'lista' && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Users className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">{getHeaderTitle()}</span>
        </div>

        {/* Conteúdo scrollável */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {/* View: Lista de clientes */}
            {view === 'lista' && (
              <div className="space-y-6">
                {/* Cards de Métricas */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                        <p className="text-2xl font-bold">{totalClientes}</p>
                      </div>
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Contratos</p>
                        <p className="text-lg font-bold">{formatCurrency(valorTotalContratos)}</p>
                      </div>
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Parcelados</p>
                        <p className="text-2xl font-bold">{totalParcelados}</p>
                      </div>
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                  </Card>
                </div>

                {/* Conteúdo CRM */}
                <CRMContent 
                  onViewCliente={handleViewCliente}
                  onNewCliente={handleNewCliente}
                  clientes={clientes}
                  onRefresh={loadClientes}
                />
              </div>
            )}
            
            {/* View: Novo cliente */}
            {view === 'novo' && (
              <ClienteForm
                onSuccess={handleFormSuccess}
                onCancel={handleBack}
                showCreateProject={true}
                criarProjeto={criarProjeto}
                setCriarProjeto={setCriarProjeto}
                nomeProjeto={nomeProjeto}
                setNomeProjeto={setNomeProjeto}
              />
            )}
            
            {/* View: Detalhes - Loading */}
            {view === 'detalhes' && loadingCliente && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {/* View: Detalhes - Visualização */}
            {view === 'detalhes' && cliente && !loadingCliente && !isEditing && (
              <ClienteDetails
                cliente={cliente}
                onEdit={() => setIsEditing(true)}
              />
            )}
            
            {/* View: Detalhes - Edição */}
            {view === 'detalhes' && cliente && !loadingCliente && isEditing && (
              <ClienteForm
                cliente={cliente}
                onSuccess={handleFormSuccess}
                onCancel={() => setIsEditing(false)}
              />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
