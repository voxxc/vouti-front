import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClienteParcelas } from '@/hooks/useClienteParcelas';
import { BaixaPagamentoDialog } from './BaixaPagamentoDialog';
import { EditarPagamentoDialog } from './EditarPagamentoDialog';
import { EditarParcelaDialog } from './EditarParcelaDialog';
import { ParcelaComentarios } from './ParcelaComentarios';
import { ParcelaHistorico } from './ParcelaHistorico';
import { ParcelaCard } from './ParcelaCard';
import { ClienteDivida, ClienteParcela, DadosBaixaPagamento } from '@/types/financeiro';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, DollarSign, Calendar, TrendingUp, Trash2, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
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

interface DividaContentProps {
  divida: ClienteDivida;
  clienteId: string;
  onUpdate: () => void;
  onDelete: (dividaId: string) => Promise<void>;
}

export const DividaContent = ({ divida, clienteId, onUpdate, onDelete }: DividaContentProps) => {
  const { parcelas, loading, darBaixaParcela, reabrirParcela, fetchParcelas } = useClienteParcelas(clienteId, divida.id);
  const [selectedParcela, setSelectedParcela] = useState<ClienteParcela | null>(null);
  const [baixaDialogOpen, setBaixaDialogOpen] = useState(false);
  const [selectedParcelaForComments, setSelectedParcelaForComments] = useState<string | null>(null);
  const [editarPagamentoOpen, setEditarPagamentoOpen] = useState(false);
  const [parcelaParaEditar, setParcelaParaEditar] = useState<ClienteParcela | null>(null);
  const [editarParcelaDadosOpen, setEditarParcelaDadosOpen] = useState(false);
  const [parcelaParaEditarDados, setParcelaParaEditarDados] = useState<ClienteParcela | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

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

  const handleDeleteDivida = async () => {
    setIsDeleting(true);
    try {
      await onDelete(divida.id);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <>
      <ScrollArea className="h-[calc(90vh-150px)] pr-4">
        <div className="space-y-6 py-4 pb-6">
        {/* Header com título da dívida e botão de exclusão */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-xl font-bold">{divida.titulo}</h2>
            <p className="text-sm text-muted-foreground">
              Criada em {format(new Date(divida.created_at), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? 'Excluindo...' : 'Excluir Dívida'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>⚠️ Confirmar Exclusão de Dívida</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>Tem certeza que deseja excluir a dívida <strong>"{divida.titulo}"</strong>?</p>
                  
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                    <p className="font-semibold text-destructive">⚠️ Esta ação é IRREVERSÍVEL e causará:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Exclusão de todas as <strong>{divida.numero_parcelas} parcelas</strong></li>
                      <li>Remoção de todo o histórico de pagamentos</li>
                      <li>Perda de todos os comentários associados</li>
                      <li><strong>Notificação automática por email</strong> para os administradores</li>
                    </ul>
                  </div>
                  
                  <p className="text-sm">Deseja realmente continuar?</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteDivida}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Excluindo...' : 'Sim, Excluir Dívida'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Informações da Dívida */}
        {divida.descricao && (
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground">{divida.descricao}</p>
          </div>
        )}

        {/* Barra de progresso temporal */}
        {divida.data_inicio && divida.data_vencimento_final && (
          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Início: {format(new Date(divida.data_inicio), 'MMM/yyyy', { locale: ptBR })}</span>
              <span>Fim: {format(new Date(divida.data_vencimento_final), 'MMM/yyyy', { locale: ptBR })}</span>
            </div>
            <Progress value={progressoPagamento} className="h-2" />
          </div>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Valor Total</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(divida.valor_total)}</p>
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
            Parcelas
          </h3>

          {parcelas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma parcela encontrada.
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
      </ScrollArea>

      <BaixaPagamentoDialog
        parcela={selectedParcela}
        open={baixaDialogOpen}
        onOpenChange={setBaixaDialogOpen}
        onConfirm={handleConfirmBaixa}
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
};
