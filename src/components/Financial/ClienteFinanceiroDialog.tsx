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
import { EditarParcelaDialog } from './EditarParcelaDialog';
import { ParcelaComentarios } from './ParcelaComentarios';
import { ParcelaHistorico } from './ParcelaHistorico';
import { CreateDividaDialog } from './CreateDividaDialog';
import { DividaContent } from './DividaContent';
import { ParcelaCard } from './ParcelaCard';
import { ClienteParcela, DadosBaixaPagamento } from '@/types/financeiro';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, AlertCircle, AlertTriangle, DollarSign, Calendar, TrendingUp, FileText, Plus, FileText as FileIcon, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn, formatCurrency } from '@/lib/utils';

interface ClienteFinanceiroDialogProps {
  cliente: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  embedded?: boolean;
}

export const ClienteFinanceiroDialog = ({
  cliente,
  open,
  onOpenChange,
  onUpdate,
  embedded = false,
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
  const [editarParcelaDadosOpen, setEditarParcelaDadosOpen] = useState(false);
  const [parcelaParaEditarDados, setParcelaParaEditarDados] = useState<ClienteParcela | null>(null);
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
  const parcelasParciais = parcelas.filter((p) => p.status === 'parcial');

  // Usar valor_pago quando disponível para parcelas pagas e parciais
  const totalPago = [...parcelasPagas, ...parcelasParciais].reduce(
    (acc, p) => acc + Number(p.valor_pago ?? 0), 0
  );
  
  // Pendente inclui parcelas atrasadas, pendentes e o saldo restante das parciais
  const totalPendente = [...parcelasAtrasadas, ...parcelasPendentes].reduce(
    (acc, p) => acc + Number(p.valor_parcela), 0
  ) + parcelasParciais.reduce(
    (acc, p) => acc + Number(p.saldo_restante ?? 0), 0
  );
  
  const progressoPagamento = parcelas.length > 0 
    ? ((parcelasPagas.length + parcelasParciais.length * 0.5) / parcelas.length) * 100 
    : 0;

  // formatCurrency agora é importado de @/lib/utils

  // Função para calcular juros e multa de uma parcela atrasada
  const calcularValorAtualizado = (parcela: ClienteParcela) => {
    const valorOriginal = Number(parcela.valor_parcela);
    const dataVencimento = new Date(parcela.data_vencimento);
    const hoje = new Date();
    
    // Se não estiver atrasada ou não tiver configuração de juros/multa, retorna valor original
    if (dataVencimento >= hoje || parcela.status === 'pago') {
      return { valorOriginal, multa: 0, juros: 0, valorAtualizado: valorOriginal, mesesAtraso: 0 };
    }

    // Calcular meses de atraso
    const diffTime = Math.abs(hoje.getTime() - dataVencimento.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const mesesAtraso = Math.max(1, Math.ceil(diffDays / 30)); // Mínimo 1 mês

    let multa = 0;
    let juros = 0;

    // Calcular multa (fixa)
    if (cliente.aplicar_multa && cliente.taxa_multa) {
      multa = valorOriginal * (Number(cliente.taxa_multa) / 100);
    }

    // Calcular juros compostos mensais
    if (cliente.aplicar_juros && cliente.taxa_juros_mensal) {
      const taxaMensal = Number(cliente.taxa_juros_mensal) / 100;
      juros = valorOriginal * (Math.pow(1 + taxaMensal, mesesAtraso) - 1);
    }

    const valorAtualizado = valorOriginal + multa + juros;

    return { valorOriginal, multa, juros, valorAtualizado, mesesAtraso };
  };

  const getNomeCliente = (cliente: any) => {
    return cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || 'Cliente';
  };

  // getStatusBadge movido para ParcelaCard

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

  const handleEditarParcelaDados = (parcela: ClienteParcela) => {
    setParcelaParaEditarDados(parcela);
    setEditarParcelaDadosOpen(true);
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

  // Conteúdo interno compartilhado
  const renderContent = () => (
    <>
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

          <ScrollArea className={embedded ? "flex-1 pr-4" : "flex-1 h-[calc(90vh-200px)] pr-4"}>
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
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Total Pago</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totalPago)}</p>
                    <p className="text-xs text-muted-foreground">{parcelasPagas.length} parcelas</p>
                  </div>

                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Pendente</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(totalPendente)}</p>
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
                    <div className="space-y-2">
                      {parcelas.map((parcela, index) => {
                        const isProximoVencimento = parcela.status === 'pendente' && 
                          index === parcelas.findIndex(p => p.status === 'pendente');
                        
                        return (
                          <ParcelaCard
                            key={parcela.id}
                            parcela={parcela}
                            isProximoVencimento={isProximoVencimento}
                            isExpanded={selectedParcelaForComments === parcela.id}
                            showJurosMulta={cliente.aplicar_juros || cliente.aplicar_multa}
                            calcularValorAtualizado={calcularValorAtualizado}
                            onToggleDetails={() => setSelectedParcelaForComments(
                              selectedParcelaForComments === parcela.id ? null : parcela.id
                            )}
                            onDarBaixa={() => handleDarBaixa(parcela)}
                            onEditarParcela={() => handleEditarParcelaDados(parcela)}
                            onEditarPagamento={() => handleEditarParcela(parcela)}
                            onReabrirPagamento={() => handleReabrirParcela(parcela.id)}
                          >
                            {/* Histórico de Pagamentos */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                  <History className="h-4 w-4" />
                                  Histórico de Pagamentos
                                </h4>
                                <ParcelaHistorico 
                                  parcelaId={parcela.id} 
                                  onExcluirPagamento={async (historicoId, valorPago) => {
                                    const parcelaAtual = parcelas.find(p => p.id === parcela.id);
                                    if (!parcelaAtual) return false;

                                    const valorPagoAtual = parcelaAtual.valor_pago || 0;
                                    const novoValorPago = Math.max(0, valorPagoAtual - valorPago);
                                    const novoSaldoRestante = parcelaAtual.valor_parcela - novoValorPago;

                                    let novoStatus: string;
                                    if (novoValorPago <= 0) {
                                      novoStatus = new Date(parcelaAtual.data_vencimento) < new Date() ? 'atrasado' : 'pendente';
                                    } else {
                                      novoStatus = 'parcial';
                                    }

                                    const { error: updateError } = await supabase
                                      .from('cliente_parcelas')
                                      .update({
                                        valor_pago: novoValorPago > 0 ? novoValorPago : null,
                                        saldo_restante: novoSaldoRestante,
                                        status: novoStatus,
                                        ...(novoValorPago <= 0 && {
                                          data_pagamento: null,
                                          metodo_pagamento: null,
                                        })
                                      })
                                      .eq('id', parcela.id);

                                    if (updateError) return false;

                                    const { error: deleteError } = await supabase
                                      .from('cliente_pagamento_comentarios')
                                      .delete()
                                      .eq('id', historicoId);

                                    if (deleteError) return false;

                                    const { data: { user } } = await supabase.auth.getUser();
                                    if (user) {
                                      const { data: profile } = await supabase
                                        .from('profiles')
                                        .select('tenant_id')
                                        .eq('user_id', user.id)
                                        .maybeSingle();
                                        
                                      await supabase
                                        .from('cliente_pagamento_comentarios')
                                        .insert({
                                          parcela_id: parcela.id,
                                          user_id: user.id,
                                          comentario: `Pagamento de ${formatCurrency(valorPago)} excluído`,
                                          tenant_id: profile?.tenant_id
                                        });
                                    }

                                    await fetchParcelas();
                                    onUpdate();
                                    return true;
                                  }}
                                  onHistoricoChange={() => {
                                    fetchParcelas();
                                    onUpdate();
                                  }}
                                />
                              </div>
                              
                              {/* Comentários */}
                              <div>
                                <ParcelaComentarios
                                  parcelaId={parcela.id}
                                  currentUserId={currentUserId}
                                />
                              </div>
                            </div>
                          </ParcelaCard>
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
    </>
  );

  // Dialogs compartilhados
  const renderDialogs = () => (
    <>
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

      <EditarParcelaDialog
        parcela={parcelaParaEditarDados}
        open={editarParcelaDadosOpen}
        onOpenChange={setEditarParcelaDadosOpen}
        onSuccess={handleEditarSuccess}
      />
    </>
  );

  // Modo embedded: renderiza apenas o conteúdo
  if (embedded) {
    return (
      <>
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Contrato: {formatCurrency(cliente.valor_contrato)}
            </p>
            {cliente.forma_pagamento === 'parcelado' && 
             cliente.data_vencimento_inicial && 
             cliente.data_vencimento_final && (
              <p className="text-xs text-muted-foreground">
                <strong>Período:</strong> {format(new Date(cliente.data_vencimento_inicial), 'dd/MM/yyyy')}
                {' até '}
                {format(new Date(cliente.data_vencimento_final), 'dd/MM/yyyy')}
              </p>
            )}
          </div>
          {renderContent()}
        </div>
        {renderDialogs()}
      </>
    );
  }

  // Modo Dialog: renderiza com wrapper Dialog
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
          {renderContent()}
        </DialogContent>
      </Dialog>
      {renderDialogs()}
    </>
  );
};
