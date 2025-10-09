import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

interface MaterialSpecsConfirmationProps {
  aco: string[] | null;
  espessura: string[] | null;
  quantidade: number | null;
}

export const MaterialSpecsConfirmation = ({ aco, espessura, quantidade }: MaterialSpecsConfirmationProps) => {
  const [confirmedAco, setConfirmedAco] = useState<string[]>([]);
  const [confirmedEspessura, setConfirmedEspessura] = useState<string[]>([]);

  const acoList = aco || [];
  const espessuraList = espessura || [];

  const handleAcoConfirm = (value: string, checked: boolean) => {
    setConfirmedAco(prev => 
      checked ? [...prev, value] : prev.filter(a => a !== value)
    );
  };

  const handleEspessuraConfirm = (value: string, checked: boolean) => {
    setConfirmedEspessura(prev =>
      checked ? [...prev, value] : prev.filter(e => e !== value)
    );
  };

  const handleConfirmAll = () => {
    setConfirmedAco([...acoList]);
    setConfirmedEspessura([...espessuraList]);
  };

  const handleClearAll = () => {
    setConfirmedAco([]);
    setConfirmedEspessura([]);
  };

  const allConfirmed = 
    confirmedAco.length === acoList.length && 
    confirmedEspessura.length === espessuraList.length &&
    acoList.length > 0 && espessuraList.length > 0;

  if (!acoList.length && !espessuraList.length && !quantidade) {
    return (
      <div className="border border-border rounded-lg p-4 bg-card">
        <p className="text-sm text-muted-foreground">
          Nenhuma especificação de material definida pela Programação.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 border border-border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          Especificações para Corte
          {allConfirmed && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
        </h3>
      </div>

      {/* Tipo de Aço */}
      {acoList.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo de Aço:</Label>
          <div className="space-y-2 pl-2">
            {acoList.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`confirm-aco-${option}`}
                  checked={confirmedAco.includes(option)}
                  onCheckedChange={(checked) => handleAcoConfirm(option, checked as boolean)}
                />
                <label
                  htmlFor={`confirm-aco-${option}`}
                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Espessura */}
      {espessuraList.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Espessura:</Label>
          <div className="space-y-2 pl-2">
            {espessuraList.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`confirm-espessura-${option}`}
                  checked={confirmedEspessura.includes(option)}
                  onCheckedChange={(checked) => handleEspessuraConfirm(option, checked as boolean)}
                />
                <label
                  htmlFor={`confirm-espessura-${option}`}
                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {option}mm
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quantidade */}
      {quantidade !== null && quantidade > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quantidade:</Label>
          <p className="text-sm pl-2">{quantidade} unidades</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button 
          onClick={handleConfirmAll} 
          size="sm"
          variant="default"
          disabled={allConfirmed}
        >
          {allConfirmed ? 'Tudo Confirmado' : 'Confirmar Tudo'}
        </Button>
        <Button 
          onClick={handleClearAll} 
          size="sm"
          variant="outline"
          disabled={confirmedAco.length === 0 && confirmedEspessura.length === 0}
        >
          Limpar
        </Button>
      </div>
    </div>
  );
};
