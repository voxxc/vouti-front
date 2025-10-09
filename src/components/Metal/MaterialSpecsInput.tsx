import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface MaterialSpecsInputProps {
  aco: string[];
  espessura: string[];
  quantidade: number | null;
  onChange: (field: 'aco' | 'espessura' | 'quantidade_material', value: any) => void;
}

const ACO_OPTIONS = ['430', '304'];
const ESPESSURA_OPTIONS = ['0.4', '0.5', '0.6', '0.7', '0.8', '1.0', '1.2', '1.5', '2.0', '3.0', '4.0', '5.0', '6.0', '7.0'];

export const MaterialSpecsInput = ({ aco, espessura, quantidade, onChange }: MaterialSpecsInputProps) => {
  const handleAcoChange = (value: string, checked: boolean) => {
    const newAco = checked 
      ? [...aco, value]
      : aco.filter(a => a !== value);
    onChange('aco', newAco);
  };

  const handleEspessuraChange = (value: string, checked: boolean) => {
    const newEspessura = checked
      ? [...espessura, value]
      : espessura.filter(e => e !== value);
    onChange('espessura', newEspessura);
  };

  return (
    <div className="space-y-4 border border-border rounded-lg p-4 bg-card">
      <h3 className="text-sm font-semibold text-foreground">Especificações de Material</h3>
      
      {/* Tipo de Aço */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tipo de Aço</Label>
        <div className="flex gap-4">
          {ACO_OPTIONS.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`aco-${option}`}
                checked={aco.includes(option)}
                onCheckedChange={(checked) => handleAcoChange(option, checked as boolean)}
              />
              <label
                htmlFor={`aco-${option}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {option}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Espessura */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Espessura (mm)</Label>
        <div className="grid grid-cols-4 gap-3">
          {ESPESSURA_OPTIONS.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`espessura-${option}`}
                checked={espessura.includes(option)}
                onCheckedChange={(checked) => handleEspessuraChange(option, checked as boolean)}
              />
              <label
                htmlFor={`espessura-${option}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {option}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Quantidade */}
      <div className="space-y-2">
        <Label htmlFor="quantidade-material" className="text-sm font-medium">
          Quantidade
        </Label>
        <Input
          id="quantidade-material"
          type="number"
          min="1"
          value={quantidade || ''}
          onChange={(e) => onChange('quantidade_material', parseInt(e.target.value) || null)}
          placeholder="Digite a quantidade"
          className="w-full"
        />
      </div>
    </div>
  );
};
