import { AlertTriangle, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface LimiteAlertProps {
  tipo: 'oabs' | 'usuarios' | 'processos_cadastrados' | 'processos_monitorados';
  uso: number;
  limite: number | null;
  porcentagem: number;
  showProgress?: boolean;
}

const TIPO_LABELS: Record<string, { singular: string; plural: string }> = {
  oabs: { singular: 'OAB', plural: 'OABs' },
  usuarios: { singular: 'usuário', plural: 'usuários' },
  processos_cadastrados: { singular: 'processo cadastrado', plural: 'processos cadastrados' },
  processos_monitorados: { singular: 'processo monitorado', plural: 'processos monitorados' },
};

export function LimiteAlert({ tipo, uso, limite, porcentagem, showProgress = true }: LimiteAlertProps) {
  // Se ilimitado, não mostra alerta
  if (limite === null) return null;

  const labels = TIPO_LABELS[tipo];
  const isAtLimit = uso >= limite;
  const isNearLimit = porcentagem >= 80 && !isAtLimit;

  // Só mostra alerta se estiver perto ou no limite
  if (porcentagem < 80) return null;

  if (isAtLimit) {
    return (
      <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Limite atingido</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Você atingiu o limite de {limite} {limite === 1 ? labels.singular : labels.plural} do seu plano.
          </p>
          <p className="text-sm opacity-80">
            Para continuar adicionando, faça upgrade do seu plano.
          </p>
          {showProgress && (
            <Progress value={100} className="h-2 bg-destructive/20" />
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (isNearLimit) {
    return (
      <Alert className="border-yellow-500/50 bg-yellow-500/10">
        <TrendingUp className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-700 dark:text-yellow-400">Próximo do limite</AlertTitle>
        <AlertDescription className="space-y-2">
          <p className="text-yellow-700 dark:text-yellow-300">
            Você está usando {uso} de {limite} {labels.plural} ({porcentagem}%).
          </p>
          {showProgress && (
            <Progress value={porcentagem} className="h-2 bg-yellow-500/20" />
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

// Componente simplificado para badge de uso
interface LimiteUsoBadgeProps {
  uso: number;
  limite: number | null;
  className?: string;
}

export function LimiteUsoBadge({ uso, limite, className = '' }: LimiteUsoBadgeProps) {
  if (limite === null) {
    return (
      <span className={`text-xs text-muted-foreground ${className}`}>
        {uso} (ilimitado)
      </span>
    );
  }

  const porcentagem = Math.min(100, Math.round((uso / limite) * 100));
  const isAtLimit = uso >= limite;
  const isNearLimit = porcentagem >= 80;

  return (
    <span
      className={`text-xs font-medium ${
        isAtLimit
          ? 'text-destructive'
          : isNearLimit
          ? 'text-yellow-600 dark:text-yellow-400'
          : 'text-muted-foreground'
      } ${className}`}
    >
      {uso}/{limite}
    </span>
  );
}
