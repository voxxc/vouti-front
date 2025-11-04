import { Reuniao } from '@/types/reuniao';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Clock, User, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReuniaoCardProps {
  reuniao: Reuniao;
  onClick: () => void;
}

const getStatusColor = (status: Reuniao['status']) => {
  const colors = {
    '1ª reunião': 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    'em contato': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    'inviável': 'bg-red-500/10 text-red-700 dark:text-red-400',
    'fechado': 'bg-green-500/10 text-green-700 dark:text-green-400'
  };
  return colors[status];
};

export const ReuniaoCard = ({ reuniao, onClick }: ReuniaoCardProps) => {
  return (
    <Card
      className="p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{
        borderLeftColor: reuniao.status === '1ª reunião' ? '#3b82f6' :
                         reuniao.status === 'em contato' ? '#eab308' :
                         reuniao.status === 'inviável' ? '#ef4444' : '#22c55e'
      }}
      onClick={onClick}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm line-clamp-1">{reuniao.titulo}</h4>
          <Badge variant="secondary" className={cn('text-xs', getStatusColor(reuniao.status))}>
            {reuniao.status}
          </Badge>
        </div>

        {reuniao.cliente_nome && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="line-clamp-1">{reuniao.cliente_nome}</span>
          </div>
        )}

        {reuniao.cliente_telefone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>{reuniao.cliente_telefone}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{reuniao.duracao_minutos} min</span>
        </div>

        {reuniao.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
            {reuniao.descricao}
          </p>
        )}
      </div>
    </Card>
  );
};
