import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, Play, Eye, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useJuditSystemNames } from '@/hooks/useJuditSystemNames';
import { useRebindCredencialJudit } from '@/hooks/useRebindCredencialJudit';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantIdOverride?: string;
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

export const RebindCredencialJuditDialog = ({ open, onOpenChange, tenantIdOverride }: Props) => {
  const tenantId = tenantIdOverride;
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

  // Default credencial = alangeral
  useEffect(() => {
    if (!customerKey && credenciais.length > 0) {
      const alan = credenciais.find((c) => c.customer_key === 'alangeral');
      setCustomerKey(alan?.customer_key ?? credenciais[0].customer_key);
    }
  }, [credenciais, customerKey]);

  useEffect(() => {
    if (!open || !tenantId) return;
    supabase
      .from('oabs_cadastradas')
      .select('id, nome_advogado, oab_numero, oab_uf')
      .eq('tenant_id', tenantId)
      .order('nome_advogado')
      .then(({ data }) => {
        const list = (data || []) as OabRow[];
        setOabs(list);
        // pré-seleciona todos exceto João
        setOabsSelecionadas(
          new Set(
            list
              .filter((o) => !/joão|joao/i.test(o.nome_advogado || ''))
              .map((o) => o.id),
          ),
        );
      });
  }, [open, tenantId]);

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

  const podeExecutar = !!customerKey && !!pattern && oabsSelecionadas.size > 0;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recriar tracking com credencial</DialogTitle>
          <DialogDescription>
            Pausa o tracking antigo e cria um novo na Judit usando a credencial selecionada.
            Atualiza apenas as linhas das OABs marcadas. Em CNJs compartilhados com OABs
            <strong> fora </strong>do filtro, o antigo <strong>não</strong> é pausado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
            <Label>OABs a migrar ({oabsSelecionadas.size}/{oabs.length})</Label>
            <div className="border rounded-md p-2 space-y-1 max-h-48 overflow-auto">
              {oabs.map((o) => (
                <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
                  <Checkbox checked={oabsSelecionadas.has(o.id)} onCheckedChange={() => toggleOab(o.id)} />
                  <span className="flex-1">{o.nome_advogado}</span>
                  <Badge variant="outline" className="text-[10px]">{o.oab_numero}/{o.oab_uf}</Badge>
                </label>
              ))}
              {oabs.length === 0 && <p className="text-xs text-muted-foreground p-2">Nenhuma OAB.</p>}
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
              <div className="font-medium mb-2">Próximo lote ({dryResult.lote.length}) — restantes depois: {dryResult.restantes}</div>
              <ScrollArea className="max-h-56">
                <div className="space-y-1">
                  {dryResult.lote.map((it: any) => (
                    <div key={it.numero_cnj} className="flex items-center gap-2 font-mono">
                      <span className="flex-1 truncate">{it.numero_cnj}</span>
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
              <div className="flex gap-4 flex-wrap">
                <span><strong>Migrados:</strong> {runResult.migrados}</span>
                <span><strong>Erros:</strong> {runResult.erros}</span>
                <span><strong>Restantes:</strong> {runResult.restantes}</span>
              </div>
              {runResult.results?.length > 0 && (
                <ScrollArea className="max-h-40 mt-2">
                  <div className="space-y-0.5 text-xs font-mono">
                    {runResult.results.map((r: any, i: number) => (
                      <div key={i} className="flex gap-2">
                        <span className="flex-1 truncate">{r.numero_cnj}</span>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RebindCredencialJuditDialog;