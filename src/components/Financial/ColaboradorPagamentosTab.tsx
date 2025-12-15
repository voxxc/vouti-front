import { useState, useEffect } from 'react';
import { useColaboradorPagamentos } from '@/hooks/useColaboradorPagamentos';
import { ColaboradorPagamento, Colaborador } from '@/types/financeiro';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Check, Clock, AlertCircle, Plus } from 'lucide-react';
import { format, addMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BaixaPagamentoColaboradorDialog } from './BaixaPagamentoColaboradorDialog';

interface ColaboradorPagamentosTabProps {
  colaborador: Colaborador;
}

export const ColaboradorPagamentosTab = ({ colaborador }: ColaboradorPagamentosTabProps) => {
  const { pagamentos, loading, fetchPagamentosColaborador, gerarPagamentoMensal } = useColaboradorPagamentos();
  const [gerando, setGerando] = useState(false);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<ColaboradorPagamento | null>(null);

  useEffect(() => {
    fetchPagamentosColaborador(colaborador.id);
  }, [colaborador.id]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleGerarProximoMes = async () => {
    setGerando(true);
    const proximoMes = addMonths(startOfMonth(new Date()), 1);
    await gerarPagamentoMensal(colaborador, proximoMes);
    await fetchPagamentosColaborador(colaborador.id);
    setGerando(false);
  };

  const handleGerarMesAtual = async () => {
    setGerando(true);
    await gerarPagamentoMensal(colaborador, new Date());
    await fetchPagamentosColaborador(colaborador.id);
    setGerando(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return <Badge variant="default" className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Pago</Badge>;
      case 'atrasado':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Atrasado</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Acoes */}
      <div className="flex gap-2">
        <Button 
          onClick={handleGerarMesAtual} 
          disabled={gerando}
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Gerar Mes Atual
        </Button>
        <Button 
          onClick={handleGerarProximoMes} 
          disabled={gerando}
          size="sm"
        >
          <Calendar className="h-4 w-4 mr-1" />
          Gerar Proximo Mes
        </Button>
      </div>

      {/* Lista de pagamentos */}
      {pagamentos.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground opacity-50 mb-2" />
            <p className="text-muted-foreground">Nenhum pagamento gerado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Clique em "Gerar Mes Atual" para criar o primeiro pagamento
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pagamentos.map((pagamento) => (
            <Card key={pagamento.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {format(new Date(pagamento.mes_referencia), 'MMMM yyyy', { locale: ptBR })}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>Venc: {format(new Date(pagamento.data_vencimento), 'dd/MM/yyyy')}</span>
                      {pagamento.data_pagamento && (
                        <span>Pago: {format(new Date(pagamento.data_pagamento), 'dd/MM/yyyy')}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(pagamento.valor_liquido)}</p>
                    {(pagamento.descontos > 0 || pagamento.acrescimos > 0) && (
                      <p className="text-xs text-muted-foreground">
                        Base: {formatCurrency(pagamento.salario_base)}
                        {pagamento.descontos > 0 && ` - ${formatCurrency(pagamento.descontos)}`}
                        {pagamento.acrescimos > 0 && ` + ${formatCurrency(pagamento.acrescimos)}`}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  {getStatusBadge(pagamento.status)}
                  
                  {pagamento.status !== 'pago' && (
                    <Button 
                      size="sm" 
                      onClick={() => setPagamentoSelecionado(pagamento)}
                    >
                      Dar Baixa
                    </Button>
                  )}
                  
                  {pagamento.metodo_pagamento && (
                    <span className="text-xs text-muted-foreground">{pagamento.metodo_pagamento}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de baixa */}
      {pagamentoSelecionado && (
        <BaixaPagamentoColaboradorDialog
          open={!!pagamentoSelecionado}
          onOpenChange={(open) => !open && setPagamentoSelecionado(null)}
          pagamento={pagamentoSelecionado}
          colaboradorNome={colaborador.nome_completo}
          onSuccess={() => {
            setPagamentoSelecionado(null);
            fetchPagamentosColaborador(colaborador.id);
          }}
        />
      )}
    </div>
  );
};
