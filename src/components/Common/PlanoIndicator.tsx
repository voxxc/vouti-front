import { Badge } from '@/components/ui/badge';
import { Crown, Star, Building2, Rocket, Gem } from 'lucide-react';

interface PlanoIndicatorProps {
  plano: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const PLANO_CONFIG: Record<string, { 
  nome: string; 
  cor: string; 
  bgColor: string;
  icon: React.ElementType;
}> = {
  solo: {
    nome: 'Solo',
    cor: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600',
    icon: Star,
  },
  essencial: {
    nome: 'Essencial',
    cor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700',
    icon: Building2,
  },
  estrutura: {
    nome: 'Estrutura',
    cor: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700',
    icon: Rocket,
  },
  expansao: {
    nome: 'Expansão',
    cor: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950 border-purple-300 dark:border-purple-700',
    icon: Gem,
  },
  enterprise: {
    nome: 'Enterprise',
    cor: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950 border-amber-400 dark:border-amber-600',
    icon: Crown,
  },
};

export function PlanoIndicator({ plano, showIcon = true, size = 'md' }: PlanoIndicatorProps) {
  const config = PLANO_CONFIG[plano] || PLANO_CONFIG.solo;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <Badge
      variant="outline"
      className={`${config.bgColor} ${config.cor} ${sizeClasses[size]} font-medium`}
    >
      {showIcon && <Icon className={`${iconSizes[size]} mr-1`} />}
      {config.nome}
    </Badge>
  );
}

// Exporta a configuração para uso externo
export { PLANO_CONFIG };
