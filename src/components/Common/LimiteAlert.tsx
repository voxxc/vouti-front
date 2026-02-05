import { AlertTriangle, TrendingUp } from 'lucide-react';

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
       <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/30 text-sm">
         <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
         <span className="text-destructive font-medium">
           Limite: {uso}/{limite} {labels.plural}
         </span>
       </div>
    );
  }

  if (isNearLimit) {
    return (
       <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-sm">
         <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
         <span className="text-yellow-700 dark:text-yellow-300 font-medium">
           {uso}/{limite} {labels.plural} ({porcentagem}%)
         </span>
       </div>
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
