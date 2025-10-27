import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CreateDividaData } from '@/types/financeiro';
import { DollarSign, Calendar, Hash } from 'lucide-react';

interface CreateDividaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (dados: CreateDividaData) => Promise<boolean>;
}

export const CreateDividaDialog = ({
  open,
  onOpenChange,
  onConfirm,
}: CreateDividaDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateDividaData>({
    titulo: '',
    descricao: '',
    valor_total: 0,
    numero_parcelas: 1,
    data_inicio: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo.trim()) {
      return;
    }

    if (formData.valor_total <= 0) {
      return;
    }

    if (formData.numero_parcelas < 1) {
      return;
    }

    setLoading(true);
    const success = await onConfirm(formData);
    setLoading(false);

    if (success) {
      // Resetar formulário
      setFormData({
        titulo: '',
        descricao: '',
        valor_total: 0,
        numero_parcelas: 1,
        data_inicio: new Date().toISOString().split('T')[0],
      });
      onOpenChange(false);
    }
  };

  const valorParcela = formData.numero_parcelas > 0 
    ? formData.valor_total / formData.numero_parcelas 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Dívida</DialogTitle>
          <DialogDescription>
            Adicione uma nova dívida adicional ao contrato do cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">
              Título da Dívida *
            </Label>
            <Input
              id="titulo"
              placeholder="Ex: Honorários Extras - Recurso"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">
              Descrição (opcional)
            </Label>
            <Textarea
              id="descricao"
              placeholder="Detalhes sobre esta dívida..."
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_total">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Valor Total *
              </Label>
              <Input
                id="valor_total"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={formData.valor_total || ''}
                onChange={(e) => setFormData({ ...formData, valor_total: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_parcelas">
                <Hash className="w-4 h-4 inline mr-1" />
                Número de Parcelas *
              </Label>
              <Input
                id="numero_parcelas"
                type="number"
                min="1"
                placeholder="1"
                value={formData.numero_parcelas || ''}
                onChange={(e) => setFormData({ ...formData, numero_parcelas: parseInt(e.target.value) || 1 })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_inicio">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data de Início *
            </Label>
            <Input
              id="data_inicio"
              type="date"
              value={formData.data_inicio}
              onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
              required
            />
          </div>

          {formData.numero_parcelas > 0 && formData.valor_total > 0 && (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium mb-1">Valor por Parcela</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(valorParcela)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formData.numero_parcelas}x de {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(valorParcela)}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Dívida'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
