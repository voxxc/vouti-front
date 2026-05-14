import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, ShieldAlert, History } from 'lucide-react';
import { fetchAllPaginated } from '@/lib/supabasePagination';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type AuditRow = {
  id: string;
  acao: string;
  carteira_id: string | null;
  project_processo_id: string | null;
  projeto_id: string | null;
  workspace_id: string | null;
  tenant_id: string | null;
  actor_user_id: string | null;
  motivo: string | null;
  snapshot: any;
  created_at: string;
};

const ACAO_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  insert: { label: 'Vinculado', variant: 'secondary' },
  delete: { label: 'Removido', variant: 'outline' },
  cascade_processo_deletado: { label: 'Cascata: Processo apagado', variant: 'destructive' },
  cascade_carteira_deletada: { label: 'Cascata: Carteira apagada', variant: 'destructive' },
};

export function SuperAdminCarteirasAudit() {
  const [filtroAcao, setFiltroAcao] = useState<string>('todas');
  const [busca, setBusca] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['pcp-audit-superadmin'],
    queryFn: async () => {
      const rows = await fetchAllPaginated<AuditRow>(
        (from, to) =>
          supabase
            .from('project_carteira_processos_audit')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, to),
        { pageSize: 1000, hardCap: 5000 }
      );
      return rows;
    },
  });

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (filtroAcao !== 'todas') rows = rows.filter(r => r.acao === filtroAcao);
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      rows = rows.filter(r =>
        [r.carteira_id, r.project_processo_id, r.projeto_id, r.workspace_id, r.tenant_id, r.motivo]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q))
      );
    }
    return rows;
  }, [data, filtroAcao, busca]);

  const stats = useMemo(() => {
    const rows = data ?? [];
    return {
      total: rows.length,
      cascade: rows.filter(r => r.acao.startsWith('cascade_')).length,
      delete: rows.filter(r => r.acao === 'delete').length,
      insert: rows.filter(r => r.acao === 'insert').length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" /> Auditoria de Carteiras
          </h2>
          <p className="text-muted-foreground">
            Histórico de inclusões, remoções e cascatas em <code>project_carteira_processos</code>.
            Use para rastrear sumiço de processos dentro de carteiras de workspace.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total de eventos</CardDescription><CardTitle>{stats.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Vínculos criados</CardDescription><CardTitle>{stats.insert}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Remoções manuais</CardDescription><CardTitle>{stats.delete}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription className="text-destructive">Cascatas</CardDescription><CardTitle className="text-destructive">{stats.cascade}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Linha do tempo</CardTitle>
          <CardDescription>Todos os eventos auditados, mais recentes primeiro.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={filtroAcao} onValueChange={setFiltroAcao}>
              <SelectTrigger className="w-full sm:w-[260px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as ações</SelectItem>
                <SelectItem value="insert">Vinculado</SelectItem>
                <SelectItem value="delete">Removido</SelectItem>
                <SelectItem value="cascade_processo_deletado">Cascata: Processo apagado</SelectItem>
                <SelectItem value="cascade_carteira_deletada">Cascata: Carteira apagada</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Buscar por carteira, processo, projeto, workspace, tenant ou motivo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando auditoria...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum evento encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Carteira</TableHead>
                    <TableHead>Processo</TableHead>
                    <TableHead>Projeto / Workspace</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 500).map((row) => {
                    const meta = ACAO_BADGE[row.acao] ?? { label: row.acao, variant: 'outline' as const };
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(row.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                        <TableCell className="font-mono text-[10px]">{row.carteira_id?.slice(0, 8) ?? '—'}</TableCell>
                        <TableCell className="font-mono text-[10px]">{row.project_processo_id?.slice(0, 8) ?? '—'}</TableCell>
                        <TableCell className="font-mono text-[10px]">
                          {row.projeto_id?.slice(0, 8) ?? '—'} / {row.workspace_id?.slice(0, 8) ?? '—'}
                        </TableCell>
                        <TableCell className="font-mono text-[10px]">{row.tenant_id?.slice(0, 8) ?? '—'}</TableCell>
                        <TableCell className="text-xs max-w-[280px] truncate" title={row.motivo ?? ''}>
                          {row.motivo ?? '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filtered.length > 500 && (
                <div className="text-xs text-muted-foreground text-center py-2 border-t">
                  Exibindo 500 de {filtered.length} eventos. Refine os filtros para ver mais.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}