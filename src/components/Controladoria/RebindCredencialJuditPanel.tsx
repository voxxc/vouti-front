import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Play, Eye, Calculator, Download, History } from 'lucide-react';
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

interface OabRow {
  id: string;
  nome_advogado: string;
  oab_numero: string;
  oab_uf: string;
}

export const RebindCredencialJuditPanel = ({ tenantId }: Props) => {
  const { data: credenciais = [] } = useJuditSystemNames(tenantId);
  const { running, invoke } = useRebindCredencialJudit();

  const [oabs, setOabs] = useState<OabRow[]>([]);
  const [oabsSelecionadas, setOabsSelecionadas] = useState<Set<string>>(new Set());
  const [customerKey, setCustomerKey] = useState<string>('');
  const [pattern, setPattern] = useState<string>('%.8.16.%');
  const [batchSize, setBatchSize] = useState<number>(10);
  const [countResult, setCountResult] = useState<any>(null);
  const [dryResult, setDryResult] = useState<any>(null);
  const [runResult, setRunResult] = useState<any>(null);
  const [history, setHistory] = useState<any[] | null>(null);
  const [loadingOabs, setLoadingOabs] = useState(false);

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
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setOabs([]);
      setOabsSelecionadas(new Set());
      return;
    }
    setLoadingOabs(true);
    invoke({ tenantId }, 'listOabs')
      .then((r) => {
        const list = ((r?.oabs ?? []) as OabRow[]);
        setOabs(list);
        setOabsSelecionadas(
          new Set(
            list
              .filter((o) => !/joão|joao/i.test(o.nome_advogado || ''))
              .map((o) => o.id),
          ),
        );
      })
      .finally(() => setLoadingOabs(false));
  }, [tenantId]);

  const credOptions = useMemo(
    () =>
      credenciais.map((c) => ({
        value: c.customer_key,
        label: c.system_name === '*' ? `* (todos) — ${c.customer_key}` : `${c.system_name} — ${c.customer_key}`,
      })),
    [credenciais],
  );

  const toggleOab = (id: string) => {
    setOabsSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const params = useMemo(
    () => ({
      customerKey,
      cnjPattern: pattern,
      oabIds: [...oabsSelecionadas],
      batchSize,
      tenantId,
    }),
    [customerKey, pattern, oabsSelecionadas, batchSize, tenantId],
  );

  const podeExecutar = !!tenantId && !!customerKey && !!pattern && oabsSelecionadas.size > 0;

  const handleCount = async () => {
    setCountResult(null);
    const r = await invoke(params, 'count');
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
    if (r) await handleCount();
  };

  const handleHistory = async () => {
    const r = await invoke({ tenantId, customerKey, historyLimit: 1000 }, 'history');
    setHistory(r?.history ?? []);
  };

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
    if (runResult?.results) {
      for (const r of runResult.results) {
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
    }
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

  const exportHistoryCsv = () => {
    if (!history || history.length === 0) return;
    const header = ['created_at','numero_cnj','tracking_id_antigo','tracking_id_novo','antigo_pausado','customer_key','status','erro'];
    const csv = [header.join(','), ...history.map((r) => header.map((h) => `"${String((r as any)[h] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rebind-historico-${customerKey || 'all'}-${new Date().toISOString().slice(0,10)}.csv`;
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
        Pausa o tracking antigo e cria um novo na Judit usando a credencial selecionada.
        Atualiza apenas as linhas das OABs marcadas. Em CNJs compartilhados com OABs
        <strong> fora </strong>do filtro, o antigo <strong>não</strong> é pausado.
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

      {/* OABs */}
      <div className="space-y-1.5">
        <Label>
          OABs a migrar ({oabsSelecionadas.size}/{oabs.length})
          {loadingOabs && <Loader2 className="inline h-3 w-3 ml-2 animate-spin" />}
        </Label>
        <div className="border rounded-md p-2 space-y-1 max-h-48 overflow-auto">
          {oabs.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
              <Checkbox checked={oabsSelecionadas.has(o.id)} onCheckedChange={() => toggleOab(o.id)} />
              <span className="flex-1">{o.nome_advogado}</span>
              <Badge variant="outline" className="text-[10px]">{o.oab_numero}/{o.oab_uf}</Badge>
            </label>
          ))}
          {oabs.length === 0 && !loadingOabs && <p className="text-xs text-muted-foreground p-2">Nenhuma OAB.</p>}
        </div>
      </div>

      {/* Batch size */}
      <div className="space-y-1.5">
        <Label>Tamanho do lote</Label>
        <div className="flex gap-2">
          {BATCH_SIZES.map((n) => (
            <Button key={n} size="sm" variant={batchSize === n ? 'default' : 'outline'} onClick={() => setBatchSize(n)}>
              {n}
            </Button>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2 flex-wrap pt-2 border-t">
        <Button variant="outline" onClick={handleCount} disabled={running || !podeExecutar}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" />}
          Contar
        </Button>
        <Button variant="outline" onClick={handleDry} disabled={running || !podeExecutar}>
          <Eye className="h-4 w-4 mr-2" /> Dry-run
        </Button>
        <Button onClick={handleRun} disabled={running || !podeExecutar}>
          <Play className="h-4 w-4 mr-2" /> Executar lote
        </Button>
      </div>

      {/* Resultados */}
      {countResult && (
        <div className="rounded-md border p-3 text-sm bg-muted/30 space-y-1">
          <div><strong>Elegíveis (pendentes):</strong> {countResult.cnjs_elegiveis}</div>
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

      {/* Histórico */}
      <div className="border-t pt-3 space-y-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleHistory} disabled={running || !tenantId}>
            <History className="h-3 w-3 mr-1" /> Carregar histórico
          </Button>
          {history && history.length > 0 && (
            <Button size="sm" variant="ghost" onClick={exportHistoryCsv}>
              <Download className="h-3 w-3 mr-1" /> CSV histórico
            </Button>
          )}
          {history && <span className="text-xs text-muted-foreground">{history.length} registros</span>}
        </div>
        {history && history.length > 0 && (
          <ScrollArea className="max-h-56 border rounded-md p-2">
            <div className="space-y-0.5 text-xs font-mono">
              {history.map((r, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="w-32 truncate text-muted-foreground">{(r.created_at || '').slice(0,19).replace('T',' ')}</span>
                  <span className="w-40 truncate" title={r.numero_cnj}>{r.numero_cnj}</span>
                  <span className="w-36 truncate text-muted-foreground" title={r.tracking_id_antigo}>{r.tracking_id_antigo}</span>
                  <span>→</span>
                  <span className="flex-1 truncate" title={r.tracking_id_novo}>{r.tracking_id_novo ?? '-'}</span>
                  {r.antigo_pausado && <Badge variant="secondary" className="text-[10px]">pausado</Badge>}
                  <Badge variant={r.status === 'migrado' ? 'default' : 'destructive'} className="text-[10px]">{r.status}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default RebindCredencialJuditPanel;