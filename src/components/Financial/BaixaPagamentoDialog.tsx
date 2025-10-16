import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClienteParcela, DadosBaixaPagamento } from '@/types/financeiro';
import { Upload } from 'lucide-react';

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
  const [valorPago, setValorPago] = useState(parcela?.valor_parcela.toString() || '');
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [observacoes, setObservacoes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metodoPagamento) return;

    setLoading(true);
    const dados: DadosBaixaPagamento = {
      data_pagamento: dataPagamento,
      metodo_pagamento: metodoPagamento,
      valor_pago: parseFloat(valorPago),
      observacoes,
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
    }
  };

  if (!parcela) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Parcela #{parcela.numero_parcela}</Label>
            <p className="text-sm text-muted-foreground">
              Vencimento: {new Date(parcela.data_vencimento).toLocaleDateString('pt-BR')}
            </p>
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
            <Button type="submit" disabled={loading || !metodoPagamento}>
              {loading ? 'Registrando...' : 'Registrar Pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
