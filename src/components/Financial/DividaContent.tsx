import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useClienteParcelas } from '@/hooks/useClienteParcelas';
import { BaixaPagamentoDialog } from './BaixaPagamentoDialog';
import { EditarPagamentoDialog } from './EditarPagamentoDialog';
import { EditarParcelaDialog } from './EditarParcelaDialog';
import { ParcelaComentarios } from './ParcelaComentarios';
import { ParcelaHistorico } from './ParcelaHistorico';
import { ClienteDivida, ClienteParcela, DadosBaixaPagamento } from '@/types/financeiro';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, AlertCircle, AlertTriangle, DollarSign, Calendar, TrendingUp, FileText, Trash2, MoreVertical, RotateCcw, Edit, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
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
  const [selectedParcelaForHistory, setSelectedParcelaForHistory] = useState<string | null>(null);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string; className?: string }> = {
      pago: { variant: 'default', icon: CheckCircle2, label: 'Pago' },
      pendente: { variant: 'secondary', icon: Clock, label: 'Pendente' },
      atrasado: { variant: 'destructive', icon: AlertCircle, label: 'Atrasado' },
      parcial: { variant: 'outline', icon: AlertTriangle, label: 'Parcial', className: 'bg-amber-500/20 text-amber-700 border-amber-500' },
    };

    const config = variants[status] || variants.pendente;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={cn("gap-1", config.className)}>
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
                          <button 
                            className="font-semibold hover:underline text-left"
                            onClick={() => setSelectedParcelaForComments(
                              selectedParcelaForComments === parcela.id ? null : parcela.id
                            )}
                          >
                            Parcela #{parcela.numero_parcela}
                          </button>
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
                                <p className="font-medium text-primary">
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

                        {/* Mostrar saldo em aberto para parcelas parciais */}
                        {parcela.status === 'parcial' && (
                          <div className="mt-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="w-4 h-4" />
                              <div className="text-sm">
                                <p className="font-medium">
                                  Saldo em aberto: {formatCurrency(Number(parcela.saldo_restante ?? 0))}
                                </p>
                                <p className="text-xs opacity-80">
                                  Já pago: {formatCurrency(Number(parcela.valor_pago ?? 0))}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Botão Histórico para parcelas pagas ou parciais */}
                        {(parcela.status === 'pago' || parcela.status === 'parcial') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedParcelaForHistory(
                              selectedParcelaForHistory === parcela.id ? null : parcela.id
                            )}
                          >
                            <History className="h-3 w-3" />
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedParcelaForComments(
                            selectedParcelaForComments === parcela.id ? null : parcela.id
                          )}
                        >
                          {selectedParcelaForComments === parcela.id ? 'Ocultar' : 'Comentários'}
                        </Button>

                        {/* Menu de 3 pontinhos unificado para todas as parcelas */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border">
                            {/* Dar baixa - para pendente, atrasado, parcial */}
                            {(parcela.status === 'pendente' || parcela.status === 'atrasado' || parcela.status === 'parcial') && (
                              <DropdownMenuItem 
                                onClick={() => handleDarBaixa(parcela)}
                                className="gap-2 cursor-pointer"
                              >
                                <DollarSign className="h-4 w-4" />
                                {parcela.status === 'parcial' ? 'Completar Pagamento' : 'Dar Baixa'}
                              </DropdownMenuItem>
                            )}
                            
                            {/* Editar parcela - sempre disponível */}
                            <DropdownMenuItem 
                              onClick={() => handleEditarParcelaDados(parcela)}
                              className="gap-2 cursor-pointer"
                            >
                              <Edit className="h-4 w-4" />
                              Editar Parcela
                            </DropdownMenuItem>
                            
                            {/* Editar pagamento - para pago e parcial */}
                            {(parcela.status === 'pago' || parcela.status === 'parcial') && (
                              <DropdownMenuItem 
                                onClick={() => handleEditarParcela(parcela)}
                                className="gap-2 cursor-pointer"
                              >
                                <FileText className="h-4 w-4" />
                                Editar Pagamento
                              </DropdownMenuItem>
                            )}
                            
                            {/* Reabrir - apenas para pago */}
                            {parcela.status === 'pago' && (
                              <DropdownMenuItem 
                                onClick={() => handleReabrirParcela(parcela.id)}
                                className="gap-2 cursor-pointer text-destructive"
                              >
                                <RotateCcw className="h-4 w-4" />
                                Reabrir Pagamento
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Área expandível de Histórico */}
                    {selectedParcelaForHistory === parcela.id && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <History className="h-4 w-4" />
                          Histórico de Pagamentos
                        </h4>
                        <ParcelaHistorico parcelaId={parcela.id} />
                      </div>
                    )}

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
