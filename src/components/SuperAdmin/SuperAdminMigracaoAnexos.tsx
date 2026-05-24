import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Paperclip, AlertTriangle, CheckCircle2, RefreshCw, Play, Building2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  tracking_id_novo: string | null;
  numero_cnj: string | null;
  executado_em: string;
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
        supabase.from('judit_migracao_attachments').select('*').order('executado_em', { ascending: false }).limit(50),
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
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Últimas 50 execuções</CardTitle></CardHeader>
        <CardContent className="p-0">
          {historico.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma execução registrada ainda.</div>
          ) : (
            <ScrollArea className="h-[420px]">
              <div className="divide-y">
                {historico.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 px-4 py-3">
                    {h.status === 'migrado'
                      ? <CheckCircle2 className="h-4 w-4 text-[hsl(var(--chart-2))] mt-0.5 shrink-0" />
                      : h.status === 'erro'
                      ? <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      : <Loader2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] uppercase">{h.tipo}</Badge>
                        <Badge variant={h.status === 'erro' ? 'destructive' : 'secondary'} className="text-[10px]">{h.status}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(h.executado_em).toLocaleString('pt-BR')}</span>
                        {h.tenant_id && <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[160px]">tenant: {h.tenant_id.slice(0, 8)}…</span>}
                      </div>
                      {h.tracking_id_novo && <p className="text-xs font-mono mt-1 truncate">novo: {h.tracking_id_novo}</p>}
                      {h.erro && <p className="text-xs text-destructive mt-1 break-all">{h.erro}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminMigracaoAnexos;