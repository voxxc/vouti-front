import { useState, useEffect } from 'react';
import { useColaboradorVales } from '@/hooks/useColaboradorVales';
import { ColaboradorVale } from '@/types/financeiro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ColaboradorValesTabProps {
  colaboradorId: string;
}

export const ColaboradorValesTab = ({ colaboradorId }: ColaboradorValesTabProps) => {
  const { vales, loading, fetchVales, createVale, deleteVale } = useColaboradorVales(colaboradorId);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'vale' as 'vale' | 'adiantamento' | 'reembolso',
    valor: 0,
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    vincular_salario: false
  });

  useEffect(() => {
    fetchVales();
  }, [fetchVales]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await createVale({
        ...formData,
        colaborador_id: colaboradorId,
        status: 'pendente',
        user_id: ''
      });
      setShowForm(false);
      setFormData({
        tipo: 'vale',
        valor: 0,
        data: new Date().toISOString().split('T')[0],
        descricao: '',
        vincular_salario: false
      });
    } catch (error) {
      // Error handled in hook
    } finally {
      setSaving(false);
    }
  };

  const getTipoBadge = (tipo: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      vale: { variant: 'default', label: 'Vale' },
      adiantamento: { variant: 'secondary', label: 'Adiantamento' },
      reembolso: { variant: 'outline', label: 'Reembolso' },
    };
    return variants[tipo] || { variant: 'outline', label: tipo };
  };

  const totalPendente = vales
    .filter(v => v.status === 'pendente')
    .reduce((sum, v) => v.tipo === 'reembolso' ? sum - v.valor : sum + v.valor, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">Total pendente de desconto:</p>
          <p className="text-lg font-bold text-destructive">{formatCurrency(totalPendente)}</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus size={16} />
              Novo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Vale / Adiantamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: 'vale' | 'adiantamento' | 'reembolso') => 
                    setFormData({ ...formData, tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vale">Vale</SelectItem>
                    <SelectItem value="adiantamento">Adiantamento</SelectItem>
                    <SelectItem value="reembolso">Reembolso</SelectItem>
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

              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Descricao</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.vincular_salario}
                  onCheckedChange={(checked) => setFormData({ ...formData, vincular_salario: checked })}
                />
                <Label className="cursor-pointer">Vincular ao salario (descontar automaticamente)</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </CardContent>
        </Card>
      ) : vales.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nenhum vale ou adiantamento registrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {vales.map((vale) => {
            const tipoConfig = getTipoBadge(vale.tipo);
            return (
              <Card key={vale.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={tipoConfig.variant}>{tipoConfig.label}</Badge>
                    <div>
                      <p className="font-medium">{formatCurrency(vale.valor)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(vale.data), 'dd/MM/yyyy', { locale: ptBR })}
                        {vale.descricao && ` - ${vale.descricao}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={vale.status === 'pendente' ? 'destructive' : 'secondary'}>
                      {vale.status === 'pendente' ? 'Pendente' : 'Descontado'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteVale(vale.id)}
                    >
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
