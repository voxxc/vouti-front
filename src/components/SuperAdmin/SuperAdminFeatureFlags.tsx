import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAllFeatureFlags, type FeatureFlagKey } from '@/hooks/useFeatureFlag';

const FLAG_LABELS: Record<string, string> = {
  escavador_monitoramento_enabled: 'Monitoramento via Escavador',
};

export function SuperAdminFeatureFlags() {
  const { data, isLoading, setFlag } = useAllFeatureFlags();

  const handleToggle = async (key: FeatureFlagKey, enabled: boolean) => {
    try {
      await setFlag.mutateAsync({ key, enabled });
      toast({
        title: enabled ? 'Funcionalidade ativada' : 'Funcionalidade desativada',
        description: FLAG_LABELS[key] ?? key,
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar',
        description: err?.message ?? String(err),
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funcionalidades globais</CardTitle>
        <CardDescription>
          Ligue ou desligue módulos para todos os tenants. Mudanças têm efeito imediato.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          (data ?? []).map((flag) => (
            <div
              key={flag.flag_key}
              className="flex items-start justify-between gap-4 rounded-lg border p-4"
            >
              <div className="space-y-1">
                <p className="font-medium">{FLAG_LABELS[flag.flag_key] ?? flag.flag_key}</p>
                {flag.description && (
                  <p className="text-sm text-muted-foreground">{flag.description}</p>
                )}
              </div>
              <Switch
                checked={flag.enabled}
                disabled={setFlag.isPending}
                onCheckedChange={(checked) =>
                  handleToggle(flag.flag_key as FeatureFlagKey, checked)
                }
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}