import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Building2, User, Calendar, KeyRound, RefreshCw, Scale } from 'lucide-react';
import { useAllCredenciaisPendentes } from '@/hooks/useAllCredenciaisPendentes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Central de Credenciais</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Credenciais pendentes de todos os tenants
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-base px-3 py-1">
                {totalPendentes} pendente{totalPendentes !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ) : credenciaisAgrupadas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <KeyRound className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-lg">Nenhuma credencial pendente</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Todas as credenciais foram processadas
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {credenciaisAgrupadas.map((grupo) => (
                <div key={grupo.tenant_id} className="space-y-3">
                  {/* Header do Tenant */}
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">
                      {grupo.tenant_name}
                    </span>
                    <Badge variant="outline" className="ml-auto">
                      {grupo.credenciais.length} credencia{grupo.credenciais.length !== 1 ? 'is' : 'l'}
                    </Badge>
                  </div>

                  {/* Lista de Credenciais */}
                  <div className="space-y-2 pl-4">
                    {grupo.credenciais.map((cred) => (
                      <div
                        key={cred.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col gap-1">
                            {cred.oab_numero && cred.oab_uf && (
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono">
                                  OAB {cred.oab_numero}/{cred.oab_uf}
                                </Badge>
                                {cred.nome_advogado && (
                                  <span className="text-sm text-muted-foreground">
                                    {cred.nome_advogado}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="font-mono text-muted-foreground">
                                CPF: {formatCPF(cred.cpf)}
                              </span>
                            </div>
                            {cred.system_name && (
                              <div className="flex items-center gap-2 text-sm">
                                <Scale className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {cred.system_name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {cred.created_at && format(new Date(cred.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
