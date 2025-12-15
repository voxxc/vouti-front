import { useState, useEffect } from 'react';
import { useColaboradorPagamentos } from '@/hooks/useColaboradorPagamentos';
import { useColaboradores } from '@/hooks/useColaboradores';
import { ColaboradorPagamento } from '@/types/financeiro';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  DollarSign, 
  Clock, 
  AlertCircle, 
  Check, 
  CalendarPlus,
  ChevronRight,
  Users,
  Trash2
} from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BaixaPagamentoColaboradorDialog } from './BaixaPagamentoColaboradorDialog';

export const FolhaPagamentoCard = () => {
  const { colaboradores } = useColaboradores();
  const { pagamentos, loading, fetchPagamentosMes, gerarFolhaMes, atualizarStatusAtrasados, deletePagamento } = useColaboradorPagamentos();
  const [mesAtual] = useState(startOfMonth(new Date()));
  const [gerando, setGerando] = useState(false);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<ColaboradorPagamento | null>(null);
  const [pagamentoParaExcluir, setPagamentoParaExcluir] = useState<ColaboradorPagamento | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await atualizarStatusAtrasados();
    await fetchPagamentosMes(mesAtual);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleGerarFolha = async () => {
    setGerando(true);
    await gerarFolhaMes(colaboradores, mesAtual);
    setGerando(false);
  };

  const totalFolha = pagamentos.reduce((sum, p) => sum + p.valor_liquido, 0);
  const pagamentosPendentes = pagamentos.filter(p => p.status === 'pendente');
  const pagamentosAtrasados = pagamentos.filter(p => p.status === 'atrasado');
  const pagamentosPagos = pagamentos.filter(p => p.status === 'pago');
  const totalPago = pagamentosPagos.reduce((sum, p) => sum + p.valor_liquido, 0);

  if (loading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Folha de {format(mesAtual, 'MMMM/yyyy', { locale: ptBR })}
          </CardTitle>
          <Button 
            size="sm" 
            onClick={handleGerarFolha}
            disabled={gerando}
          >
            <CalendarPlus className="h-4 w-4 mr-1" />
            {gerando ? 'Gerando...' : 'Gerar Folha'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metricas */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <DollarSign className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{formatCurrency(totalFolha)}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
            <Clock className="h-4 w-4 mx-auto text-yellow-600 mb-1" />
            <p className="text-lg font-bold text-yellow-600">{pagamentosPendentes.length}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
          <div className="bg-red-500/10 rounded-lg p-3 text-center">
            <AlertCircle className="h-4 w-4 mx-auto text-red-600 mb-1" />
            <p className="text-lg font-bold text-red-600">{pagamentosAtrasados.length}</p>
            <p className="text-xs text-muted-foreground">Atrasados</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <Check className="h-4 w-4 mx-auto text-green-600 mb-1" />
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalPago)}</p>
            <p className="text-xs text-muted-foreground">Pago</p>
          </div>
        </div>

        {/* Lista de pendentes */}
        {(pagamentosPendentes.length > 0 || pagamentosAtrasados.length > 0) && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Falta pagar:</p>
            <div className="space-y-2">
              {[...pagamentosAtrasados, ...pagamentosPendentes].slice(0, 5).map((pagamento) => (
                <div 
                  key={pagamento.id} 
                  className="flex items-center justify-between bg-muted/30 rounded-lg p-2 hover:bg-muted/50 transition-colors"
                >
                  <div 
                    className="flex items-center gap-2 flex-1 cursor-pointer"
                    onClick={() => setPagamentoSelecionado(pagamento)}
                  >
                    {pagamento.status === 'atrasado' ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="font-medium text-sm">
                      {(pagamento as any).colaborador?.nome_completo || 'Colaborador'}
                    </span>
                    <Badge variant={pagamento.status === 'atrasado' ? 'destructive' : 'secondary'} className="text-xs">
                      Venc: {format(new Date(pagamento.data_vencimento), 'dd/MM')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{formatCurrency(pagamento.valor_liquido)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPagamentoParaExcluir(pagamento);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pagamentos.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Nenhum pagamento gerado para este mes</p>
            <p className="text-xs">Clique em "Gerar Folha" para criar os pagamentos</p>
          </div>
        )}
      </CardContent>

      {/* Dialog de baixa */}
      {pagamentoSelecionado && (
        <BaixaPagamentoColaboradorDialog
          open={!!pagamentoSelecionado}
          onOpenChange={(open) => !open && setPagamentoSelecionado(null)}
          pagamento={pagamentoSelecionado}
          colaboradorNome={(pagamentoSelecionado as any).colaborador?.nome_completo || 'Colaborador'}
          onSuccess={() => {
            setPagamentoSelecionado(null);
            loadData();
          }}
        />
      )}

      {/* Dialog de exclusao */}
      <AlertDialog open={!!pagamentoParaExcluir} onOpenChange={(open) => !open && setPagamentoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pagamento de{' '}
              <strong>{(pagamentoParaExcluir as any)?.colaborador?.nome_completo || 'Colaborador'}</strong> referente a{' '}
              <strong>{pagamentoParaExcluir && format(new Date(pagamentoParaExcluir.mes_referencia), 'MMMM yyyy', { locale: ptBR })}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (pagamentoParaExcluir) {
                  await deletePagamento(pagamentoParaExcluir.id);
                  await loadData();
                  setPagamentoParaExcluir(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
