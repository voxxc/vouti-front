import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Loader2 } from 'lucide-react';
import { useTenantSettings, DEFAULT_TIMEZONE } from '@/hooks/useTenantSettings';

const TIMEZONE_OPTIONS = [
  { value: "America/Sao_Paulo", label: "São Paulo, Sul e Sudeste do Brasil (BA, GO, DF, MG, ES) - EST" },
  { value: "America/Cuiaba", label: "Cuiabá, Sudoeste do Brasil (MT, MS) - WST" },
  { value: "America/Fortaleza", label: "Fortaleza, Nordeste do Brasil (AP, leste do PA, MA, PI, CE) - EST" },
  { value: "America/Maceio", label: "Maceió, Este Nordeste do Brasil (AL, SE, TO) - EST" },
  { value: "America/Manaus", label: "Manaus, Noroeste do Brasil (RR, oeste do PA, AM, RO) - WST" },
  { value: "America/Noronha", label: "Noronha, Fernando de Noronha - FST" },
  { value: "America/Rio_Branco", label: "Rio Branco, Acre - AST" },
  { value: "America/Bahia", label: "Bahia, Brasil - BRT" },
];

export const TimezoneTab = () => {
  const { timezone, updateTimezone, loading, saving } = useTenantSettings();
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);

  useEffect(() => {
    setSelectedTimezone(timezone);
  }, [timezone]);

  const handleSave = async () => {
    await updateTimezone(selectedTimezone);
  };

  const hasChanges = selectedTimezone !== timezone;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle>Timezone</CardTitle>
        </div>
        <CardDescription>
          Defina o fuso horário padrão para este escritório. Este timezone será utilizado em todos os cálculos de datas e prazos do sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="timezone">Fuso Horário Local</Label>
          <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
            <SelectTrigger id="timezone" className="w-full">
              <SelectValue placeholder="Selecione o fuso horário" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Se não definido, será utilizado o padrão: São Paulo (America/Sao_Paulo)
          </p>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasChanges}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
