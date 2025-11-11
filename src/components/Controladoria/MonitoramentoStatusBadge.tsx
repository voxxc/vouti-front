import { Badge } from '@/components/ui/badge';
import { Bell, BellOff } from 'lucide-react';

interface MonitoramentoStatusBadgeProps {
  ativo: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export const MonitoramentoStatusBadge = ({ ativo, size = 'default' }: MonitoramentoStatusBadgeProps) => {
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  
  if (ativo) {
    return (
      <Badge variant="default" className="gap-1.5 bg-green-500 hover:bg-green-600">
        <Bell className={iconSize} />
        Monitoramento Ativo
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1.5">
      <BellOff className={iconSize} />
      Monitoramento Inativo
    </Badge>
  );
};
