import { useState, useEffect } from 'react';
import { useCustos } from '@/hooks/useCustos';
import { Custo, CustoCategoria } from '@/types/financeiro';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

interface CustoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  custo?: Custo | null;
  categorias: CustoCategoria[];
}

export const CustoForm = ({ open, onOpenChange, custo, categorias }: CustoFormProps) => {
  const { createCusto, updateCusto } = useCustos();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    descricao: '',
    categoria_id: '',
    valor: 0,
    tipo: 'variavel' as 'fixo' | 'variavel',
    data: new Date().toISOString().split('T')[0],
    forma_pagamento: '',
    status: 'pendente' as 'pago' | 'pendente',
    parcelado: false,
    numero_parcelas: 1,
    observacoes: '',
    recorrente: false,
    periodicidade: 'mensal',
    data_inicial: '',
    data_final: ''
  });

  useEffect(() => {
    if (custo) {
      setFormData({
        descricao: custo.descricao,
        categoria_id: custo.categoria_id || '',
        valor: custo.valor,
        tipo: custo.tipo || 'variavel',
        data: custo.data,
        forma_pagamento: custo.forma_pagamento || '',
        status: custo.status,
        parcelado: custo.parcelado,
        numero_parcelas: custo.numero_parcelas || 1,
        observacoes: custo.observacoes || '',
        recorrente: custo.recorrente,
        periodicidade: custo.periodicidade || 'mensal',
        data_inicial: custo.data_inicial || '',
        data_final: custo.data_final || ''
      });
    } else {
      setFormData({
        descricao: '',
        categoria_id: '',
        valor: 0,
        tipo: 'variavel',
        data: new Date().toISOString().split('T')[0],
        forma_pagamento: '',
        status: 'pendente',
        parcelado: false,
        numero_parcelas: 1,
        observacoes: '',
        recorrente: false,
        periodicidade: 'mensal',
        data_inicial: '',
        data_final: ''
      });
    }
  }, [custo, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        categoria_id: formData.categoria_id || undefined,
        numero_parcelas: formData.parcelado ? formData.numero_parcelas : undefined,
        data_inicial: formData.recorrente ? formData.data_inicial || formData.data : undefined,
        data_final: formData.recorrente && formData.data_final ? formData.data_final : undefined
      };

      if (custo) {
        await updateCusto(custo.id, dataToSave);
      } else {
        await createCusto(dataToSave as any);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {custo ? 'Editar Custo' : 'Novo Custo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Descricao *</Label>
            <Input
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select
                value={formData.categoria_id}
                onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.cor }}
                        />
                        {cat.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value: 'fixo' | 'variavel') => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixo">Fixo</SelectItem>
                  <SelectItem value="variavel">Variavel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Forma de Pagamento</Label>
              <Select
                value={formData.forma_pagamento}
                onValueChange={(value) => setFormData({ ...formData, forma_pagamento: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao">Cartao</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'pago' | 'pendente') => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Parcelamento */}
          <div className="space-y-3 p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.parcelado}
                onCheckedChange={(checked) => setFormData({ ...formData, parcelado: checked })}
              />
              <Label className="cursor-pointer">Parcelado</Label>
            </div>
            
            {formData.parcelado && (
              <div>
                <Label>Numero de Parcelas</Label>
                <Input
                  type="number"
                  min={2}
                  value={formData.numero_parcelas}
                  onChange={(e) => setFormData({ ...formData, numero_parcelas: parseInt(e.target.value) || 1 })}
                />
              </div>
            )}
          </div>

          {/* Recorrencia */}
          <div className="space-y-3 p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.recorrente}
                onCheckedChange={(checked) => setFormData({ ...formData, recorrente: checked })}
              />
              <Label className="cursor-pointer">Este custo se repete mensalmente</Label>
            </div>
            
            {formData.recorrente && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Periodicidade</Label>
                  <Select
                    value={formData.periodicidade}
                    onValueChange={(value) => setFormData({ ...formData, periodicidade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="semestral">Semestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data Final (opcional)</Label>
                  <Input
                    type="date"
                    value={formData.data_final}
                    onChange={(e) => setFormData({ ...formData, data_final: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>Observacoes</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {custo ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
