import { AlertTriangle } from 'lucide-react';
import { useBillingAlert } from '@/hooks/useBillingAlert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BillingAlertIndicatorProps {
  onOpenSubscription: () => void;
}

export function BillingAlertIndicator({ onOpenSubscription }: BillingAlertIndicatorProps) {
  const { alertBoletos, alertCount } = useBillingAlert();

  if (alertCount === 0) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex items-center justify-center h-8 w-8 md:h-9 md:w-9 rounded-md hover:bg-destructive/10 transition-colors"
          title="Faturas pendentes"
        >
          <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
            {alertCount}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-3 py-2 border-b">
          <p className="text-sm font-medium text-destructive">
            Você possui {alertCount} fatura{alertCount > 1 ? 's' : ''} se aproximando do vencimento
          </p>
        </div>
        {alertBoletos.map((boleto) => (
          <DropdownMenuItem
            key={boleto.id}
            onClick={onOpenSubscription}
            className="flex justify-between cursor-pointer"
          >
            <span className="text-sm">{boleto.mes_referencia}</span>
            <span className="text-sm font-medium">{formatCurrency(boleto.valor)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
