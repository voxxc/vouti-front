import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, RefreshCw, Clock } from 'lucide-react';
import { Tenant } from '@/types/superadmin';
import { useTenantProcessosParados } from '@/hooks/useTenantProcessosParados';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
}

const PERIODOS = [
  { value: 15, label: '15 dias' },
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
  { value: 90, label: '90 dias' },
];

export function TenantProcessosParadosDialog({ open, onOpenChange, tenant }: Props) {
  const [dias, setDias] = useState<number>(30);
  const { data, isLoading, refetch, isFetching } = useTenantProcessosParados(tenant.id, dias, open);

  const total = data?.length || 0;

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
  };

  const openInTenant = (cnj: string) => {
    window.open(`/${tenant.slug}/processos?cnj=${encodeURIComponent(cnj)}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Processos Parados — {tenant.name}
          </DialogTitle>
          <DialogDescription>
            Processos monitorados sem movimentação real do tribunal no período selecionado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 py-2">
          <Select value={String(dias)} onValueChange={(v) => setDias(Number(v))}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODOS.map((p) => (
                <SelectItem key={p.value} value={String(p.value)}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <div className="flex-1" />

          <Badge variant={total > 0 ? 'destructive' : 'secondary'}>
            {total} {total === 1 ? 'processo parado' : 'processos parados'}
          </Badge>
        </div>

        <div className="flex-1 overflow-auto border border-border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : total === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum processo parado há mais de {dias} dias.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CNJ</TableHead>
                  <TableHead>Partes</TableHead>
                  <TableHead>Tribunal</TableHead>
                  <TableHead>Última movimentação</TableHead>
                  <TableHead className="text-center">Dias parado</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.numero_cnj}</TableCell>
                    <TableCell className="max-w-[260px]">
                      <div className="text-xs truncate">{p.parte_ativa || '—'}</div>
                      <div className="text-xs text-muted-foreground truncate">x {p.parte_passiva || '—'}</div>
                    </TableCell>
                    <TableCell className="text-xs">{p.tribunal_sigla || '—'}</TableCell>
                    <TableCell className="text-xs">
                      {p.ultima_movimentacao ? formatDate(p.ultima_movimentacao) : (
                        <span className="text-muted-foreground italic">sem andamentos</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.dias_sem_movimentacao > 60 ? 'destructive' : 'secondary'}>
                        {p.dias_sem_movimentacao}d
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => openInTenant(p.numero_cnj)}>
                        <ExternalLink className="h-3 w-3" />
                        Abrir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
