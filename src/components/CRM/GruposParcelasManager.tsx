import { useState, useEffect } from 'react';
import { GruposParcelasConfig, GrupoParcela } from '@/types/cliente';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyInput } from '@/components/ui/currency-input';

interface GruposParcelasManagerProps {
  value?: GruposParcelasConfig;
  onChange: (value: GruposParcelasConfig) => void;
  valorContrato: number;
}

export const GruposParcelasManager = ({
  value,
  onChange,
  valorContrato,
}: GruposParcelasManagerProps) => {
  const [temEntrada, setTemEntrada] = useState(!!value?.entrada);
  const [entrada, setEntrada] = useState(value?.entrada || { valor: 0, data_vencimento: '' });
  const [grupos, setGrupos] = useState<GrupoParcela[]>(value?.grupos || []);

  useEffect(() => {
    onChange({
      entrada: temEntrada ? entrada : undefined,
      grupos,
    });
  }, [temEntrada, entrada, grupos]);

  const addGrupo = () => {
    const novoGrupo: GrupoParcela = {
      ordem: grupos.length + 1,
      descricao: '',
      quantidade: 1,
      valor_parcela: 0,
      data_inicio: '',
    };
    setGrupos([...grupos, novoGrupo]);
  };

  const removeGrupo = (index: number) => {
    const novosGrupos = grupos.filter((_, i) => i !== index);
    // Reordenar
    const reordenados = novosGrupos.map((g, i) => ({ ...g, ordem: i + 1 }));
    setGrupos(reordenados);
  };

  const updateGrupo = (index: number, field: keyof GrupoParcela, value: any) => {
    const novosGrupos = [...grupos];
    novosGrupos[index] = { ...novosGrupos[index], [field]: value };
    setGrupos(novosGrupos);
  };

  const moveGrupo = (index: number, direction: 'up' | 'down') => {
    const novosGrupos = [...grupos];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= novosGrupos.length) return;
    
    [novosGrupos[index], novosGrupos[targetIndex]] = [novosGrupos[targetIndex], novosGrupos[index]];
    
    // Reordenar
    const reordenados = novosGrupos.map((g, i) => ({ ...g, ordem: i + 1 }));
    setGrupos(reordenados);
  };

  const calcularTotal = () => {
    const totalEntrada = temEntrada ? entrada.valor : 0;
    const totalGrupos = grupos.reduce((acc, g) => acc + (g.quantidade * g.valor_parcela), 0);
    return totalEntrada + totalGrupos;
  };

  const calcularTotalParcelas = () => {
    return grupos.reduce((acc, g) => acc + g.quantidade, 0);
  };

  const total = calcularTotal();
  const totalParcelas = calcularTotalParcelas();
  const isValid = Math.abs(total - valorContrato) < 0.01;

  return (
    <div className="space-y-6">
      {/* Entrada */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">💰 Entrada</CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="tem-entrada"
                checked={temEntrada}
                onCheckedChange={(checked) => setTemEntrada(checked as boolean)}
              />
              <Label htmlFor="tem-entrada" className="cursor-pointer font-normal">
                Cliente fará entrada
              </Label>
            </div>
          </div>
        </CardHeader>
        {temEntrada && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor da Entrada *</Label>
                <CurrencyInput
                  value={entrada.valor || 0}
                  onChange={(value) => setEntrada({ ...entrada, valor: value })}
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={entrada.data_vencimento}
                  onChange={(e) => setEntrada({ ...entrada, data_vencimento: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Grupos de Parcelas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">📋 Grupos de Parcelas</h3>
          <Button type="button" onClick={addGrupo} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Grupo
          </Button>
        </div>

        {grupos.length === 0 && (
          <p className="text-sm text-muted-foreground italic py-8 text-center border border-dashed rounded-lg">
            Nenhum grupo de parcelas definido. Clique em "Adicionar Grupo" para começar.
          </p>
        )}

        {grupos.map((grupo, index) => (
          <Card key={index} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Grupo {index + 1}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveGrupo(index, 'up')}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveGrupo(index, 'down')}
                    disabled={index === grupos.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGrupo(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Descrição do Grupo</Label>
                  <Input
                    value={grupo.descricao || ''}
                    onChange={(e) => updateGrupo(index, 'descricao', e.target.value)}
                    placeholder="Ex: Parcelas mensais, Parcelas finais..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Quantidade de Parcelas *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={grupo.quantidade || ''}
                    onChange={(e) => updateGrupo(index, 'quantidade', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor por Parcela *</Label>
                  <CurrencyInput
                    value={grupo.valor_parcela || 0}
                    onChange={(value) => updateGrupo(index, 'valor_parcela', value)}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data de Início *</Label>
                  <Input
                    type="date"
                    value={grupo.data_inicio}
                    onChange={(e) => updateGrupo(index, 'data_inicio', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Total do Grupo</Label>
                  <Input
                    value={`R$ ${(grupo.quantidade * grupo.valor_parcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumo */}
      <Card className={!isValid ? 'border-destructive' : 'border-primary'}>
        <CardHeader>
          <CardTitle className="text-lg">📊 Resumo do Plano de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total de Parcelas:</span>
            <span className="font-semibold">{totalParcelas}</span>
          </div>
          {temEntrada && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Valor da Entrada:</span>
              <span className="font-semibold">
                R$ {entrada.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total do Plano:</span>
            <span className={`font-semibold ${!isValid ? 'text-destructive' : 'text-primary'}`}>
              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Valor do Contrato:</span>
            <span className="font-semibold">
              R$ {valorContrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="pt-2 border-t">
            {isValid ? (
              <div className="flex items-center gap-2 text-primary">
                <span className="text-2xl">✅</span>
                <span className="font-semibold">Plano válido!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive">
                <span className="text-2xl">⚠️</span>
                <span className="font-semibold">
                  Diferença: R$ {Math.abs(total - valorContrato).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
