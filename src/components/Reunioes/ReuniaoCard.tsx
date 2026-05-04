import { Reuniao } from '@/types/reuniao';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Phone, X, CalendarClock, UserCheck, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ReuniaoCardProps {
  reuniao: Reuniao;
  onClick: () => void;
  onDesmarcar?: (reuniao: Reuniao) => void;
  onRemarcar?: (reuniao: Reuniao) => void;
  onAbrirCliente?: (reuniao: Reuniao) => void;
  isLoadingLead?: boolean;
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

export const ReuniaoCard = ({ reuniao, onClick, onDesmarcar, onRemarcar, onAbrirCliente, isLoadingLead }: ReuniaoCardProps) => {
  const hasLead = !!(reuniao.cliente_id || reuniao.cliente_nome || reuniao.cliente_telefone || reuniao.cliente_email);
  return (
    <Card
      className="p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4 group"
      style={{
        borderLeftColor: reuniao.status === '1ª reunião' ? '#3b82f6' :
                         reuniao.status === 'em contato' ? '#eab308' :
                         reuniao.status === 'inviável' ? '#ef4444' : '#22c55e'
      }}
      onClick={onClick}
    >
      <TooltipProvider delayDuration={200}>
        <div className="space-y-1.5">
          {/* Header: título + status + ações */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h4 className="font-semibold text-sm line-clamp-1">{reuniao.titulo}</h4>
              <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 shrink-0', getStatusColor(reuniao.status))}>
                {reuniao.status}
              </Badge>
            </div>
            <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
              {onRemarcar && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); onRemarcar(reuniao); }}
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remarcar</TooltipContent>
                </Tooltip>
              )}
              {onDesmarcar && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); onDesmarcar(reuniao); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Desmarcar</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Cliente clicável */}
          {reuniao.cliente_nome && (
            hasLead && onAbrirCliente ? (
              <button
                type="button"
                disabled={isLoadingLead}
                onClick={(e) => { e.stopPropagation(); if (!isLoadingLead) onAbrirCliente(reuniao); }}
                className="text-xs text-primary hover:underline line-clamp-1 text-left inline-flex items-center gap-1 disabled:opacity-70 disabled:cursor-wait"
              >
                {isLoadingLead && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>{reuniao.cliente_nome}</span>
              </button>
            ) : (
              <p className="text-xs text-muted-foreground line-clamp-1">{reuniao.cliente_nome}</p>
            )
          )}

          {/* Meta inline */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {reuniao.cliente_telefone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {reuniao.cliente_telefone}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {reuniao.duracao_minutos} min
            </span>
          </div>

          {reuniao.criado_por_nome && (
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
              <UserCheck className="h-3 w-3" />
              {reuniao.criado_por_nome}
            </p>
          )}

          {reuniao.descricao && (
            <p className="text-[11px] text-muted-foreground line-clamp-2">
              {reuniao.descricao}
            </p>
          )}
        </div>
      </TooltipProvider>
    </Card>
  );
};
