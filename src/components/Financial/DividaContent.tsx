import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useClienteParcelas } from '@/hooks/useClienteParcelas';
import { BaixaPagamentoDialog } from './BaixaPagamentoDialog';
import { ParcelaComentarios } from './ParcelaComentarios';
import { ClienteDivida, ClienteParcela, DadosBaixaPagamento } from '@/types/financeiro';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, AlertCircle, DollarSign, Calendar, TrendingUp, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface DividaContentProps {
  divida: ClienteDivida;
  clienteId: string;
  onUpdate: () => void;
  onDelete: (dividaId: string) => Promise<void>;
}

export const DividaContent = ({ divida, clienteId, onUpdate }: DividaContentProps) => {
  const { parcelas, loading, darBaixaParcela, fetchParcelas } = useClienteParcelas(clienteId, divida.id);
  const [selectedParcela, setSelectedParcela] = useState<ClienteParcela | null>(null);
  const [baixaDialogOpen, setBaixaDialogOpen] = useState(false);
  const [selectedParcelaForComments, setSelectedParcelaForComments] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

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

  const totalPago = parcelasPagas.reduce((acc, p) => acc + Number(p.valor_parcela), 0);
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

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <>
      <div className="space-y-6 py-4">
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

      <BaixaPagamentoDialog
        parcela={selectedParcela}
        open={baixaDialogOpen}
        onOpenChange={setBaixaDialogOpen}
        onConfirm={handleConfirmBaixa}
      />
    </>
  );
};
