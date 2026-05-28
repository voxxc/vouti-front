import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, ExternalLink, RefreshCw, ShieldAlert, Search } from 'lucide-react';
import { Tenant } from '@/types/superadmin';
import { useTenantProcessosSigilosos } from '@/hooks/useTenantProcessosSigilosos';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
}

const NIVEL_LABEL: Record<number, string> = {
  1: 'Segredo de justiça',
  2: 'Sigilo nível 2',
  3: 'Sigilo nível 3',
  4: 'Sigilo nível 4',
  5: 'Sigilo absoluto',
};

function nivelVariant(level: number): 'default' | 'destructive' | 'secondary' {
  if (level >= 5) return 'destructive';
  if (level >= 2) return 'default';
  return 'secondary';
}

export function TenantProcessosSigilososDialog({ open, onOpenChange, tenant }: Props) {
  const { data, isLoading, isFetching, refetch } = useTenantProcessosSigilosos(tenant.id, open);
  const [nivel, setNivel] = useState<string>('todos');
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    const lista = data || [];
    const termo = busca.trim().toLowerCase();
    return lista.filter((p) => {
      if (nivel !== 'todos' && String(p.secrecy_level) !== nivel) return false;
      if (!termo) return true;
      return (
        p.numero_cnj?.toLowerCase().includes(termo) ||
        p.parte_ativa?.toLowerCase().includes(termo) ||
        p.parte_passiva?.toLowerCase().includes(termo)
      );
    });
  }, [data, nivel, busca]);

  const total = data?.length || 0;
  const niveisPresentes = useMemo(() => {
    const set = new Set<number>();
    (data || []).forEach((p) => set.add(p.secrecy_level));
    return Array.from(set).sort((a, b) => a - b);
  }, [data]);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
  };

  const openInTenant = (cnj: string) => {
    window.open(`/${tenant.slug}/processos?cnj=${encodeURIComponent(cnj)}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Processos Sigilosos — {tenant.name}
          </DialogTitle>
          <DialogDescription>
            Processos com segredo de justiça ou sigilo absoluto identificados a partir dos detalhes retornados pela Judit.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3 py-2">
          <Select value={nivel} onValueChange={setNivel}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Nível de sigilo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os níveis</SelectItem>
              {niveisPresentes.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  Nível {n} — {NIVEL_LABEL[n] || 'Sigiloso'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar CNJ ou parte..."
              className="pl-8 h-9"
            />
          </div>

          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <div className="flex-1" />

          <Badge variant={total > 0 ? 'destructive' : 'secondary'}>
            {total} {total === 1 ? 'processo sigiloso' : 'processos sigilosos'}
          </Badge>
        </div>

        <div className="flex-1 overflow-auto border border-border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {total === 0
                ? 'Nenhum processo sigiloso encontrado para este tenant.'
                : 'Nenhum processo bate com o filtro selecionado.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CNJ</TableHead>
                  <TableHead>Partes</TableHead>
                  <TableHead>Tribunal</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead className="text-center">Monitorado</TableHead>
                  <TableHead>Última atualização</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.numero_cnj}</TableCell>
                    <TableCell className="max-w-[260px]">
                      <div className="text-xs truncate">{p.parte_ativa || '—'}</div>
                      <div className="text-xs text-muted-foreground truncate">x {p.parte_passiva || '—'}</div>
                    </TableCell>
                    <TableCell className="text-xs">{p.tribunal_sigla || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={nivelVariant(p.secrecy_level)}>
                        {p.secrecy_level} — {NIVEL_LABEL[p.secrecy_level] || 'Sigiloso'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.monitoramento_ativo ? 'default' : 'secondary'}>
                        {p.monitoramento_ativo ? 'Sim' : 'Não'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(p.ultima_atualizacao_detalhes)}</TableCell>
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