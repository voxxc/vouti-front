import { useState } from 'react';
import { useColaboradorPagamentos } from '@/hooks/useColaboradorPagamentos';
import { ColaboradorPagamento } from '@/types/financeiro';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BaixaPagamentoColaboradorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamento: ColaboradorPagamento;
  colaboradorNome: string;
  onSuccess: () => void;
}

export const BaixaPagamentoColaboradorDialog = ({
  open,
  onOpenChange,
  pagamento,
  colaboradorNome,
  onSuccess,
}: BaixaPagamentoColaboradorDialogProps) => {
  const { darBaixaPagamento } = useColaboradorPagamentos();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    data_pagamento: format(new Date(), 'yyyy-MM-dd'),
    metodo_pagamento: 'PIX',
    observacoes: '',
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const success = await darBaixaPagamento(pagamento.id, {
      data_pagamento: formData.data_pagamento,
      metodo_pagamento: formData.metodo_pagamento,
      observacoes: formData.observacoes || undefined,
    });

    setSaving(false);
    
    if (success) {
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>
            Confirme os dados do pagamento de {colaboradorNome}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Resumo */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Referencia:</span>
              <span className="font-medium">
                {format(new Date(pagamento.mes_referencia), 'MMMM yyyy', { locale: ptBR })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Salario Base:</span>
              <span>{formatCurrency(pagamento.salario_base)}</span>
            </div>
            {pagamento.descontos > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Descontos:</span>
                <span>- {formatCurrency(pagamento.descontos)}</span>
              </div>
            )}
            {pagamento.acrescimos > 0 && (
              <div className="flex justify-between text-sm text-green-500">
                <span>Acrescimos:</span>
                <span>+ {formatCurrency(pagamento.acrescimos)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Valor Liquido:</span>
              <span>{formatCurrency(pagamento.valor_liquido)}</span>
            </div>
          </div>

          {/* Campos */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="data_pagamento">Data do Pagamento</Label>
              <Input
                id="data_pagamento"
                type="date"
                value={formData.data_pagamento}
                onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="metodo_pagamento">Metodo de Pagamento</Label>
              <Select
                value={formData.metodo_pagamento}
                onValueChange={(value) => setFormData({ ...formData, metodo_pagamento: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Transferencia">Transferencia Bancaria</SelectItem>
                  <SelectItem value="Deposito">Deposito</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="observacoes">Observacoes (opcional)</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Notas sobre o pagamento..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
