import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CreateDividaData } from '@/types/financeiro';
import { GruposParcelasManager } from '@/components/CRM/GruposParcelasManager';
import { GruposParcelasConfig } from '@/types/cliente';
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
  const [modoPersonalizado, setModoPersonalizado] = useState(false);
  const [gruposConfig, setGruposConfig] = useState<GruposParcelasConfig>({ grupos: [] });
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

    // Validacao modo simples
    if (!modoPersonalizado && formData.numero_parcelas < 1) {
      return;
    }

    // Validacao modo personalizado
    if (modoPersonalizado) {
      const totalGrupos = gruposConfig.grupos.reduce((acc, g) => acc + (g.quantidade * g.valor_parcela), 0);
      const totalEntrada = gruposConfig.entrada?.valor || 0;
      const total = totalGrupos + totalEntrada;
      
      if (Math.abs(total - formData.valor_total) > 0.01) {
        return;
      }
    }

    setLoading(true);
    
    const dados: CreateDividaData = {
      ...formData,
      grupos_parcelas: modoPersonalizado ? gruposConfig : undefined,
    };
    
    const success = await onConfirm(dados);
    setLoading(false);

    if (success) {
      // Resetar formulario
      setFormData({
        titulo: '',
        descricao: '',
        valor_total: 0,
        numero_parcelas: 1,
        data_inicio: new Date().toISOString().split('T')[0],
      });
      setModoPersonalizado(false);
      setGruposConfig({ grupos: [] });
      onOpenChange(false);
    }
  };

  const valorParcela = formData.numero_parcelas > 0 
    ? formData.valor_total / formData.numero_parcelas 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modoPersonalizado ? "max-w-2xl max-h-[90vh] overflow-y-auto" : "max-w-lg"}>
        <DialogHeader>
          <DialogTitle>Nova Divida</DialogTitle>
          <DialogDescription>
            Adicione uma nova divida adicional ao contrato do cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">
              Titulo da Divida *
            </Label>
            <Input
              id="titulo"
              placeholder="Ex: Honorarios Extras - Recurso"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">
              Descricao (opcional)
            </Label>
            <Textarea
              id="descricao"
              placeholder="Detalhes sobre esta divida..."
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={3}
            />
          </div>

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

          {/* Toggle modo personalizado */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <Switch
              id="modo-personalizado"
              checked={modoPersonalizado}
              onCheckedChange={setModoPersonalizado}
            />
            <Label htmlFor="modo-personalizado" className="cursor-pointer">
              Parcelas personalizadas (grupos com valores diferentes)
            </Label>
          </div>

          {!modoPersonalizado ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_parcelas">
                    <Hash className="w-4 h-4 inline mr-1" />
                    Numero de Parcelas *
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

                <div className="space-y-2">
                  <Label htmlFor="data_inicio">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Data de Inicio *
                  </Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    required
                  />
                </div>
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
            </>
          ) : (
            <GruposParcelasManager
              value={gruposConfig}
              onChange={setGruposConfig}
              valorContrato={formData.valor_total}
            />
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
              {loading ? 'Criando...' : 'Criar Divida'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
