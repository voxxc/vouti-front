import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClienteParcela } from '@/types/financeiro';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, AlertCircle, AlertTriangle, DollarSign, MoreVertical, RotateCcw, Edit, FileText } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface ParcelaCardProps {
  parcela: ClienteParcela;
  isProximoVencimento?: boolean;
  isExpanded?: boolean;
  showJurosMulta?: boolean;
  calcularValorAtualizado?: (parcela: ClienteParcela) => {
    valorOriginal: number;
    multa: number;
    juros: number;
    valorAtualizado: number;
    mesesAtraso: number;
  };
  onToggleDetails: () => void;
  onDarBaixa: () => void;
  onEditarParcela: () => void;
  onEditarPagamento?: () => void;
  onReabrirPagamento?: () => void;
  children?: React.ReactNode;
}

export const ParcelaCard = ({
  parcela,
  isProximoVencimento = false,
  isExpanded = false,
  showJurosMulta = false,
  calcularValorAtualizado,
  onToggleDetails,
  onDarBaixa,
  onEditarParcela,
  onEditarPagamento,
  onReabrirPagamento,
  children,
}: ParcelaCardProps) => {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string; className?: string }> = {
      pago: { variant: 'default', icon: CheckCircle2, label: 'Pago' },
      pendente: { variant: 'secondary', icon: Clock, label: 'Pendente' },
      atrasado: { variant: 'destructive', icon: AlertCircle, label: 'Atrasado' },
      parcial: { variant: 'outline', icon: AlertTriangle, label: 'Parcial', className: 'bg-amber-500/20 text-amber-700 border-amber-500' },
    };

    const config = variants[status] || variants.pendente;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={cn("gap-1 text-[10px] px-1.5 py-0", config.className)}>
        <Icon className="w-2.5 h-2.5" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div
      className={cn(
        "px-3 py-2 rounded-md border bg-card hover:bg-accent/30 transition-colors relative",
        isProximoVencimento && "border-primary bg-primary/5"
      )}
    >
      {isProximoVencimento && (
        <Badge variant="default" className="absolute -top-2 -right-2 text-[9px] px-1.5 py-0">
          Próximo
        </Badge>
      )}
      
      <div className="flex items-center gap-3">
        {/* Coluna: Número + Status */}
        <div className="flex items-center gap-2 min-w-[100px]">
          <span className="text-sm font-medium">#{parcela.numero_parcela}</span>
          {getStatusBadge(parcela.status)}
        </div>

        {/* Coluna: Valor */}
        <div className="flex-1 min-w-[100px]">
          <p className="text-[10px] uppercase text-muted-foreground leading-none mb-0.5">Valor</p>
          <p className="text-sm font-semibold leading-tight">{formatCurrency(Number(parcela.valor_parcela))}</p>
          {/* Juros/Multa inline para atrasados */}
          {parcela.status === 'atrasado' && showJurosMulta && calcularValorAtualizado && (() => {
            const calc = calcularValorAtualizado(parcela);
            if (calc.multa > 0 || calc.juros > 0) {
              return (
                <p className="text-[10px] text-destructive">
                  Total: {formatCurrency(calc.valorAtualizado)}
                </p>
              );
            }
            return null;
          })()}
        </div>

        {/* Coluna: Vencimento */}
        <div className="flex-1 min-w-[90px]">
          <p className="text-[10px] uppercase text-muted-foreground leading-none mb-0.5">Vencimento</p>
          <p className="text-sm font-medium leading-tight">
            {format(new Date(parcela.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
          </p>
        </div>

        {/* Coluna: Pago em (se aplicável) */}
        {parcela.data_pagamento && (
          <div className="flex-1 min-w-[90px]">
            <p className="text-[10px] uppercase text-muted-foreground leading-none mb-0.5">Pago em</p>
            <p className="text-sm font-medium text-primary leading-tight">
              {format(new Date(parcela.data_pagamento), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </div>
        )}

        {/* Coluna: Saldo parcial (se aplicável) */}
        {parcela.status === 'parcial' && (
          <div className="flex-1 min-w-[90px]">
            <p className="text-[10px] uppercase text-amber-600 leading-none mb-0.5">Saldo Aberto</p>
            <p className="text-sm font-medium text-amber-600 leading-tight">
              {formatCurrency(Number(parcela.saldo_restante ?? 0))}
            </p>
          </div>
        )}

        {/* Ações centralizadas */}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={onToggleDetails}
          >
            {isExpanded ? 'Ocultar' : 'Detalhes'}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border">
              {(parcela.status === 'pendente' || parcela.status === 'atrasado' || parcela.status === 'parcial') && (
                <DropdownMenuItem onClick={onDarBaixa} className="gap-2 cursor-pointer text-xs">
                  <DollarSign className="h-3.5 w-3.5" />
                  {parcela.status === 'parcial' ? 'Completar Pagamento' : 'Dar Baixa'}
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem onClick={onEditarParcela} className="gap-2 cursor-pointer text-xs">
                <Edit className="h-3.5 w-3.5" />
                Editar Parcela
              </DropdownMenuItem>
              
              {(parcela.status === 'pago' || parcela.status === 'parcial') && onEditarPagamento && (
                <DropdownMenuItem onClick={onEditarPagamento} className="gap-2 cursor-pointer text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  Editar Pagamento
                </DropdownMenuItem>
              )}
              
              {parcela.status === 'pago' && onReabrirPagamento && (
                <DropdownMenuItem onClick={onReabrirPagamento} className="gap-2 cursor-pointer text-destructive text-xs">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reabrir Pagamento
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Observações inline (se houver) */}
      {parcela.observacoes && (
        <p className="text-[11px] text-muted-foreground mt-1.5 pl-[100px]">
          {parcela.observacoes}
        </p>
      )}

      {/* Área expandível */}
      {isExpanded && children && (
        <div className="mt-3 pt-3 border-t">
          {children}
        </div>
      )}
    </div>
  );
};
