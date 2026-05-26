import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Paperclip, AlertTriangle, CheckCircle2, RefreshCw, Play, Building2, Copy, Download, Search, PauseCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchAllPaginated } from '@/lib/supabasePagination';
import { toast } from '@/hooks/use-toast';
import { SuperAdminReconciliacaoJudit } from './SuperAdminReconciliacaoJudit';
import { RebindCredencialJuditPanel } from '@/components/Controladoria/RebindCredencialJuditPanel';

interface Stats {
  oabAtivos: number;
  oabMigrados: number;
  cnpjAtivos: number;
  cnpjMigrados: number;
}

interface Registro {
  id: string;
  tenant_id: string | null;
  tipo: string;
  status: string;
  erro: string | null;
  tracking_id_antigo: string | null;
  tracking_id_novo: string | null;
  numero_cnj: string | null;
  executado_em: string;
  antigo_pausado: boolean | null;
  pausa_erro: string | null;
}

interface TenantRow {
  tenant_id: string;
  tenant_name: string;
  oab_ativos: number;
  oab_migrados: number;
  cnpj_ativos: number;
  cnpj_migrados: number;
  ultimo_evento: string | null;
}

export const SuperAdminMigracaoAnexos = () => {
  const [stats, setStats] = useState<Stats>({ oabAtivos: 0, oabMigrados: 0, cnpjAtivos: 0, cnpjMigrados: 0 });
  const [historico, setHistorico] = useState<Registro[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [runningTenantId, setRunningTenantId] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(10);
  const [filtroTenant, setFiltroTenant] = useState<string>('all');
  const [buscaCnj, setBuscaCnj] = useState('');
  const [aba, setAba] = useState<'execucoes' | 'historico' | 'auditoria' | 'reconciliacao' | 'rebind'>('execucoes');
  const [historicoFull, setHistoricoFull] = useState<Registro[]>([]);
  const [loadingFull, setLoadingFull] = useState(false);
  const [buscaTrack, setBuscaTrack] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'all' | 'oab' | 'cnpj'>('all');
  const [auditoriaTenant, setAuditoriaTenant] = useState<string>('');
  const [auditoria, setAuditoria] = useState<any>(null);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);
  const [rebindTenantId, setRebindTenantId] = useState<string>('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [oabAtivos, oabMigrados, cnpjAtivos, cnpjMigrados, hist, perTenant] = await Promise.all([
        supabase.from('processos_oab').select('id', { count: 'exact', head: true })
          .eq('monitoramento_ativo', true).not('tracking_id', 'is', null),
        supabase.from('processos_oab').select('id', { count: 'exact', head: true })
          .eq('monitoramento_ativo', true).eq('with_attachments', true).not('tracking_id', 'is', null),
        supabase.from('cnpjs_cadastrados').select('id', { count: 'exact', head: true })
          .eq('monitoramento_ativo', true).not('tracking_id', 'is', null),
        supabase.from('cnpjs_cadastrados').select('id', { count: 'exact', head: true })
          .eq('monitoramento_ativo', true).eq('with_attachments', true).not('tracking_id', 'is', null),
        supabase.from('judit_migracao_attachments').select('*').order('executado_em', { ascending: false }).limit(200),
        supabase.rpc('get_migracao_attachments_por_tenant'),
      ]);
      setStats({
        oabAtivos: oabAtivos.count ?? 0,
        oabMigrados: oabMigrados.count ?? 0,
        cnpjAtivos: cnpjAtivos.count ?? 0,
        cnpjMigrados: cnpjMigrados.count ?? 0,
      });
      setHistorico((hist.data || []) as Registro[]);
      setTenants((perTenant.data || []) as TenantRow[]);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const carregarHistoricoCompleto = useCallback(async () => {
    setLoadingFull(true);
    try {
      const { data, error } = await fetchAllPaginated<Registro>(() =>
        supabase
          .from('judit_migracao_attachments')
          .select('*')
          .eq('status', 'migrado')
          .order('executado_em', { ascending: false }),
      );
      if (error) throw error;
      setHistoricoFull(data || []);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar histórico', description: e?.message ?? 'Falhou', variant: 'destructive' });
    } finally {
      setLoadingFull(false);
    }
  }, []);

  useEffect(() => {
    if (aba === 'historico' && historicoFull.length === 0 && !loadingFull) {
      carregarHistoricoCompleto();
    }
  }, [aba, historicoFull.length, loadingFull, carregarHistoricoCompleto]);

  const carregarAuditoria = useCallback(async (tenantId: string) => {
    if (!tenantId) return;
    setLoadingAuditoria(true);
    try {
      const { data, error } = await supabase.rpc('get_auditoria_cobertura_tenant', { p_tenant_id: tenantId });
      if (error) throw error;
      setAuditoria(data);
    } catch (e: any) {
      toast({ title: 'Erro na auditoria', description: e?.message ?? 'Falhou', variant: 'destructive' });
      setAuditoria(null);
    } finally {
      setLoadingAuditoria(false);
    }
  }, []);

  useEffect(() => {
    if (aba === 'auditoria' && !auditoriaTenant && tenants.length > 0) {
      const solv = tenants.find((t) => t.tenant_name.toLowerCase().includes('solvenza'));
      setAuditoriaTenant(solv?.tenant_id ?? tenants[0].tenant_id);
    }
  }, [aba, auditoriaTenant, tenants]);

  useEffect(() => {
    if (aba === 'auditoria' && auditoriaTenant) {
      carregarAuditoria(auditoriaTenant);
    }
  }, [aba, auditoriaTenant, carregarAuditoria]);

  const tenantsMap = useMemo(() => {
    const m = new Map<string, string>();
    tenants.forEach((t) => m.set(t.tenant_id, t.tenant_name));
    return m;
  }, [tenants]);

  const historicoFiltrado = useMemo(() => {
    return historico.filter((h) => {
      if (filtroTenant !== 'all' && h.tenant_id !== filtroTenant) return false;
      if (buscaCnj.trim() && !(h.numero_cnj || '').includes(buscaCnj.trim())) return false;
      return true;
    });
  }, [historico, filtroTenant, buscaCnj]);

  const historicoCompletoFiltrado = useMemo(() => {
    const q = buscaTrack.trim().toLowerCase();
    return historicoFull.filter((h) => {
      if (filtroTenant !== 'all' && h.tenant_id !== filtroTenant) return false;
      if (filtroTipo !== 'all' && h.tipo !== filtroTipo) return false;
      if (q) {
        const blob = `${h.numero_cnj ?? ''} ${h.tracking_id_antigo ?? ''} ${h.tracking_id_novo ?? ''}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [historicoFull, filtroTenant, filtroTipo, buscaTrack]);

  const exportarHistoricoCSV = () => {
    const rows = historicoCompletoFiltrado.map((h) => ({
      executado_em: h.executado_em,
      tenant: tenantsMap.get(h.tenant_id || '') || h.tenant_id || '',
      tipo: h.tipo,
      numero_cnj: h.numero_cnj || '',
      tracking_antigo: h.tracking_id_antigo || '',
      tracking_novo: h.tracking_id_novo || '',
      anexo: 'sim',
      antigo_pausado: h.antigo_pausado === true ? 'sim' : h.antigo_pausado === false ? 'nao' : '',
    }));
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico-trackings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copiar = (texto: string, label = 'Copiado') => {
    navigator.clipboard.writeText(texto).then(() => toast({ title: label, description: texto }));
  };

  const exportarCSV = () => {
    const rows = historicoFiltrado.map((h) => ({
      executado_em: h.executado_em,
      tenant: tenantsMap.get(h.tenant_id || '') || h.tenant_id || '',
      tipo: h.tipo,
      numero_cnj: h.numero_cnj || '',
      tracking_antigo: h.tracking_id_antigo || '',
      tracking_novo: h.tracking_id_novo || '',
      status: h.status,
      antigo_pausado: h.antigo_pausado === true ? 'sim' : h.antigo_pausado === false ? 'nao' : '',
      pausa_erro: h.pausa_erro || '',
      erro: h.erro || '',
    }));
    const headers = Object.keys(rows[0] || { executado_em: '' });
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migracao-anexos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const executar = async (dryRun = false, tenantId: string | null = null) => {
    if (tenantId) setRunningTenantId(tenantId);
    else setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('judit-migrar-trackings-attachments', {
        body: { batchSize, tipo: 'all', dryRun, tenantId },
      });
      if (error) throw error;
      toast({
        title: dryRun ? 'Simulação concluída' : 'Lote processado',
        description: `${data.migrados ?? 0} migrados, ${data.erros ?? 0} erros (${data.processados ?? 0} tentados).`,
      });
      await carregar();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? 'Falhou', variant: 'destructive' });
    } finally {
      setRunning(false);
      setRunningTenantId(null);
    }
  };

  const totalAtivos = stats.oabAtivos + stats.cnpjAtivos;
  const totalMigrados = stats.oabMigrados + stats.cnpjMigrados;
  const totalPendentes = totalAtivos - totalMigrados;
  const progresso = totalAtivos > 0 ? Math.round((totalMigrados / totalAtivos) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-primary" />
            Migração global de monitoramentos para <code className="text-sm bg-muted px-1.5 py-0.5 rounded">with_attachments</code>
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Recria, em lotes, os trackings ativos da Judit (OAB e CNPJ) ainda no formato antigo para que voltem
            a operar já com anexos disponíveis. O processo é aditivo: o tracking antigo é pausado depois que o novo entra em produção,
            evitando perda de andamentos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Lote:</span>
            <select
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="bg-background border rounded px-2 py-1"
              disabled={running}
            >
              {[5, 10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading || running}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => executar(true)} disabled={running}>
            Simular
          </Button>
          <Button onClick={() => executar(false)} disabled={running || totalPendentes === 0}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Migrar próximo lote
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Trackings OAB</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats.oabMigrados}/{stats.oabAtivos}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Trackings CNPJ</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats.cnpjMigrados}/{stats.cnpjAtivos}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pendentes</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-amber-500">{totalPendentes}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Progresso</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{progresso}%</CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Barra de progresso</CardTitle></CardHeader>
        <CardContent>
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Progresso por tenant
          </CardTitle>
          <span className="text-xs text-muted-foreground">{tenants.length} tenants com monitoramento ativo</span>
        </CardHeader>
        <CardContent className="p-0">
          {tenants.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Nenhum tenant com monitoramento ativo.</div>
          ) : (
            <ScrollArea className="h-[360px]">
              <div className="divide-y">
                {tenants.map((t) => {
                  const ativos = t.oab_ativos + t.cnpj_ativos;
                  const migrados = t.oab_migrados + t.cnpj_migrados;
                  const pendentes = ativos - migrados;
                  const pct = ativos > 0 ? Math.round((migrados / ativos) * 100) : 0;
                  const isRunning = runningTenantId === t.tenant_id;
                  return (
                    <div key={t.tenant_id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{t.tenant_name}</span>
                          <Badge variant="outline" className="text-[10px]">OAB {t.oab_migrados}/{t.oab_ativos}</Badge>
                          {t.cnpj_ativos > 0 && (
                            <Badge variant="outline" className="text-[10px]">CNPJ {t.cnpj_migrados}/{t.cnpj_ativos}</Badge>
                          )}
                          {pendentes === 0
                            ? <Badge className="text-[10px] bg-[hsl(var(--chart-2))]/15 text-[hsl(var(--chart-2))] hover:bg-[hsl(var(--chart-2))]/15">Completo</Badge>
                            : <Badge variant="secondary" className="text-[10px]">{pendentes} pendentes</Badge>}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 bg-muted h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] text-muted-foreground tabular-nums w-10 text-right">{pct}%</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={pendentes === 0 ? 'ghost' : 'outline'}
                        disabled={pendentes === 0 || running || !!runningTenantId}
                        onClick={() => executar(false, t.tenant_id)}
                      >
                        {isRunning
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Play className="h-3.5 w-3.5" />}
                        <span className="ml-1.5 text-xs">Migrar lote</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 space-y-3">
          <Tabs value={aba} onValueChange={(v) => setAba(v as any)}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <TabsList>
                <TabsTrigger value="execucoes" className="text-xs">Execuções recentes ({historicoFiltrado.length})</TabsTrigger>
                <TabsTrigger value="historico" className="text-xs">Histórico de Trackings ({historicoFull.length || '…'})</TabsTrigger>
                <TabsTrigger value="auditoria" className="text-xs">Auditoria de Cobertura</TabsTrigger>
                <TabsTrigger value="reconciliacao" className="text-xs">Reconciliação Judit</TabsTrigger>
                <TabsTrigger value="rebind" className="text-xs">Recriar c/ credencial</TabsTrigger>
              </TabsList>
              {aba === 'execucoes' ? (
                <Button variant="outline" size="sm" onClick={exportarCSV} disabled={historicoFiltrado.length === 0}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar CSV
                </Button>
              ) : aba === 'historico' ? (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={carregarHistoricoCompleto} disabled={loadingFull}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingFull ? 'animate-spin' : ''}`} /> Recarregar
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportarHistoricoCSV} disabled={historicoCompletoFiltrado.length === 0}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar CSV
                  </Button>
                </div>
              ) : aba === 'auditoria' ? (
                <Button variant="ghost" size="sm" onClick={() => carregarAuditoria(auditoriaTenant)} disabled={loadingAuditoria || !auditoriaTenant}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingAuditoria ? 'animate-spin' : ''}`} /> Recarregar
                </Button>
              ) : null}
            </div>
          </Tabs>
          {aba !== 'auditoria' && aba !== 'reconciliacao' && aba !== 'rebind' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                value={aba === 'execucoes' ? buscaCnj : buscaTrack}
                onChange={(e) => (aba === 'execucoes' ? setBuscaCnj(e.target.value) : setBuscaTrack(e.target.value))}
                placeholder={aba === 'execucoes' ? 'Buscar por CNJ…' : 'Buscar por CNJ ou tracking…'}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select value={filtroTenant} onValueChange={setFiltroTenant}>
              <SelectTrigger className="h-8 text-xs w-[220px]">
                <SelectValue placeholder="Todos os tenants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tenants</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.tenant_id} value={t.tenant_id}>{t.tenant_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {aba === 'historico' && (
              <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">OAB + CNPJ</SelectItem>
                  <SelectItem value="oab">Apenas OAB</SelectItem>
                  <SelectItem value="cnpj">Apenas CNPJ</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          )}
          {aba === 'auditoria' && (
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={auditoriaTenant} onValueChange={setAuditoriaTenant}>
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
          )}
        </CardHeader>
        <CardContent className="p-0">
          {aba === 'reconciliacao' ? (
            <SuperAdminReconciliacaoJudit
              tenants={tenants.map((t) => ({ tenant_id: t.tenant_id, tenant_name: t.tenant_name }))}
            />
          ) : aba === 'auditoria' ? (
            loadingAuditoria ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Auditando tenant…
              </div>
            ) : !auditoria ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Selecione um tenant para auditar.</div>
            ) : (
              <div className="p-4 space-y-5">
                {/* Bloco 1 — Reconciliação */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Vínculos c/ anexo</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{auditoria.vinculos_com_anexo ?? 0}</CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">CNJs únicos c/ anexo</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{auditoria.cnjs_unicos_com_anexo ?? 0}</CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Linhas na auditoria</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{auditoria.linhas_auditoria ?? 0}</CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Diferença (re-execuções)</CardTitle></CardHeader><CardContent className={`text-2xl font-semibold ${(auditoria.diferenca ?? 0) > 0 ? 'text-amber-500' : ''}`}>{auditoria.diferenca > 0 ? `+${auditoria.diferenca}` : auditoria.diferenca}</CardContent></Card>
                </div>

                {/* Bloco 2 — Duplicados */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-medium">CNJs duplicados na auditoria</h4>
                    <Badge variant="secondary" className="text-[10px]">{(auditoria.duplicados ?? []).length}</Badge>
                  </div>
                  {(auditoria.duplicados ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma duplicidade. Todo CNJ foi migrado em uma única execução bem sucedida.</p>
                  ) : (
                    <TooltipProvider delayDuration={150}>
                    <div className="border rounded divide-y">
                      {(auditoria.duplicados ?? []).map((d: any) => (
                        <div key={d.numero_cnj} className="p-3 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => copiar(d.numero_cnj, 'CNJ copiado')} className="font-mono text-xs hover:text-primary inline-flex items-center gap-1">
                              {d.numero_cnj} <Copy className="h-3 w-3 opacity-50" />
                            </button>
                            <Badge variant="outline" className="text-[10px]">{d.ocorrencias} tentativas</Badge>
                          </div>
                          <div className="space-y-1">
                            {(d.tentativas ?? []).map((t: any, i: number) => {
                              const dt = new Date(t.executado_em);
                              return (
                                <div key={t.id ?? i} className="flex items-center gap-2 text-[10px] font-mono">
                                  <Badge variant={t.status === 'erro' ? 'destructive' : 'secondary'} className="text-[9px]">#{i + 1} {t.status}</Badge>
                                  <span className="text-muted-foreground">{dt.toLocaleString('pt-BR')}</span>
                                  <span className="opacity-70">{t.tracking_id_antigo ? `${t.tracking_id_antigo.slice(0, 8)}…` : '—'}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="text-primary">{t.tracking_id_novo ? `${t.tracking_id_novo.slice(0, 8)}…` : '—'}</span>
                                  {t.erro && <span className="text-destructive truncate max-w-[260px]">{t.erro}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    </TooltipProvider>
                  )}
                </div>

                {/* Bloco 3 — Vínculos órfãos */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-medium">Vínculos órfãos (com anexo, sem auditoria)</h4>
                    <Badge variant={(auditoria.orfaos ?? []).length === 0 ? 'secondary' : 'destructive'} className="text-[10px]">{(auditoria.orfaos ?? []).length}</Badge>
                  </div>
                  {(auditoria.orfaos ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Todos os vínculos com anexo possuem registro de auditoria correspondente.</p>
                  ) : (
                    <ScrollArea className="h-[180px] border rounded">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-background border-b">
                          <tr className="text-left text-muted-foreground"><th className="px-2 py-1.5">CNJ</th><th className="px-2 py-1.5">Tracking atual</th></tr>
                        </thead>
                        <tbody className="divide-y">
                          {(auditoria.orfaos ?? []).map((o: any) => (
                            <tr key={o.processo_id}>
                              <td className="px-2 py-1.5 font-mono text-[11px]">{o.numero_cnj}</td>
                              <td className="px-2 py-1.5 font-mono text-[10px] opacity-70">{o.tracking_id ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  )}
                </div>

                {/* Bloco 4 — Sem cobertura */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-medium">CNJs ainda sem cobertura (ativos sem anexo)</h4>
                    <Badge variant={(auditoria.sem_cobertura ?? []).length === 0 ? 'secondary' : 'destructive'} className="text-[10px]">{(auditoria.sem_cobertura ?? []).length}</Badge>
                  </div>
                  {(auditoria.sem_cobertura ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">100% dos monitoramentos ativos deste tenant já operam com anexo.</p>
                  ) : (
                    <ScrollArea className="h-[180px] border rounded">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-background border-b">
                          <tr className="text-left text-muted-foreground"><th className="px-2 py-1.5">CNJ</th><th className="px-2 py-1.5">Tracking antigo</th></tr>
                        </thead>
                        <tbody className="divide-y">
                          {(auditoria.sem_cobertura ?? []).map((o: any) => (
                            <tr key={o.processo_id}>
                              <td className="px-2 py-1.5 font-mono text-[11px]">{o.numero_cnj}</td>
                              <td className="px-2 py-1.5 font-mono text-[10px] opacity-70">{o.tracking_id ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  )}
                </div>
              </div>
            )
          ) : aba === 'execucoes' ? (
          historicoFiltrado.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma execução registrada ainda.</div>
          ) : (
            <TooltipProvider delayDuration={150}>
              <ScrollArea className="h-[480px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background border-b z-10">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium w-[20px]"></th>
                      <th className="px-2 py-2 font-medium">Quando</th>
                      <th className="px-2 py-2 font-medium">Tenant</th>
                      <th className="px-2 py-2 font-medium">CNJ</th>
                      <th className="px-2 py-2 font-medium">Tracking antigo → novo</th>
                      <th className="px-2 py-2 font-medium">Pausa do antigo</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {historicoFiltrado.map((h) => {
                      const tenantNome = tenantsMap.get(h.tenant_id || '') || (h.tenant_id ? `${h.tenant_id.slice(0, 8)}…` : '—');
                      const dt = new Date(h.executado_em);
                      return (
                        <tr key={h.id} className="hover:bg-muted/40">
                          <td className="px-3 py-2 align-top">
                            {h.status === 'migrado'
                              ? <CheckCircle2 className="h-4 w-4 text-[hsl(var(--chart-2))]" />
                              : h.status === 'erro'
                              ? <AlertTriangle className="h-4 w-4 text-destructive" />
                              : <Loader2 className="h-4 w-4 text-muted-foreground" />}
                          </td>
                          <td className="px-2 py-2 align-top whitespace-nowrap text-muted-foreground">
                            {dt.toLocaleDateString('pt-BR')}<br />
                            <span className="text-[10px]">{dt.toLocaleTimeString('pt-BR')}</span>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <span className="truncate max-w-[160px] inline-block">{tenantNome}</span>
                          </td>
                          <td className="px-2 py-2 align-top">
                            {h.numero_cnj ? (
                              <button
                                onClick={() => copiar(h.numero_cnj!, 'CNJ copiado')}
                                className="font-mono text-[11px] hover:text-primary inline-flex items-center gap-1"
                              >
                                {h.numero_cnj}
                                <Copy className="h-3 w-3 opacity-50" />
                              </button>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-2 py-2 align-top">
                            <div className="flex items-center gap-1.5 font-mono text-[10px]">
                              {h.tracking_id_antigo ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => copiar(h.tracking_id_antigo!, 'Antigo copiado')}
                                      className="bg-muted px-1.5 py-0.5 rounded hover:bg-muted/70 line-through opacity-70"
                                    >
                                      {h.tracking_id_antigo.slice(0, 8)}…
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent><span className="font-mono text-[10px]">{h.tracking_id_antigo}</span></TooltipContent>
                                </Tooltip>
                              ) : <span className="text-muted-foreground">—</span>}
                              <span className="text-muted-foreground">→</span>
                              {h.tracking_id_novo ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => copiar(h.tracking_id_novo!, 'Novo copiado')}
                                      className="bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:bg-primary/20"
                                    >
                                      {h.tracking_id_novo.slice(0, 8)}…
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent><span className="font-mono text-[10px]">{h.tracking_id_novo}</span></TooltipContent>
                                </Tooltip>
                              ) : <span className="text-muted-foreground">—</span>}
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top">
                            {h.antigo_pausado === true ? (
                              <Badge className="text-[10px] bg-[hsl(var(--chart-2))]/15 text-[hsl(var(--chart-2))] hover:bg-[hsl(var(--chart-2))]/15 gap-1">
                                <PauseCircle className="h-3 w-3" /> Pausado
                              </Badge>
                            ) : h.antigo_pausado === false ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="destructive" className="text-[10px] gap-1 cursor-help">
                                    <AlertTriangle className="h-3 w-3" /> Pausa falhou
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs"><span className="text-[10px]">{h.pausa_erro || 'sem detalhe'}</span></TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">— (pré-auditoria)</span>
                            )}
                          </td>
                          <td className="px-2 py-2 align-top">
                            <Badge variant={h.status === 'erro' ? 'destructive' : 'secondary'} className="text-[10px]">
                              {h.status}
                            </Badge>
                            {h.erro && <p className="text-[10px] text-destructive mt-1 break-all max-w-[220px]">{h.erro}</p>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            </TooltipProvider>
          )
          ) : (
            loadingFull ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando histórico completo…
              </div>
            ) : historicoCompletoFiltrado.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Nenhum tracking migrado encontrado com os filtros atuais.</div>
            ) : (
              <TooltipProvider delayDuration={150}>
                <ScrollArea className="h-[560px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background border-b z-10">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Tenant</th>
                        <th className="px-2 py-2 font-medium">Tipo</th>
                        <th className="px-2 py-2 font-medium">CNJ / CNPJ</th>
                        <th className="px-2 py-2 font-medium">Tracking antigo</th>
                        <th className="px-2 py-2 font-medium">Tracking novo (com anexo)</th>
                        <th className="px-2 py-2 font-medium">Pausa</th>
                        <th className="px-2 py-2 font-medium">Migrado em</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {historicoCompletoFiltrado.map((h) => {
                        const tenantNome = tenantsMap.get(h.tenant_id || '') || (h.tenant_id ? `${h.tenant_id.slice(0, 8)}…` : '—');
                        const dt = new Date(h.executado_em);
                        return (
                          <tr key={h.id} className="hover:bg-muted/40">
                            <td className="px-3 py-2 align-top truncate max-w-[160px]">{tenantNome}</td>
                            <td className="px-2 py-2 align-top">
                              <Badge variant="outline" className="text-[10px] uppercase">{h.tipo}</Badge>
                            </td>
                            <td className="px-2 py-2 align-top">
                              {h.numero_cnj ? (
                                <button
                                  onClick={() => copiar(h.numero_cnj!, 'Copiado')}
                                  className="font-mono text-[11px] hover:text-primary inline-flex items-center gap-1"
                                >
                                  {h.numero_cnj}
                                  <Copy className="h-3 w-3 opacity-50" />
                                </button>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-2 py-2 align-top">
                              {h.tracking_id_antigo ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => copiar(h.tracking_id_antigo!, 'Antigo copiado')}
                                      className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded hover:bg-muted/70 line-through opacity-70 inline-flex items-center gap-1"
                                    >
                                      {h.tracking_id_antigo}
                                      <Copy className="h-3 w-3 opacity-50" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent><span className="font-mono text-[10px]">{h.tracking_id_antigo}</span></TooltipContent>
                                </Tooltip>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-2 py-2 align-top">
                              {h.tracking_id_novo ? (
                                <button
                                  onClick={() => copiar(h.tracking_id_novo!, 'Novo copiado')}
                                  className="font-mono text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:bg-primary/20 inline-flex items-center gap-1"
                                >
                                  <Paperclip className="h-3 w-3" />
                                  {h.tracking_id_novo}
                                  <Copy className="h-3 w-3 opacity-50" />
                                </button>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-2 py-2 align-top">
                              {h.antigo_pausado === true ? (
                                <Badge className="text-[10px] bg-[hsl(var(--chart-2))]/15 text-[hsl(var(--chart-2))] hover:bg-[hsl(var(--chart-2))]/15 gap-1">
                                  <PauseCircle className="h-3 w-3" /> OK
                                </Badge>
                              ) : h.antigo_pausado === false ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="destructive" className="text-[10px] gap-1 cursor-help">
                                      <AlertTriangle className="h-3 w-3" /> Falhou
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs"><span className="text-[10px]">{h.pausa_erro || 'sem detalhe'}</span></TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-2 py-2 align-top whitespace-nowrap text-muted-foreground text-[10px]">
                              {dt.toLocaleDateString('pt-BR')} {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              </TooltipProvider>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminMigracaoAnexos;