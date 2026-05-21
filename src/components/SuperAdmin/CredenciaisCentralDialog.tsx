import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { KeyRound, RefreshCw } from 'lucide-react';
import { useAllCredenciaisPendentes } from '@/hooks/useAllCredenciaisPendentes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface CredenciaisCentralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CredenciaisCentralDialog({ open, onOpenChange }: CredenciaisCentralDialogProps) {
  const { credenciaisAgrupadas, totalPendentes, isLoading, refetch } = useAllCredenciaisPendentes();

  const formatCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Achata e ordena por data desc para uma lista única, minimalista.
  const flat = credenciaisAgrupadas.flatMap((g) =>
    g.credenciais.map((c) => ({ ...c, tenant_name: g.tenant_name }))
  );
  flat.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[72vh] p-6 rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <DialogTitle className="text-base font-medium tracking-tight">
              Credenciais pendentes
            </DialogTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {totalPendentes} {totalPendentes === 1 ? 'item' : 'itens'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => refetch()}
                disabled={isLoading}
                aria-label="Atualizar"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[56vh] -mx-2 px-2">
          {isLoading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : flat.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <KeyRound className="h-6 w-6 text-muted-foreground/60 mb-3" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">
                Nenhuma credencial pendente
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {flat.map((cred) => {
                const oabLabel = cred.oab_numero && cred.oab_uf
                  ? `OAB ${cred.oab_numero}/${cred.oab_uf}`
                  : null;
                const primary = [oabLabel, cred.nome_advogado].filter(Boolean).join(' · ');
                const secondary = [
                  cred.cpf ? formatCPF(cred.cpf) : null,
                  cred.system_name,
                  cred.tenant_name,
                ].filter(Boolean).join(' · ');
                return (
                  <li key={cred.id} className="py-3 first:pt-2 last:pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {primary || cred.nome_advogado || 'Credencial'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {secondary}
                        </p>
                      </div>
                      <span
                        className="text-[11px] text-muted-foreground/80 whitespace-nowrap shrink-0"
                        title={cred.created_at ? format(new Date(cred.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                      >
                        {cred.created_at
                          ? formatDistanceToNow(new Date(cred.created_at), { locale: ptBR, addSuffix: true })
                          : '—'}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
