import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Play, Eye, Calculator, Download, RefreshCw, FastForward, StopCircle } from 'lucide-react';
import { useJuditSystemNames } from '@/hooks/useJuditSystemNames';
import { useRebindCredencialJudit } from '@/hooks/useRebindCredencialJudit';

interface Props {
  tenantId?: string;
}

const PRESETS: { label: string; pattern: string }[] = [
  { label: 'TJPR (8.16)', pattern: '%.8.16.%' },
  { label: 'TJSP (8.26)', pattern: '%.8.26.%' },
  { label: 'TJMG (8.13)', pattern: '%.8.13.%' },
  { label: 'TJSC (8.24)', pattern: '%.8.24.%' },
  { label: 'TJRO (8.22)', pattern: '%.8.22.%' },
  { label: 'TJTO (8.27)', pattern: '%.8.27.%' },
  { label: 'Todos', pattern: '%' },
];

const BATCH_SIZES = [5, 10, 25, 50];

export const RebindCredencialJuditPanel = ({ tenantId }: Props) => {
  const { data: credenciais = [] } = useJuditSystemNames(tenantId);
  const { running, invoke } = useRebindCredencialJudit();

  const [customerKey, setCustomerKey] = useState<string>('');
  const [pattern, setPattern] = useState<string>('%.8.16.%');
  const [batchSize, setBatchSize] = useState<number>(10);
  const [countResult, setCountResult] = useState<any>(null);
  const [globalCount, setGlobalCount] = useState<boolean>(true);
  const [dryResult, setDryResult] = useState<any>(null);
  const [runResult, setRunResult] = useState<any>(null);
  // Histórico por padrão de CNJ (cache local)
  const [histByPattern, setHistByPattern] = useState<Record<string, any[]>>({});
  const [histLoading, setHistLoading] = useState<string | null>(null);
  const [histTab, setHistTab] = useState<string>('%.8.16.%');

  // Progresso da execução contínua
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoTotal, setAutoTotal] = useState(0);
  const [autoMigrados, setAutoMigrados] = useState(0);
  const [autoErros, setAutoErros] = useState(0);
  const [autoRestantes, setAutoRestantes] = useState(0);
  const [autoLote, setAutoLote] = useState(0);
  const [autoResults, setAutoResults] = useState<any[]>([]);
  const cancelRef = useRef(false);

  // Default credencial = alangeral
  useEffect(() => {
    if (credenciais.length === 0) return;
    const alan = credenciais.find((c) => c.customer_key === 'alangeral');
    setCustomerKey((cur) => cur || alan?.customer_key || credenciais[0].customer_key);
  }, [credenciais]);

  // Reseta resultados ao trocar de tenant
  useEffect(() => {
    setCountResult(null);
    setDryResult(null);
    setRunResult(null);
    setAutoResults([]);
    setAutoTotal(0);
    setAutoMigrados(0);
    setAutoErros(0);
    setAutoRestantes(0);
    setAutoLote(0);
    setHistByPattern({});
  }, [tenantId]);

  const credOptions = useMemo(
    () =>
      credenciais.map((c) => ({
        value: c.customer_key,
        label: c.system_name === '*' ? `* (todos) — ${c.customer_key}` : `${c.system_name} — ${c.customer_key}`,
      })),
    [credenciais],
  );

  const params = useMemo(
    () => ({
      customerKey,
      cnjPattern: pattern,
      oabIds: [] as string[],
      batchSize,
      tenantId,
    }),
    [customerKey, pattern, batchSize, tenantId],
  );

  const podeExecutar = !!tenantId && !!customerKey && !!pattern;

  const handleCount = async () => {
    setCountResult(null);
    const r = await invoke({ ...params, globalScope: globalCount }, 'count');
    setCountResult(r);
  };
  const handleDry = async () => {
    setDryResult(null);
    const r = await invoke(params, 'dry');
    setDryResult(r);
  };
  const handleRun = async () => {
    setRunResult(null);
    const r = await invoke(params, 'run');
    setRunResult(r);
    if (r) {
      await handleCount();
      await loadHistoryFor(pattern);
    }
  };

  const handleAutoRun = async () => {
    if (autoRunning) {
      cancelRef.current = true;
      return;
    }
    cancelRef.current = false;
    setAutoRunning(true);
    setAutoResults([]);
    setAutoMigrados(0);
    setAutoErros(0);
    setAutoLote(0);

    // 1) snapshot do total
    const c = await invoke(params, 'count');
    const total = c?.cnjs_elegiveis ?? 0;
    setAutoTotal(total);
    setAutoRestantes(total);
    if (!total) {
      setAutoRunning(false);
      return;
    }

    let migrados = 0;
    let erros = 0;
    let lote = 0;
    const acc: any[] = [];

    while (!cancelRef.current) {
      lote++;
      setAutoLote(lote);
      const r = await invoke(params, 'run');
      if (!r) break;
      migrados += r.migrados ?? 0;
      erros += r.erros ?? 0;
      if (Array.isArray(r.results)) acc.push(...r.results);
      setAutoMigrados(migrados);
      setAutoErros(erros);
      setAutoResults([...acc]);
      setAutoRestantes(r.restantes ?? 0);
      if ((r.restantes ?? 0) === 0) break;
      if ((r.processados ?? 0) === 0) break; // safety
    }
    setAutoRunning(false);
    cancelRef.current = false;
    await handleCount();
    await loadHistoryFor(pattern);
  };

  const loadHistoryFor = async (p: string) => {
    if (!tenantId) return;
    setHistLoading(p);
    const r = await invoke(
      { tenantId, customerKey, cnjPattern: p, historyLimit: 1000 },
      'history',
    );
    setHistByPattern((prev) => ({ ...prev, [p]: r?.history ?? [] }));
    setHistLoading(null);
  };

  // Carrega aba ativa quando muda tab/credencial
  useEffect(() => {
    if (!tenantId || !customerKey || !histTab) return;
    if (histByPattern[histTab] === undefined) {
      loadHistoryFor(histTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histTab, customerKey, tenantId]);

  const exportCsv = () => {
    const rowsByCnj = new Map<string, any>();
    if (dryResult?.lote) {
      for (const it of dryResult.lote) {
        rowsByCnj.set(it.numero_cnj, {
          numero_cnj: it.numero_cnj,
          tracking_antigo: it.tracking_antigo ?? '',
          tracking_novo: '',
          antigo_pausado: '',
          compartilhado_fora_filtro: it.compartilhado_fora_filtro ? 'sim' : 'nao',
          status: 'pendente',
          erro: '',
        });
      }
    }
    const mergeResults = (arr: any[]) => {
      for (const r of arr) {
        rowsByCnj.set(r.numero_cnj, {
          numero_cnj: r.numero_cnj,
          tracking_antigo: r.trackingAntigo ?? '',
          tracking_novo: r.novoTrackingId ?? '',
          antigo_pausado: r.antigoPausado === true ? 'sim' : r.antigoPausado === false ? 'nao' : '',
          compartilhado_fora_filtro: r.compartilhado ? 'sim' : 'nao',
          status: r.status,
          erro: r.erro ?? '',
        });
      }
    };
    if (runResult?.results) mergeResults(runResult.results);
    if (autoResults.length) mergeResults(autoResults);
    const rows = [...rowsByCnj.values()];
    if (rows.length === 0) return;
    const header = ['numero_cnj','tracking_antigo','tracking_novo','antigo_pausado','compartilhado_fora_filtro','status','erro'];
    const csv = [header.join(','), ...rows.map((r) => header.map((h) => `"${String((r as any)[h] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rebind-credencial-${customerKey}-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportHistoryCsv = (rows: any[], label: string) => {
    if (!rows || rows.length === 0) return;
    const header = ['executado_em','numero_cnj','tracking_id_antigo','tracking_id_novo','antigo_pausado','customer_key','status','erro'];
    const csv = [header.join(','), ...rows.map((r) => header.map((h) => `"${String((r as any)[h] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rebind-historico-${customerKey || 'all'}-${label}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!tenantId) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Selecione um tenant para configurar a recriação de trackings.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Pausa o tracking antigo e cria um novo na Judit usando a credencial selecionada,
        para todos os CNJs deste tenant que casam com o padrão escolhido.
      </p>

      {/* Credencial */}
      <div className="space-y-1.5">
        <Label>Credencial Judit</Label>
        <Select value={customerKey} onValueChange={setCustomerKey}>
          <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
          <SelectContent>
            {credOptions.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pattern */}
      <div className="space-y-1.5">
        <Label>Padrão de CNJ</Label>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <Button
              key={p.pattern}
              size="sm"
              variant={pattern === p.pattern ? 'default' : 'outline'}
              onClick={() => setPattern(p.pattern)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <Input value={pattern} onChange={(e) => setPattern(e.target.value)} className="font-mono text-xs" />
      </div>

      {/* Batch size */}
      <div className="space-y-1.5">
        <Label>Tamanho do lote</Label>
        <div className="flex gap-2">
          {BATCH_SIZES.map((n) => (
            <Button key={n} size="sm" variant={batchSize === n ? 'default' : 'outline'} onClick={() => setBatchSize(n)} disabled={autoRunning}>
              {n}
            </Button>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2 flex-wrap pt-2 border-t">
        <Button variant="outline" onClick={handleCount} disabled={running || autoRunning || !podeExecutar}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" />}
          Contar
        </Button>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={globalCount}
            onChange={(e) => setGlobalCount(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          contar em todos os tenants (global)
        </label>
        <Button variant="outline" onClick={handleDry} disabled={running || autoRunning || !podeExecutar}>
          <Eye className="h-4 w-4 mr-2" /> Dry-run
        </Button>
        <Button variant="outline" onClick={handleRun} disabled={running || autoRunning || !podeExecutar}>
          <Play className="h-4 w-4 mr-2" /> Executar lote
        </Button>
        <Button
          onClick={handleAutoRun}
          disabled={!autoRunning && (running || !podeExecutar)}
          variant={autoRunning ? 'destructive' : 'default'}
        >
          {autoRunning ? (
            <><StopCircle className="h-4 w-4 mr-2" /> Parar</>
          ) : (
            <><FastForward className="h-4 w-4 mr-2" /> Executar até concluir</>
          )}
        </Button>
      </div>

      {/* Progresso da execução contínua */}
      {(autoRunning || autoTotal > 0) && (
        <div className="rounded-md border p-3 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {autoRunning ? `Executando lote #${autoLote}…` : 'Execução concluída'}
            </span>
            <span className="text-xs text-muted-foreground">
              {autoTotal - autoRestantes}/{autoTotal} CNJs
            </span>
          </div>
          <Progress value={autoTotal ? ((autoTotal - autoRestantes) / autoTotal) * 100 : 0} />
          <div className="flex gap-4 flex-wrap text-xs">
            <span>✅ <strong>{autoMigrados}</strong> migrados</span>
            <span>❌ <strong>{autoErros}</strong> erros</span>
            <span>⏳ <strong>{autoRestantes}</strong> restantes</span>
            {autoResults.length > 0 && (
              <Button size="sm" variant="ghost" className="ml-auto h-6" onClick={exportCsv}>
                <Download className="h-3 w-3 mr-1" /> CSV
              </Button>
            )}
          </div>
          {autoResults.length > 0 && (
            <ScrollArea className="max-h-48 mt-1">
              <div className="space-y-0.5 text-[11px] font-mono">
                {autoResults.slice(-100).map((r: any, i: number) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="w-40 truncate" title={r.numero_cnj}>{r.numero_cnj}</span>
                    <span className="w-36 truncate text-muted-foreground" title={r.trackingAntigo}>{r.trackingAntigo}</span>
                    <span>→</span>
                    <span className="flex-1 truncate" title={r.novoTrackingId}>{r.novoTrackingId ?? '-'}</span>
                    {r.antigoPausado === true && <Badge variant="secondary" className="text-[10px]">pausado</Badge>}
                    <Badge variant={r.status === 'migrado' ? 'default' : 'destructive'} className="text-[10px]">{r.status}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      {/* Resultados */}
      {countResult && (
        <div className="rounded-md border p-3 text-sm bg-muted/30 space-y-1">
          <div className="flex items-center gap-2">
            <strong>Elegíveis (pendentes):</strong> {countResult.cnjs_elegiveis}
            {countResult.globalScope && <Badge variant="secondary" className="text-[10px]">global</Badge>}
          </div>
          <div><strong>Total no filtro:</strong> {countResult.cnjs_total_filtro} CNJs ({countResult.linhas_filtro} linhas)</div>
          <div><strong>Já migrados anteriormente:</strong> {countResult.ja_migrados}</div>
        </div>
      )}

      {dryResult?.lote && (
        <div className="rounded-md border p-3 text-xs space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Próximo lote ({dryResult.lote.length}) — restantes depois: {dryResult.restantes}</span>
            <Button size="sm" variant="ghost" onClick={exportCsv}>
              <Download className="h-3 w-3 mr-1" /> CSV
            </Button>
          </div>
          <ScrollArea className="max-h-56">
            <div className="space-y-1">
              {dryResult.lote.map((it: any) => (
                <div key={it.numero_cnj} className="flex items-center gap-2 font-mono">
                  <span className="w-48 truncate" title={it.numero_cnj}>{it.numero_cnj}</span>
                  <span className="flex-1 truncate text-muted-foreground" title={it.tracking_antigo}>
                    {it.tracking_antigo}
                  </span>
                  {it.compartilhado_fora_filtro && (
                    <Badge variant="secondary" className="text-[10px]">compartilhado</Badge>
                  )}
                  <Badge variant={it.antigo_sera_pausado ? 'default' : 'outline'} className="text-[10px]">
                    {it.antigo_sera_pausado ? 'pausa antigo' : 'mantém antigo'}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {runResult && (
        <div className="rounded-md border p-3 text-sm bg-muted/30">
          <div className="flex gap-4 flex-wrap items-center">
            <span><strong>Migrados:</strong> {runResult.migrados}</span>
            <span><strong>Erros:</strong> {runResult.erros}</span>
            <span><strong>Restantes:</strong> {runResult.restantes}</span>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={exportCsv}>
              <Download className="h-3 w-3 mr-1" /> CSV
            </Button>
          </div>
          {runResult.results?.length > 0 && (
            <ScrollArea className="max-h-40 mt-2">
              <div className="space-y-0.5 text-xs font-mono">
                {runResult.results.map((r: any, i: number) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="w-44 truncate" title={r.numero_cnj}>{r.numero_cnj}</span>
                    <span className="w-40 truncate text-muted-foreground" title={r.trackingAntigo}>{r.trackingAntigo}</span>
                    <span>→</span>
                    <span className="flex-1 truncate text-foreground" title={r.novoTrackingId}>{r.novoTrackingId ?? '-'}</span>
                    {r.antigoPausado === true && <Badge variant="secondary" className="text-[10px]">pausado</Badge>}
                    {r.compartilhado && <Badge variant="outline" className="text-[10px]">compartilhado</Badge>}
                    <Badge variant={r.status === 'migrado' ? 'default' : 'destructive'} className="text-[10px]">
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      {/* Histórico por padrão de CNJ */}
      <div className="border-t pt-3 space-y-2">
        <Label className="text-sm">Histórico por padrão</Label>
        <Tabs value={histTab} onValueChange={setHistTab}>
          <TabsList className="flex-wrap h-auto">
            {PRESETS.map((p) => (
              <TabsTrigger key={p.pattern} value={p.pattern} className="text-xs">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {PRESETS.map((p) => {
            const rows = histByPattern[p.pattern];
            const loading = histLoading === p.pattern;
            return (
              <TabsContent key={p.pattern} value={p.pattern} className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => loadHistoryFor(p.pattern)} disabled={loading}>
                    {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                    Recarregar
                  </Button>
                  {rows && rows.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => exportHistoryCsv(rows, p.label.replace(/\s+/g,'_'))}>
                      <Download className="h-3 w-3 mr-1" /> CSV
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {rows ? `${rows.length} registros` : loading ? 'carregando…' : '—'}
                  </span>
                </div>
                {rows && rows.length > 0 ? (
                  <ScrollArea className="h-[400px] border rounded-md p-2">
                    <div className="space-y-0.5 text-xs font-mono">
                      {rows.map((r, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <span className="w-32 truncate text-muted-foreground">
                            {(r.executado_em || '').slice(0,19).replace('T',' ')}
                          </span>
                          <span className="w-40 truncate" title={r.numero_cnj}>{r.numero_cnj}</span>
                          <span className="w-36 truncate text-muted-foreground" title={r.tracking_id_antigo}>{r.tracking_id_antigo}</span>
                          <span>→</span>
                          <span className="flex-1 truncate" title={r.tracking_id_novo}>{r.tracking_id_novo ?? '-'}</span>
                          {r.antigo_pausado === true && <Badge variant="secondary" className="text-[10px]">pausado</Badge>}
                          {r.antigo_pausado === false && <Badge variant="outline" className="text-[10px]">não pausado</Badge>}
                          <Badge variant={r.status === 'migrado' ? 'default' : 'destructive'} className="text-[10px]">{r.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  !loading && rows && (
                    <div className="text-xs text-muted-foreground py-4 text-center border rounded-md">
                      Nenhum registro para este padrão.
                    </div>
                  )
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
};

export default RebindCredencialJuditPanel;