import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ClienteParcela, DadosBaixaPagamento } from '@/types/financeiro';
import { Upload, AlertTriangle } from 'lucide-react';

interface BaixaPagamentoDialogProps {
  parcela: ClienteParcela | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (dados: DadosBaixaPagamento) => Promise<boolean>;
}

export const BaixaPagamentoDialog = ({
  parcela,
  open,
  onOpenChange,
  onConfirm,
}: BaixaPagamentoDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [metodoPagamento, setMetodoPagamento] = useState('');
  const [valorPago, setValorPago] = useState('');
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [isPagamentoParcial, setIsPagamentoParcial] = useState(false);

  // Calcular valores
  const valorParcela = parcela?.valor_parcela || 0;
  const valorPagoAnterior = parcela?.status === 'parcial' ? (parcela?.valor_pago || 0) : 0;
  const saldoEmAberto = parcela?.status === 'parcial' ? (parcela?.saldo_restante || valorParcela - valorPagoAnterior) : valorParcela;
  const valorPagoNum = parseFloat(valorPago) || 0;
  const saldoRestante = saldoEmAberto - valorPagoNum;

  // Atualizar valor quando parcela muda
  useEffect(() => {
    if (parcela) {
      // Se é pagamento parcial, usar saldo restante como valor default
      if (parcela.status === 'parcial' && parcela.saldo_restante) {
        setValorPago(parcela.saldo_restante.toString());
      } else {
        setValorPago(parcela.valor_parcela.toString());
      }
      setIsPagamentoParcial(false);
    }
  }, [parcela]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metodoPagamento) return;

    setLoading(true);
    const dados: DadosBaixaPagamento = {
      data_pagamento: dataPagamento,
      metodo_pagamento: metodoPagamento,
      valor_pago: parseFloat(valorPago),
      observacoes,
      pagamento_parcial: isPagamentoParcial,
    };

    if (comprovante) {
      dados.comprovante = comprovante;
    }

    const success = await onConfirm(dados);
    setLoading(false);

    if (success) {
      onOpenChange(false);
      // Reset form
      setMetodoPagamento('');
      setObservacoes('');
      setComprovante(null);
      setIsPagamentoParcial(false);
    }
  };

  if (!parcela) return null;

  const showPartialWarning = valorPagoNum < saldoEmAberto && valorPagoNum > 0;
  const isCompletingPartial = parcela.status === 'parcial';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCompletingPartial ? 'Completar Pagamento' : 'Registrar Pagamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Parcela #{parcela.numero_parcela}</Label>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Valor da parcela: {formatCurrency(valorParcela)}</p>
              <p>Vencimento: {new Date(parcela.data_vencimento).toLocaleDateString('pt-BR')}</p>
              {isCompletingPartial && (
                <>
                  <p className="text-amber-600 font-medium">
                    Já pago: {formatCurrency(valorPagoAnterior)}
                  </p>
                  <p className="text-amber-600 font-medium">
                    Saldo em aberto: {formatCurrency(saldoEmAberto)}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data-pagamento">Data do Pagamento</Label>
            <Input
              id="data-pagamento"
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metodo-pagamento">Método de Pagamento</Label>
            <Select value={metodoPagamento} onValueChange={setMetodoPagamento} required>
              <SelectTrigger id="metodo-pagamento">
                <SelectValue placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor-pago">Valor Pago</Label>
            <Input
              id="valor-pago"
              type="number"
              step="0.01"
              value={valorPago}
              onChange={(e) => setValorPago(e.target.value)}
              required
            />
          </div>

          {/* Checkbox de Pagamento Parcial */}
          {showPartialWarning && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pagamento-parcial"
                  checked={isPagamentoParcial}
                  onCheckedChange={(checked) => setIsPagamentoParcial(checked === true)}
                />
                <Label htmlFor="pagamento-parcial" className="cursor-pointer">
                  Pagamento Parcial
                </Label>
              </div>

              {isPagamentoParcial && saldoRestante > 0 && (
                <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700 dark:text-amber-400">
                    <p className="font-medium">Saldo restante: {formatCurrency(saldoRestante)}</p>
                    <p className="text-sm">A parcela permanecerá em aberto com status "Parcial".</p>
                  </AlertDescription>
                </Alert>
              )}

              {!isPagamentoParcial && (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">
                    O valor informado é menor que o saldo em aberto. 
                    Marque "Pagamento Parcial" para continuar ou ajuste o valor.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comprovante">Comprovante (Opcional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="comprovante"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setComprovante(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('comprovante')?.click()}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {comprovante ? comprovante.name : 'Selecionar arquivo'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (Opcional)</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais sobre o pagamento..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !metodoPagamento || (showPartialWarning && !isPagamentoParcial)}
            >
              {loading ? 'Registrando...' : 'Registrar Pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
