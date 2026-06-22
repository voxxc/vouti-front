import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, FilePlus2, Bell, BellOff, ChevronRight, Filter, ShieldAlert, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Tenant } from '@/types/superadmin';
import { SuperAdminProcessoOABDetalhesPanel } from './SuperAdminProcessoOABDetalhesPanel';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
}

interface ProcessoLite {
  id: string;
  numero_cnj: string;
  parte_ativa: string | null;
  parte_passiva: string | null;
  tribunal_sigla: string | null;
  monitoramento_ativo?: boolean;
  total_andamentos?: number;
  ultima_atualizacao_detalhes?: string | null;
  super_admin_atualizado_em?: string | null;
  is_sigiloso?: boolean;
  uf?: string;
}

type Aba = 'total' | 'atualizado';

const VISITADO_KEY = 'superadmin:processo-visitado:v1';
const VISITADO_TTL_MS = 24 * 60 * 60 * 1000;

function lerVisitados(): Record<string, number> {
  try {
    const raw = localStorage.getItem(VISITADO_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    const agora = Date.now();
    let mudou = false;
    for (const k of Object.keys(parsed)) {
      if (typeof parsed[k] !== 'number' || agora - parsed[k] >= VISITADO_TTL_MS) {
        delete parsed[k];
        mudou = true;
      }
    }
    if (mudou) localStorage.setItem(VISITADO_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return {};
  }
}

export function SuperAdminMovimentosManuaisDrawer({ open, onOpenChange, tenant }: Props) {
  const [loading, setLoading] = useState(false);
  const [processos, setProcessos] = useState<ProcessoLite[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<string>('todos');
  const [selecionado, setSelecionado] = useState<ProcessoLite | null>(null);
  const [aba, setAba] = useState<Aba>('total');
  const [reloadKey, setReloadKey] = useState(0);
  const [visitados, setVisitados] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) setVisitados(lerVisitados());
  }, [open, reloadKey]);

  const marcarVisitado = useCallback((id: string) => {
    setVisitados((prev) => {
      const novo = { ...prev, [id]: Date.now() };
      try {
        localStorage.setItem(VISITADO_KEY, JSON.stringify(novo));
      } catch {}
      return novo;
    });
  }, []);

  const isVisitado = (id: string) => {
    const t = visitados[id];
    return typeof t === 'number' && Date.now() - t < VISITADO_TTL_MS;
  };

  const recarregar = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      setErro(null);
      setProcessos([]);
      try {
        const { data, error } = await supabase.functions.invoke(
          'super-admin-listar-processos-oab',
          { body: { tenant_id: tenant.id, aba } },
        );
        if (error) throw error;
        if (!cancel) setProcessos((data as any)?.processos || []);
      } catch (e) {
        console.error(e);
        const msg = (e as any)?.message || 'Erro ao carregar processos do tenant';
        if (!cancel) setErro(msg);
        toast.error('Erro ao carregar processos do tenant');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [open, tenant.id, aba, reloadKey]);

  const counts = useMemo(() => {
    let monitorados = 0;
    let naoMonitorados = 0;
    let sigilosos = 0;
    const ufs = new Map<string, number>();
    for (const p of processos) {
      if (p.monitoramento_ativo) monitorados++;
      else naoMonitorados++;
      if (p.is_sigiloso) sigilosos++;
      const uf = p.uf || 'N/I';
      ufs.set(uf, (ufs.get(uf) || 0) + 1);
    }
    return {
      total: processos.length,
      monitorados,
      naoMonitorados,
      sigilosos,
      ufs: Array.from(ufs.entries())
        .map(([uf, count]) => ({ uf, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, [processos]);

  const filtrados = useMemo(() => {
    let base = processos;
    if (filtro === 'monitorados') base = base.filter((p) => p.monitoramento_ativo);
    else if (filtro === 'nao_monitorados') base = base.filter((p) => !p.monitoramento_ativo);
    else if (filtro === 'sigilosos') base = base.filter((p) => p.is_sigiloso);
    else if (filtro.startsWith('uf:')) {
      const uf = filtro.slice(3);
      base = base.filter((p) => (p.uf || 'N/I') === uf);
    }
    const t = busca.trim().toLowerCase();
    if (!t) return base;
    return base.filter(
      (p) =>
        p.numero_cnj?.toLowerCase().includes(t) ||
        p.parte_ativa?.toLowerCase().includes(t) ||
        p.parte_passiva?.toLowerCase().includes(t),
    );
  }, [processos, busca, filtro]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-none p-0 flex flex-col"
          style={{ width: '100vw', maxWidth: '100vw' }}
        >
          <SheetHeader className="p-6 pb-3 border-b">
            <SheetTitle className="flex items-center gap-2">
              <FilePlus2 className="h-5 w-5 text-primary" />
              Movimentos manuais — {tenant.name}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Selecione um processo para ver detalhes, monitoramento e lançar movimentos
              manualmente. Movimentos manuais aparecem imediatamente na Central de Não Lidos
              dos usuários do tenant.
            </p>
          </SheetHeader>

          <div className="px-6 pt-3">
            <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)}>
              <TabsList className="bg-transparent border-b w-full justify-start rounded-none p-0 h-auto">
                <TabsTrigger
                  value="total"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
                >
                  Total
                </TabsTrigger>
                <TabsTrigger
                  value="atualizado"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
                >
                  Atualizado
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="px-6 py-3 border-b flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por CNJ, parte ativa ou passiva…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filtro} onValueChange={setFiltro}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos ({counts.total})</SelectItem>
                  {counts.monitorados > 0 && (
                    <SelectItem value="monitorados">
                      <span className="flex items-center gap-2">
                        <Bell className="w-3 h-3 text-green-500" />
                        Monitorados ({counts.monitorados})
                      </span>
                    </SelectItem>
                  )}
                  {counts.naoMonitorados > 0 && (
                    <SelectItem value="nao_monitorados">
                      <span className="flex items-center gap-2">
                        <BellOff className="w-3 h-3 text-muted-foreground" />
                        Não monitorados ({counts.naoMonitorados})
                      </span>
                    </SelectItem>
                  )}
                  {counts.sigilosos > 0 && (
                    <SelectItem value="sigilosos">
                      <span className="flex items-center gap-2">
                        <ShieldAlert className="w-3 h-3 text-amber-500" />
                        Sigilosos ({counts.sigilosos})
                      </span>
                    </SelectItem>
                  )}
                  {counts.ufs.map(({ uf, count }) => (
                    <SelectItem key={uf} value={`uf:${uf}`}>
                      {uf} - {count}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground">
              {loading ? 'Carregando…' : `${filtrados.length} processo(s)`}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={recarregar}
              disabled={loading}
              title="Recarregar"
            >
              <RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : erro ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-sm">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Falha ao carregar processos
                </div>
                <div className="text-xs text-muted-foreground max-w-md text-center">
                  {erro}
                </div>
                <Button size="sm" variant="outline" onClick={recarregar}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Tentar novamente
                </Button>
              </div>
            ) : filtrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-sm text-muted-foreground">
                Nenhum processo encontrado.
                <Button size="sm" variant="outline" onClick={recarregar}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Recarregar
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[210px]">CNJ</TableHead>
                    <TableHead>Partes</TableHead>
                    <TableHead className="w-[90px]">Tribunal</TableHead>
                    <TableHead className="w-[110px] text-center">Andamentos</TableHead>
                    <TableHead className="w-[110px] text-center">Monitor.</TableHead>
                    {aba === 'atualizado' && (
                      <TableHead className="w-[160px]">Atualizado</TableHead>
                    )}
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((p) => (
                    <TableRow
                      key={p.id}
                      className={
                        'cursor-pointer ' +
                        (isVisitado(p.id)
                          ? 'hover:bg-muted/50'
                          : 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/15')
                      }
                      onClick={() => {
                        marcarVisitado(p.id);
                        setSelecionado(p);
                      }}
                    >
                      <TableCell className="font-mono text-xs">
                        <span className="inline-flex items-center gap-2">
                          {!isVisitado(p.id) && (
                            <span
                              className="h-2 w-2 rounded-full bg-orange-500 shrink-0"
                              aria-label="Não visitado nas últimas 24h"
                            />
                          )}
                          {p.numero_cnj}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs max-w-md">
                        <div className="truncate">
                          <span className="text-foreground">{p.parte_ativa || '—'}</span>
                          <span className="opacity-60 mx-1">×</span>
                          <span className="text-muted-foreground">{p.parte_passiva || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.tribunal_sigla ? (
                          <Badge variant="outline" className="text-xs">{p.tribunal_sigla}</Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {p.total_andamentos ?? 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {p.monitoramento_ativo ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                            <Bell className="h-3 w-3" /> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <BellOff className="h-3 w-3" /> Pausado
                          </span>
                        )}
                      </TableCell>
                      {aba === 'atualizado' && (
                        <TableCell className="text-xs text-muted-foreground">
                          {(() => {
                            if (!p.super_admin_atualizado_em) return '—';
                            const ms =
                              new Date(p.super_admin_atualizado_em).getTime() +
                              7 * 24 * 60 * 60 * 1000 -
                              Date.now();
                            const dias = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
                            return `expira em ${dias}d`;
                          })()}
                        </TableCell>
                      )}
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {selecionado && (
        <SuperAdminProcessoOABDetalhesPanel
          open={!!selecionado}
          onOpenChange={(o) => !o && setSelecionado(null)}
          processo={selecionado}
          tenantNome={tenant.name}
          onAndamentoCriado={recarregar}
        />
      )}
    </>
  );
}