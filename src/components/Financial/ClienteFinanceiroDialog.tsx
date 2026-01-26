import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useClienteParcelas } from '@/hooks/useClienteParcelas';
import { useClienteDividas } from '@/hooks/useClienteDividas';
import { BaixaPagamentoDialog } from './BaixaPagamentoDialog';
import { EditarPagamentoDialog } from './EditarPagamentoDialog';
import { ParcelaComentarios } from './ParcelaComentarios';
import { CreateDividaDialog } from './CreateDividaDialog';
import { DividaContent } from './DividaContent';
import { ClienteParcela, DadosBaixaPagamento } from '@/types/financeiro';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, AlertCircle, DollarSign, Calendar, TrendingUp, FileText, Plus, FileText as FileIcon, MoreVertical, RotateCcw, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ClienteFinanceiroDialogProps {
  cliente: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const ClienteFinanceiroDialog = ({
  cliente,
  open,
  onOpenChange,
  onUpdate,
}: ClienteFinanceiroDialogProps) => {
  // Hook para parcelas do contrato original (sem divida_id)
  const { parcelas, loading, darBaixaParcela, reabrirParcela, fetchParcelas } = useClienteParcelas(
    cliente?.id || null,
    null // null significa buscar apenas parcelas sem divida_id (contrato original)
  );
  
  // Hook para dívidas adicionais
  const { dividas, loading: dividasLoading, createDivida, deleteDivida, fetchDividas } = useClienteDividas(
    cliente?.id || null
  );

  const [selectedParcela, setSelectedParcela] = useState<ClienteParcela | null>(null);
  const [baixaDialogOpen, setBaixaDialogOpen] = useState(false);
  const [createDividaOpen, setCreateDividaOpen] = useState(false);
  const [selectedParcelaForComments, setSelectedParcelaForComments] = useState<string | null>(null);
  const [editarPagamentoOpen, setEditarPagamentoOpen] = useState(false);
  const [parcelaParaEditar, setParcelaParaEditar] = useState<ClienteParcela | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  if (!cliente) return null;

  const parcelasPagas = parcelas.filter((p) => p.status === 'pago');
  const parcelasAtrasadas = parcelas.filter((p) => p.status === 'atrasado');
  const parcelasPendentes = parcelas.filter((p) => p.status === 'pendente');

  // Usar valor_pago quando disponível, senão usar valor_parcela
  const totalPago = parcelasPagas.reduce((acc, p) => acc + Number(p.valor_pago ?? p.valor_parcela), 0);
  const totalPendente = [...parcelasAtrasadas, ...parcelasPendentes].reduce(
    (acc, p) => acc + Number(p.valor_parcela),
    0
  );
  const progressoPagamento = parcelas.length > 0 
    ? (parcelasPagas.length / parcelas.length) * 100 
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getNomeCliente = (cliente: any) => {
    return cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || 'Cliente';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      pago: { variant: 'default', icon: CheckCircle2, label: 'Pago' },
      pendente: { variant: 'secondary', icon: Clock, label: 'Pendente' },
      atrasado: { variant: 'destructive', icon: AlertCircle, label: 'Atrasado' },
    };

    const config = variants[status] || variants.pendente;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const handleDarBaixa = (parcela: ClienteParcela) => {
    setSelectedParcela(parcela);
    setBaixaDialogOpen(true);
  };

  const handleConfirmBaixa = async (dados: DadosBaixaPagamento) => {
    if (!selectedParcela) return false;
    
    const success = await darBaixaParcela(selectedParcela.id, dados);
    if (success) {
      await fetchParcelas();
      onUpdate();
    }
    return success;
  };

  const handleReabrirParcela = async (parcelaId: string) => {
    const success = await reabrirParcela(parcelaId);
    if (success) {
      onUpdate();
    }
  };

  const handleEditarParcela = (parcela: ClienteParcela) => {
    setParcelaParaEditar(parcela);
    setEditarPagamentoOpen(true);
  };

  const handleEditarSuccess = async () => {
    await fetchParcelas();
    onUpdate();
  };

  const handleCreateDivida = async (dados: any) => {
    const success = await createDivida(dados);
    if (success) {
      await fetchDividas();
      onUpdate();
    }
    return success;
  };

  const handleDividaUpdate = async () => {
    await fetchDividas();
    onUpdate();
  };

  const handleDeleteDivida = async (dividaId: string) => {
    try {
      const divida = dividas.find(d => d.id === dividaId);
      if (!divida) return;

      const success = await deleteDivida(dividaId);
      if (!success) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.functions.invoke('notify-divida-deleted', {
          body: {
            cliente_id: cliente.id,
            cliente_nome: getNomeCliente(cliente),
            divida_titulo: divida.titulo,
            divida_valor: divida.valor_total,
            deleted_by_user_id: user?.id,
          },
        });
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
      }

      await fetchDividas();
      onUpdate();
    } catch (error) {
      console.error('Erro ao excluir dívida:', error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Detalhes Financeiros - {getNomeCliente(cliente)}
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-1">
                <p>Contrato: {formatCurrency(cliente.valor_contrato)}</p>
                
                {cliente.forma_pagamento === 'parcelado' && 
                 cliente.data_vencimento_inicial && 
                 cliente.data_vencimento_final && (
                  <p className="text-sm">
                    <strong>Período:</strong> {format(new Date(cliente.data_vencimento_inicial), 'dd/MM/yyyy')}
                    {' até '}
                    {format(new Date(cliente.data_vencimento_final), 'dd/MM/yyyy')}
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          {loading || dividasLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="contratual" className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="contratual" className="gap-2">
                    <FileIcon className="w-4 h-4" />
                    Contratual
                  </TabsTrigger>
                  {dividas.map((divida) => (
                    <TabsTrigger key={divida.id} value={divida.id} className="gap-2">
                      <DollarSign className="w-4 h-4" />
                      {divida.titulo}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCreateDividaOpen(true)}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Nova Dívida
                </Button>
              </div>

              <ScrollArea className="flex-1 h-[calc(90vh-200px)] pr-4">
                <TabsContent value="contratual" className="mt-0">
                  <div className="space-y-6">
                    {/* Barra de progresso temporal do contrato */}
                    {cliente.data_vencimento_inicial && cliente.data_vencimento_final && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-muted-foreground mb-2">
                          <span>Início: {format(new Date(cliente.data_vencimento_inicial), 'MMM/yyyy', { locale: ptBR })}</span>
                          <span>Fim: {format(new Date(cliente.data_vencimento_final), 'MMM/yyyy', { locale: ptBR })}</span>
                        </div>
                        <Progress value={progressoPagamento} className="h-2" />
                      </div>
                    )}

                    {/* Estatísticas Gerais */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Valor Total</span>
                        </div>
                        <p className="text-2xl font-bold">{formatCurrency(cliente.valor_contrato)}</p>
                      </div>

                      <div className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-muted-foreground">Total Pago</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPago)}</p>
                        <p className="text-xs text-muted-foreground">{parcelasPagas.length} parcelas</p>
                      </div>

                      <div className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm text-muted-foreground">Pendente</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPendente)}</p>
                        <p className="text-xs text-muted-foreground">{parcelasPendentes.length + parcelasAtrasadas.length} parcelas</p>
                      </div>

                      <div className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Progresso</span>
                        </div>
                        <p className="text-2xl font-bold">{progressoPagamento.toFixed(0)}%</p>
                        <Progress value={progressoPagamento} className="mt-2 h-2" />
                      </div>
                    </div>

                    <Separator />

                    {/* Timeline de Parcelas */}
                    <div>
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Histórico de Parcelas
                      </h3>

                      {parcelas.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhuma parcela encontrada. Cliente com pagamento à vista.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {parcelas.map((parcela, index) => {
                            const isProximoVencimento = parcela.status === 'pendente' && 
                              index === parcelas.findIndex(p => p.status === 'pendente');
                            
                            return (
                              <div
                                key={parcela.id}
                                className={cn(
                                  "p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors relative",
                                  isProximoVencimento && "border-primary bg-primary/5"
                                )}
                              >
                                {isProximoVencimento && (
                                  <Badge variant="default" className="absolute -top-2 -right-2">
                                    Próximo Vencimento
                                  </Badge>
                                )}
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold">Parcela #{parcela.numero_parcela}</span>
                                    {getStatusBadge(parcela.status)}
                                  </div>

                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Valor</p>
                                      <p className="font-semibold">{formatCurrency(Number(parcela.valor_parcela))}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Vencimento</p>
                                      <p className="font-medium">
                                        {format(new Date(parcela.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                                      </p>
                                    </div>
                                    {parcela.data_pagamento && (
                                      <>
                                        <div>
                                          <p className="text-muted-foreground">Pago em</p>
                                          <p className="font-medium text-green-600">
                                            {format(new Date(parcela.data_pagamento), 'dd/MM/yyyy', { locale: ptBR })}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground">Método</p>
                                          <p className="font-medium">{parcela.metodo_pagamento}</p>
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  {parcela.observacoes && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                      <FileText className="w-3 h-3 inline mr-1" />
                                      {parcela.observacoes}
                                    </p>
                                  )}

                                  {parcela.comprovante_url && (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="p-0 h-auto"
                                      onClick={() => window.open(parcela.comprovante_url, '_blank')}
                                    >
                                      Ver comprovante
                                    </Button>
                                  )}
                                </div>

                                <div className="flex flex-col gap-2">
                                  {(parcela.status === 'pendente' || parcela.status === 'atrasado') && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleDarBaixa(parcela)}
                                      variant={parcela.status === 'atrasado' ? 'destructive' : 'default'}
                                    >
                                      Dar Baixa
                                    </Button>
                                  )}
                                  
                                  {parcela.status === 'pago' && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="bg-background border">
                                        <DropdownMenuItem 
                                          onClick={() => handleEditarParcela(parcela)}
                                          className="gap-2 cursor-pointer"
                                        >
                                          <Edit className="h-4 w-4" />
                                          Editar Pagamento
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => handleReabrirParcela(parcela.id)}
                                          className="gap-2 cursor-pointer text-destructive"
                                        >
                                          <RotateCcw className="h-4 w-4" />
                                          Reabrir Pagamento
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                  
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedParcelaForComments(
                                      selectedParcelaForComments === parcela.id ? null : parcela.id
                                    )}
                                  >
                                    {selectedParcelaForComments === parcela.id ? 'Ocultar' : 'Comentários'}
                                  </Button>
                                </div>
                              </div>

                              {selectedParcelaForComments === parcela.id && (
                                <div className="mt-4 pt-4 border-t">
                                  <ParcelaComentarios
                                    parcelaId={parcela.id}
                                    currentUserId={currentUserId}
                                  />
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {dividas.map((divida) => (
                  <TabsContent key={divida.id} value={divida.id} className="mt-0">
                    <DividaContent
                      divida={divida}
                      clienteId={cliente.id}
                      onUpdate={handleDividaUpdate}
                      onDelete={handleDeleteDivida}
                    />
                  </TabsContent>
                ))}
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <BaixaPagamentoDialog
        parcela={selectedParcela}
        open={baixaDialogOpen}
        onOpenChange={setBaixaDialogOpen}
        onConfirm={handleConfirmBaixa}
      />

      <CreateDividaDialog
        open={createDividaOpen}
        onOpenChange={setCreateDividaOpen}
        onConfirm={handleCreateDivida}
      />

      <EditarPagamentoDialog
        parcela={parcelaParaEditar}
        open={editarPagamentoOpen}
        onOpenChange={setEditarPagamentoOpen}
        onSuccess={handleEditarSuccess}
      />
    </>
  );
};
