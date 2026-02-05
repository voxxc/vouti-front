import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Percent, AlertTriangle } from 'lucide-react';

interface JurosMultaConfigProps {
  aplicarJuros: boolean;
  taxaJurosMensal: string;
  aplicarMulta: boolean;
  taxaMulta: string;
  onAplicarJurosChange: (value: boolean) => void;
  onTaxaJurosMensalChange: (value: string) => void;
  onAplicarMultaChange: (value: boolean) => void;
  onTaxaMultaChange: (value: string) => void;
}

const OPCOES_JUROS = [
  { value: '0.5', label: '0,5% ao mês' },
  { value: '1', label: '1% ao mês' },
  { value: '2', label: '2% ao mês' },
  { value: '3', label: '3% ao mês' },
];

const OPCOES_MULTA = [
  { value: '2', label: '2% (fixo)' },
  { value: '5', label: '5% (fixo)' },
  { value: '10', label: '10% (fixo)' },
];

export const JurosMultaConfig = ({
  aplicarJuros,
  taxaJurosMensal,
  aplicarMulta,
  taxaMulta,
  onAplicarJurosChange,
  onTaxaJurosMensalChange,
  onAplicarMultaChange,
  onTaxaMultaChange,
}: JurosMultaConfigProps) => {
  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-4">
      <Label className="text-base font-semibold flex items-center gap-2">
        <Percent className="h-4 w-4" />
        Juros e Multa por Atraso
      </Label>

      <p className="text-sm text-muted-foreground">
        Configure os encargos que serão aplicados automaticamente em parcelas atrasadas.
      </p>

      {/* Juros por atraso */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="aplicar_juros"
            checked={aplicarJuros}
            onCheckedChange={(checked) => onAplicarJurosChange(!!checked)}
          />
          <Label htmlFor="aplicar_juros" className="cursor-pointer font-normal">
            Aplicar Juros por Atraso
          </Label>
        </div>

        {aplicarJuros && (
          <div className="ml-6">
            <Select
              value={taxaJurosMensal || '1'}
              onValueChange={onTaxaJurosMensalChange}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {OPCOES_JUROS.map((opcao) => (
                  <SelectItem key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Juros compostos calculados mensalmente
            </p>
          </div>
        )}
      </div>

      {/* Multa por atraso */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="aplicar_multa"
            checked={aplicarMulta}
            onCheckedChange={(checked) => onAplicarMultaChange(!!checked)}
          />
          <Label htmlFor="aplicar_multa" className="cursor-pointer font-normal">
            Aplicar Multa por Atraso
          </Label>
        </div>

        {aplicarMulta && (
          <div className="ml-6">
            <Select
              value={taxaMulta || '2'}
              onValueChange={onTaxaMultaChange}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {OPCOES_MULTA.map((opcao) => (
                  <SelectItem key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Multa fixa aplicada uma única vez
            </p>
          </div>
        )}
      </div>

      {(aplicarJuros || aplicarMulta) && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Os valores de juros e multa serão calculados automaticamente para parcelas atrasadas
            e exibidos no detalhamento financeiro do cliente.
          </p>
        </div>
      )}
    </div>
  );
};
