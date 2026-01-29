import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  useSuperAdminPaymentConfirmations, 
  PaymentConfirmationWithBoleto 
} from '@/hooks/useSuperAdminPaymentConfirmations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  ExternalLink,
  FileCheck,
  CreditCard,
  QrCode,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface PaymentConfirmationsTabProps {
  tenantId: string;
}

export function PaymentConfirmationsTab({ tenantId }: PaymentConfirmationsTabProps) {
  const { 
    confirmacoes, 
    loading, 
    aprovarConfirmacao, 
    rejeitarConfirmacao,
    getComprovanteUrl 
  } = useSuperAdminPaymentConfirmations(tenantId);

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingItem, setRejectingItem] = useState<PaymentConfirmationWithBoleto | null>(null);
  const [rejectObservacao, setRejectObservacao] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingComprovante, setLoadingComprovante] = useState<string | null>(null);

  const handleAprovar = async (item: PaymentConfirmationWithBoleto) => {
    setApprovingId(item.id);
    await aprovarConfirmacao(item.id, item.boleto_id);
    setApprovingId(null);
  };

  const handleRejeitar = async () => {
    if (!rejectingItem) return;
    
    setSubmitting(true);
    await rejeitarConfirmacao(rejectingItem.id, rejectObservacao);
    setSubmitting(false);
    setRejectingItem(null);
    setRejectObservacao('');
  };

  const handleViewComprovante = async (path: string, id: string) => {
    setLoadingComprovante(id);
    const url = await getComprovanteUrl(path);
    if (url) {
      window.open(url, '_blank');
    }
    setLoadingComprovante(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'rejeitado':
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
    }
  };

  const getMetodoBadge = (metodo: string) => {
    if (metodo === 'pix') {
      return (
        <Badge variant="outline" className="gap-1">
          <QrCode className="w-3 h-3" />
          PIX
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <CreditCard className="w-3 h-3" />
        Boleto
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (confirmacoes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma confirmação de pagamento</p>
        <p className="text-sm mt-1">Os pagamentos confirmados pelos clientes aparecerão aqui</p>
      </div>
    );
  }

  const pendentes = confirmacoes.filter(c => c.status === 'pendente');
  const historico = confirmacoes.filter(c => c.status !== 'pendente');

  return (
    <>
      <ScrollArea className="h-[400px]">
        <div className="space-y-6">
          {/* Pendentes */}
          {pendentes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                Aguardando Aprovação ({pendentes.length})
              </h4>
              <div className="space-y-3">
                {pendentes.map((item) => (
                  <div 
                    key={item.id}
                    className="p-4 rounded-lg border bg-yellow-500/5 border-yellow-500/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {item.boleto?.mes_referencia || 'Referência não encontrada'}
                          </span>
                          {getStatusBadge(item.status)}
                          {getMetodoBadge(item.metodo)}
                        </div>
                        
                        {item.boleto && (
                          <div className="text-lg font-semibold">
                            {formatCurrency(item.boleto.valor)}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Confirmado: {format(new Date(item.data_confirmacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.comprovante_path ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewComprovante(item.comprovante_path!, item.id)}
                              disabled={loadingComprovante === item.id}
                              className="gap-2"
                            >
                              {loadingComprovante === item.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <ExternalLink className="w-3 h-3" />
                              )}
                              Ver Comprovante
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Sem comprovante anexado
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAprovar(item)}
                          disabled={approvingId === item.id}
                          className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                          {approvingId === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          Aprovar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRejectingItem(item)}
                          className="gap-2 text-red-500 border-red-500/30 hover:bg-red-500/10"
                        >
                          <XCircle className="w-3 h-3" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico */}
          {historico.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Histórico ({historico.length})
              </h4>
              <div className="space-y-3">
                {historico.map((item) => (
                  <div 
                    key={item.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {item.boleto?.mes_referencia || 'Referência não encontrada'}
                          </span>
                          {getStatusBadge(item.status)}
                          {getMetodoBadge(item.metodo)}
                        </div>
                        
                        {item.boleto && (
                          <div className="text-lg font-semibold">
                            {formatCurrency(item.boleto.valor)}
                          </div>
                        )}
                        
                        <div className="text-sm text-muted-foreground">
                          Confirmado: {format(new Date(item.data_confirmacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>

                        {item.observacao_admin && (
                          <div className="text-sm text-red-400 bg-red-500/10 p-2 rounded">
                            <strong>Motivo rejeição:</strong> {item.observacao_admin}
                          </div>
                        )}
                      </div>
                      
                      {item.comprovante_path && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewComprovante(item.comprovante_path!, item.id)}
                          disabled={loadingComprovante === item.id}
                        >
                          {loadingComprovante === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ExternalLink className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Reject Dialog */}
      <AlertDialog open={!!rejectingItem} onOpenChange={() => setRejectingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Confirmação</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição para que o cliente saiba por que o pagamento não foi aceito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="Motivo da rejeição..."
              value={rejectObservacao}
              onChange={(e) => setRejectObservacao(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <Button 
              variant="destructive" 
              onClick={handleRejeitar}
              disabled={submitting || !rejectObservacao.trim()}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Rejeitar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
