import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, FilePlus2, Bell, BellOff, ChevronRight } from 'lucide-react';
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
  const [busca, setBusca] = useState('');
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
      try {
        const { data, error } = await supabase.functions.invoke(
          'super-admin-listar-processos-oab',
          { body: { tenant_id: tenant.id, aba } },
        );
        if (error) throw error;
        if (!cancel) setProcessos((data as any)?.processos || []);
      } catch (e) {
        console.error(e);
        toast.error('Erro ao carregar processos do tenant');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [open, tenant.id, aba, reloadKey]);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return processos;
    return processos.filter(
      (p) =>
        p.numero_cnj?.toLowerCase().includes(t) ||
        p.parte_ativa?.toLowerCase().includes(t) ||
        p.parte_passiva?.toLowerCase().includes(t),
    );
  }, [processos, busca]);

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
            <div className="text-xs text-muted-foreground">
              {loading ? 'Carregando…' : `${filtrados.length} processo(s)`}
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtrados.length === 0 ? (
              <div className="text-center py-16 text-sm text-muted-foreground">
                Nenhum processo encontrado.
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