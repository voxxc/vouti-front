import { useEffect, useMemo, useState } from 'react';
import { Activity, Loader2, RefreshCw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type TrackingItem = {
  tracking_id: string;
  status: string | null;
  created_at: string | null;
  recurrence: string | number | null;
  reference: string | null;
  tenant_id: string | null;
  tenant_nome: string | null;
  tipo: 'CNJ' | 'OAB' | 'Banco' | 'Desativado' | 'Órfão' | string;
  orfao: boolean;
};

export function SuperAdminTrackingsJudit() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<TrackingItem[]>([]);
  const [totalReported, setTotalReported] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [orfaosOnly, setOrfaosOnly] = useState(false);
  const [busca, setBusca] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('judit-listar-trackings', {
        body: { status: statusFilter, fetchAll: true, pageSize: 100 },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao listar');
      setItems(data.items ?? []);
      setTotalReported(data.totalReported ?? null);
    } catch (e: any) {
      toast({
        title: 'Erro ao carregar trackings',
        description: e?.message ?? 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const counts = useMemo(() => {
    const ativos = items.filter((i) => i.status === 'active' || i.status === 'created').length;
    const pausados = items.filter((i) => i.status === 'paused').length;
    const orfaos = items.filter((i) => i.orfao).length;
    return { total: items.length, ativos, pausados, orfaos };
  }, [items]);

  const tenantOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of items) {
      if (i.tenant_id) map.set(i.tenant_id, i.tenant_nome ?? i.tenant_id);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [items]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return items.filter((i) => {
      if (orfaosOnly && !i.orfao) return false;
      if (tipoFilter !== 'all' && i.tipo !== tipoFilter) return false;
      if (tenantFilter !== 'all') {
        if (tenantFilter === '__orfao__' && !i.orfao) return false;
        if (tenantFilter !== '__orfao__' && i.tenant_id !== tenantFilter) return false;
      }
      if (q) {
        const hay = `${i.tracking_id} ${i.reference ?? ''} ${i.tenant_nome ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, busca, tipoFilter, tenantFilter, orfaosOnly]);

  const formatDate = (s: string | null) => {
    if (!s) return '—';
    try {
      return new Date(s).toLocaleString('pt-BR');
    } catch {
      return s;
    }
  };

  const statusBadge = (s: string | null) => {
    if (!s) return <Badge variant="outline">—</Badge>;
    if (s === 'paused')
      return (
        <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
          Pausado
        </Badge>
      );
    if (s === 'active' || s === 'created')
      return (
        <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
          Ativo
        </Badge>
      );
    return <Badge variant="outline">{s}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" /> Trackings Judit
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Inventário em tempo real de todos os monitoramentos na Judit
            {totalReported != null ? ` (Judit reporta ${totalReported})` : ''}.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contadores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-2xl font-semibold">{counts.total}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Ativos</div>
            <div className="text-2xl font-semibold text-emerald-600">{counts.ativos}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Pausados</div>
            <div className="text-2xl font-semibold text-amber-600">{counts.pausados}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Órfãos</div>
            <div className="text-2xl font-semibold text-rose-600">{counts.orfaos}</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="paused">Pausados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="CNJ">CNJ</SelectItem>
              <SelectItem value="OAB">OAB</SelectItem>
              <SelectItem value="Banco">Banco</SelectItem>
              <SelectItem value="Desativado">Desativado</SelectItem>
              <SelectItem value="Órfão">Órfão</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Tenant" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tenants</SelectItem>
              <SelectItem value="__orfao__">Sem tenant (órfão)</SelectItem>
              {tenantOptions.map(([id, nome]) => (
                <SelectItem key={id} value={id}>{nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={orfaosOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOrfaosOnly((v) => !v)}
          >
            Apenas órfãos
          </Button>

          <div className="relative ml-auto w-72">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar CNJ, tracking, tenant…"
              className="pl-8"
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Status</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead className="w-24">Tipo</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead className="w-44">Criado em</TableHead>
                <TableHead className="w-64">Tracking ID</TableHead>
                <TableHead className="w-16 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum tracking encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((i) => (
                  <TableRow key={i.tracking_id} className={i.orfao ? 'bg-rose-500/5' : ''}>
                    <TableCell>{statusBadge(i.status)}</TableCell>
                    <TableCell className="font-mono text-xs">{i.reference ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{i.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {i.tenant_nome ?? (
                        <span className="text-rose-600">— sem vínculo —</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(i.created_at)}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground truncate max-w-[16rem]">
                      {i.tracking_id}
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled
                                className="h-7 w-7 text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Em breve: apagar tracking</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          Mostrando {filtered.length} de {items.length} carregados.
        </p>
      </CardContent>
    </Card>
  );
}