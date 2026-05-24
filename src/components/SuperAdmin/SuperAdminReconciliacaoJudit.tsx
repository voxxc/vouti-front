import { useCallback, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertTriangle, CheckCircle2, ChevronDown, Copy, Download, FileSpreadsheet,
  Loader2, Search, Upload,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PlanilhaRow {
  tracking_id: string;
  cnj: string | null;
  oab: string | null;
  created_at: string | null;
  extras: Record<string, any>;
}

interface BancoRow {
  tracking_id: string;
  numero_cnj: string | null;
  tipo: 'oab' | 'cnpj';
  monitoramento_ativo: boolean;
}

interface TenantOpt { tenant_id: string; tenant_name: string }

interface Props {
  tenants: TenantOpt[];
  defaultTenantId?: string;
}

function normalizeKey(k: string) {
  return String(k).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function pickField(row: Record<string, any>, candidates: string[]): any {
  const map = new Map<string, any>();
  for (const k of Object.keys(row)) map.set(normalizeKey(k), row[k]);
  for (const c of candidates) {
    const v = map.get(normalizeKey(c));
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return null;
}

function parsePlanilha(buffer: ArrayBuffer): PlanilhaRow[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  // Tenta aba "Relatório de Buscas"; senão usa a primeira.
  const target =
    wb.SheetNames.find((n) => /buscas|relat/i.test(n)) || wb.SheetNames[0];
  if (!target) return [];
  const sheet = wb.Sheets[target];
  const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
  const out: PlanilhaRow[] = [];
  for (const r of raw) {
    const tracking = pickField(r, ['tracking_id', 'tracking id', 'tracking', 'id do tracking', 'rastreio', 'id rastreio']);
    if (!tracking) continue;
    const tid = String(tracking).trim();
    if (!tid) continue;
    out.push({
      tracking_id: tid,
      cnj: (() => {
        const v = pickField(r, ['cnj', 'numero cnj', 'numero do processo', 'processo', 'numero_cnj']);
        return v == null ? null : String(v).trim();
      })(),
      oab: (() => {
        const v = pickField(r, ['oab', 'numero oab', 'oab numero', 'inscricao oab']);
        return v == null ? null : String(v).trim();
      })(),
      created_at: (() => {
        const v = pickField(r, ['data criacao', 'data de criacao', 'criado em', 'created_at', 'data', 'data inicio']);
        return v == null ? null : String(v).trim();
      })(),
      extras: r,
    });
  }
  return out;
}

function copyText(text: string, label = 'Copiado') {
  navigator.clipboard.writeText(text).then(() => {
    toast({ title: label, description: text.length > 80 ? `${text.length} itens copiados` : text });
  });
}

function downloadCSV(filename: string, rows: Array<Record<string, any>>) {
  if (!rows.length) return;
  const colSet = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => colSet.add(k)));
  const cols = Array.from(colSet);
  const esc = (v: any) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export const SuperAdminReconciliacaoJudit = ({ tenants, defaultTenantId }: Props) => {
  const solvenzaId = useMemo(
    () => defaultTenantId
      || tenants.find((t) => t.tenant_name.toLowerCase().includes('solvenza'))?.tenant_id
      || tenants[0]?.tenant_id
      || '',
    [tenants, defaultTenantId],
  );
  const [tenantId, setTenantId] = useState<string>(solvenzaId);
  const [planilha, setPlanilha] = useState<PlanilhaRow[]>([]);
  const [planilhaFile, setPlanilhaFile] = useState<string>('');
  const [banco, setBanco] = useState<BancoRow[]>([]);
  const [loadingBanco, setLoadingBanco] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [openBanco, setOpenBanco] = useState(false);

  // Garante que o tenant selecionado siga o default quando a lista carrega.
  if (!tenantId && solvenzaId) setTenantId(solvenzaId);

  const carregarBanco = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingBanco(true);
    try {
      const { data, error } = await supabase.rpc('get_tenant_trackings_live', { p_tenant_id: id });
      if (error) throw error;
      const rows: BancoRow[] = (data || []).map((r: any) => ({
        tracking_id: String(r.tracking_id),
        numero_cnj: r.numero_cnj ?? null,
        tipo: (r.source === 'cnpj' ? 'cnpj' : 'oab') as 'oab' | 'cnpj',
        monitoramento_ativo: !!r.monitoramento_ativo,
      }));
      setBanco(rows);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar banco', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setLoadingBanco(false);
    }
  }, []);

  const onUpload = useCallback(async (file: File) => {
    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const rows = parsePlanilha(buf);
      setPlanilha(rows);
      setPlanilhaFile(file.name);
      if (rows.length === 0) {
        toast({ title: 'Nenhum tracking encontrado', description: 'A planilha não tem coluna reconhecível de Tracking ID.', variant: 'destructive' });
      } else {
        toast({ title: 'Planilha carregada', description: `${rows.length} linhas com Tracking ID.` });
      }
      // Já carrega banco se ainda não carregou.
      if (banco.length === 0) await carregarBanco(tenantId);
    } catch (e: any) {
      toast({ title: 'Falha ao ler planilha', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setParsing(false);
    }
  }, [tenantId, banco.length, carregarBanco]);

  // ----- Cruzamento -----
  const bancoSet = useMemo(() => new Set(banco.map((b) => b.tracking_id)), [banco]);
  const planilhaSet = useMemo(() => new Set(planilha.map((p) => p.tracking_id)), [planilha]);

  const orfaosJudit = useMemo(
    () => planilha.filter((p) => !bancoSet.has(p.tracking_id)),
    [planilha, bancoSet],
  );
  const orfaosBanco = useMemo(
    () => banco.filter((b) => !planilhaSet.has(b.tracking_id)),
    [banco, planilhaSet],
  );
  const coincidentes = useMemo(
    () => planilha.filter((p) => bancoSet.has(p.tracking_id)).length,
    [planilha, bancoSet],
  );

  const orfaosJuditFiltrados = useMemo(() => {
    if (!filtro.trim()) return orfaosJudit;
    const q = filtro.toLowerCase();
    return orfaosJudit.filter(
      (r) =>
        r.tracking_id.toLowerCase().includes(q)
        || (r.cnj ?? '').toLowerCase().includes(q)
        || (r.oab ?? '').toLowerCase().includes(q),
    );
  }, [orfaosJudit, filtro]);

  const tenantName = tenants.find((t) => t.tenant_id === tenantId)?.tenant_name ?? 'tenant';

  return (
    <div className="p-4 space-y-4">
      {/* Controles topo */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Tenant</label>
          <Select value={tenantId} onValueChange={(v) => { setTenantId(v); setBanco([]); }}>
            <SelectTrigger className="h-8 text-xs w-[260px]">
              <SelectValue placeholder="Selecionar tenant…" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.tenant_id} value={t.tenant_id}>{t.tenant_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Planilha Judit (.xlsx)</label>
          <div className="flex items-center gap-2">
            <label className="inline-flex">
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.target.value = '';
                }}
              />
              <Button asChild size="sm" variant="outline" disabled={parsing || !tenantId}>
                <span className="cursor-pointer">
                  {parsing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                  {planilhaFile ? 'Trocar planilha' : 'Selecionar planilha'}
                </span>
              </Button>
            </label>
            {planilhaFile && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <FileSpreadsheet className="h-3.5 w-3.5" /> {planilhaFile}
              </span>
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => carregarBanco(tenantId)}
          disabled={loadingBanco || !tenantId}
        >
          {loadingBanco ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
          Recarregar banco
        </Button>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Planilha</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{planilha.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Banco ({tenantName})</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{banco.length}</CardContent></Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Coincidentes</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{coincidentes}</CardContent>
        </Card>
        <Card className="border-amber-500/40">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-amber-600 inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Órfãos na Judit</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-amber-600">{orfaosJudit.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Órfãos no banco</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{orfaosBanco.length}</CardContent>
        </Card>
      </div>

      {planilha.length === 0 ? (
        <div className="border border-dashed rounded-md p-8 text-center text-sm text-muted-foreground">
          Faça upload do <code>relatorio_registros_ativos.xlsx</code> exportado da Judit para iniciar o cruzamento.
        </div>
      ) : (
        <>
          {/* Bloco principal: Órfãos na Judit */}
          <Card className="border-amber-500/40">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-sm inline-flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Órfãos na Judit
                  <Badge variant="outline">{orfaosJudit.length}</Badge>
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                      placeholder="Buscar tracking, CNJ ou OAB…"
                      className="h-8 pl-8 text-xs w-[260px]"
                    />
                  </div>
                  <Button size="sm" variant="outline" disabled={!orfaosJudit.length}
                    onClick={() => copyText(orfaosJudit.map((r) => r.tracking_id).join('\n'), `${orfaosJudit.length} tracking IDs copiados`)}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar trackings
                  </Button>
                  <Button size="sm" variant="outline" disabled={!orfaosJudit.length}
                    onClick={() => copyText(orfaosJudit.map((r) => r.cnj).filter(Boolean).join('\n'), 'CNJs copiados')}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar CNJs
                  </Button>
                  <Button size="sm" variant="outline" disabled={!orfaosJudit.length}
                    onClick={() => downloadCSV(
                      `reconciliacao-orfaos-judit-${tenantName}.csv`,
                      orfaosJudit.map((r) => ({
                        tracking_id: r.tracking_id,
                        cnj: r.cnj ?? '',
                        oab: r.oab ?? '',
                        created_at: r.created_at ?? '',
                        ...r.extras,
                      })),
                    )}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {orfaosJudit.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground inline-flex items-center justify-center w-full gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Nenhum tracking órfão. Banco bate com a planilha.
                </div>
              ) : (
                <ScrollArea className="h-[480px]">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr className="text-left">
                        <th className="p-2 font-medium">Tracking ID</th>
                        <th className="p-2 font-medium">CNJ</th>
                        <th className="p-2 font-medium">OAB</th>
                        <th className="p-2 font-medium">Criado em</th>
                        <th className="p-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {orfaosJuditFiltrados.map((r) => (
                        <tr key={r.tracking_id} className="border-t hover:bg-muted/30">
                          <td className="p-2 font-mono">{r.tracking_id}</td>
                          <td className="p-2 font-mono cursor-pointer" onClick={() => r.cnj && copyText(r.cnj, 'CNJ copiado')}>{r.cnj ?? '—'}</td>
                          <td className="p-2">{r.oab ?? '—'}</td>
                          <td className="p-2 text-muted-foreground">{r.created_at ?? '—'}</td>
                          <td className="p-2">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyText(r.tracking_id, 'Tracking copiado')}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {orfaosJuditFiltrados.length === 0 && (
                        <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum resultado para o filtro.</td></tr>
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Bloco colapsável: Órfãos no banco */}
          <Collapsible open={openBanco} onOpenChange={setOpenBanco}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm inline-flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      Órfãos no banco
                      <Badge variant="outline">{orfaosBanco.length}</Badge>
                      <span className="text-xs font-normal text-muted-foreground ml-2">(no Vouti mas não na planilha)</span>
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 transition ${openBanco ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-0">
                  <div className="flex justify-end p-2 border-b">
                    <Button size="sm" variant="outline" disabled={!orfaosBanco.length}
                      onClick={() => downloadCSV(
                        `reconciliacao-orfaos-banco-${tenantName}.csv`,
                        orfaosBanco.map((r) => ({
                          tracking_id: r.tracking_id,
                          numero_cnj: r.numero_cnj ?? '',
                          tipo: r.tipo,
                          monitoramento_ativo: r.monitoramento_ativo,
                        })),
                      )}>
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar CSV
                    </Button>
                  </div>
                  {orfaosBanco.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">Tudo do banco está coberto pela planilha.</div>
                  ) : (
                    <ScrollArea className="h-[320px]">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr className="text-left">
                            <th className="p-2 font-medium">Tracking ID</th>
                            <th className="p-2 font-medium">CNJ / CNPJ</th>
                            <th className="p-2 font-medium">Tipo</th>
                            <th className="p-2 font-medium">Ativo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orfaosBanco.map((r) => (
                            <tr key={r.tracking_id} className="border-t hover:bg-muted/30">
                              <td className="p-2 font-mono">{r.tracking_id}</td>
                              <td className="p-2 font-mono">{r.numero_cnj ?? '—'}</td>
                              <td className="p-2 uppercase">{r.tipo}</td>
                              <td className="p-2">{r.monitoramento_ativo ? 'sim' : 'não'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </>
      )}
    </div>
  );
};