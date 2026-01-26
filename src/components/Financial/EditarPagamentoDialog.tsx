import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClienteParcela } from '@/types/financeiro';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface EditarPagamentoDialogProps {
  parcela: ClienteParcela | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditarPagamentoDialog = ({
  parcela,
  open,
  onOpenChange,
  onSuccess,
}: EditarPagamentoDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [dataPagamento, setDataPagamento] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('');
  const [valorPago, setValorPago] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (parcela && open) {
      setDataPagamento(parcela.data_pagamento || new Date().toISOString().split('T')[0]);
      setMetodoPagamento(parcela.metodo_pagamento || '');
      setValorPago((parcela.valor_pago ?? parcela.valor_parcela).toString());
      setObservacoes(parcela.observacoes || '');
    }
  }, [parcela, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parcela || !metodoPagamento) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('cliente_parcelas')
        .update({
          data_pagamento: dataPagamento,
          metodo_pagamento: metodoPagamento,
          valor_pago: parseFloat(valorPago),
          observacoes,
        })
        .eq('id', parcela.id);

      if (error) throw error;

      toast({
        title: 'Pagamento atualizado',
        description: 'As informações do pagamento foram atualizadas.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o pagamento.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!parcela) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Pagamento - Parcela #{parcela.numero_parcela}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data-pagamento-edit">Data do Pagamento</Label>
            <Input
              id="data-pagamento-edit"
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metodo-pagamento-edit">Método de Pagamento</Label>
            <Select value={metodoPagamento} onValueChange={setMetodoPagamento} required>
              <SelectTrigger id="metodo-pagamento-edit">
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
            <Label htmlFor="valor-pago-edit">Valor Pago</Label>
            <Input
              id="valor-pago-edit"
              type="number"
              step="0.01"
              value={valorPago}
              onChange={(e) => setValorPago(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes-edit">Observações</Label>
            <Textarea
              id="observacoes-edit"
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
            <Button type="submit" disabled={loading || !metodoPagamento}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};