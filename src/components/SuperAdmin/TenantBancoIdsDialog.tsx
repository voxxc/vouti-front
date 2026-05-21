import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Copy, Check, Scale, FileText, Radio, Database, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchAllPaginated } from '@/lib/supabasePagination';

interface TenantBancoIdsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}

interface BancoId {
  id: string;
  tipo: string;
  referencia_id: string | null;
  external_id: string | null;
  descricao: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

interface ProcessoAgg {
  processo_id: string;
  numero_cnj: string | null;
  tribunal: string | null;
  request_id: string | null;
  request_created_at: string | null;
  tracking_id: string | null;
  tracking_ativo: boolean;
  tracking_created_at: string | null;
  created_at: string;
}

interface OabAgg {
  id: string;
  oab: string;
  external_id: string | null;
  created_at: string;
}

type TabKey = 'processos' | 'requests' | 'trackings' | 'oabs' | 'historico';

export function TenantBancoIdsDialog({ open, onOpenChange, tenantId, tenantName }: TenantBancoIdsDialogProps) {
  const [bancoIds, setBancoIds] = useState<BancoId[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('processos');

  useEffect(() => {
    if (open && tenantId) fetchAll();
  }, [open, tenantId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchAllPaginated<BancoId>(
        () =>
          supabase
            .from('tenant_banco_ids')
            .select('id, tipo, referencia_id, external_id, descricao, metadata, created_at')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false }),
        { hardCap: 200 }
      );
      if (error) throw error;
      setBancoIds(data || []);
    } catch (error) {
      console.error('Erro ao buscar banco de IDs:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os IDs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      toast({ title: 'Copiado!', description: `${label} copiado` });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  const term = searchTerm.toLowerCase().trim();
  const matches = (...vals: (string | null | undefined)[]) =>
    !term || vals.some((v) => v?.toLowerCase().includes(term));

  // Derive aggregates from tenant_banco_ids
  const processosAgg = useMemo<ProcessoAgg[]>(() => {
    const byProcId = new Map<string, ProcessoAgg>();
    // seed from tipo=processo
    for (const b of bancoIds) {
      if (b.tipo !== 'processo' || !b.referencia_id) continue;
      if (!byProcId.has(b.referencia_id)) {
        byProcId.set(b.referencia_id, {
          processo_id: b.referencia_id,
          numero_cnj: (b.metadata?.numero_cnj as string) || null,
          tribunal: (b.metadata?.tribunal as string) || null,
          request_id: null,
          request_created_at: null,
          tracking_id: null,
          tracking_ativo: false,
          tracking_created_at: null,
          created_at: b.created_at,
        });
      }
    }
    // ensure entries exist for orphan request_detalhes / tracking (no tipo=processo row)
    const ensure = (refId: string | null, cnj: string | null) => {
      if (!refId) return null;
      let p = byProcId.get(refId);
      if (!p) {
        p = {
          processo_id: refId,
          numero_cnj: cnj,
          tribunal: null,
          request_id: null,
          request_created_at: null,
          tracking_id: null,
          tracking_ativo: false,
          tracking_created_at: null,
          created_at: '',
        };
        byProcId.set(refId, p);
      }
      if (!p.numero_cnj && cnj) p.numero_cnj = cnj;
      return p;
    };
    // attach most recent request_detalhes
    for (const b of bancoIds) {
      if (b.tipo !== 'request_detalhes') continue;
      const p = ensure(b.referencia_id, (b.metadata?.numero_cnj as string) || null);
      if (!p) continue;
      if (!p.request_id || (b.created_at > (p.request_created_at || ''))) {
        p.request_id = b.external_id;
        p.request_created_at = b.created_at;
      }
    }
    // attach most recent tracking (active wins)
    for (const b of bancoIds) {
      if (b.tipo !== 'tracking' && b.tipo !== 'tracking_desativado') continue;
      const p = ensure(b.referencia_id, (b.metadata?.numero_cnj as string) || null);
      if (!p) continue;
      const ativo = b.tipo === 'tracking' && (b.metadata?.monitoramento_ativo !== false);
      if (!p.tracking_id || (b.created_at > (p.tracking_created_at || ''))) {
        p.tracking_id = b.external_id;
        p.tracking_ativo = ativo;
        p.tracking_created_at = b.created_at;
      }
    }
    return Array.from(byProcId.values()).sort((a, b) =>
      (b.created_at || '').localeCompare(a.created_at || '')
    );
  }, [bancoIds]);

  const oabsAgg = useMemo<OabAgg[]>(() => {
    return bancoIds
      .filter((b) => b.tipo === 'oab')
      .map((b) => ({
        id: b.id,
        oab: b.descricao || (b.external_id || ''),
        external_id: b.external_id,
        created_at: b.created_at,
      }));
  }, [bancoIds]);

  const processosFiltered = useMemo(
    () => processosAgg.filter((p) => matches(p.numero_cnj, p.request_id, p.tracking_id, p.tribunal)),
    [processosAgg, term]
  );
  const requestsCnj = useMemo(
    () => processosAgg.filter((p) => p.request_id && matches(p.numero_cnj, p.request_id)),
    [processosAgg, term]
  );
  const trackings = useMemo(
    () => processosAgg.filter((p) => p.tracking_id && matches(p.numero_cnj, p.tracking_id)),
    [processosAgg, term]
  );
  const oabsFiltered = useMemo(
    () => oabsAgg.filter((o) => matches(o.oab, o.external_id)),
    [oabsAgg, term]
  );
  const historicoFiltered = useMemo(
    () => bancoIds.filter((b) => matches(b.descricao, b.external_id, b.referencia_id, b.tipo)),
    [bancoIds, term]
  );

  const counts = {
    processos: processosAgg.length,
    requests: processosAgg.filter((p) => p.request_id).length,
    trackings: processosAgg.filter((p) => p.tracking_id).length,
    trackingsAtivos: processosAgg.filter((p) => p.tracking_id && p.tracking_ativo).length,
    oabs: oabsAgg.length,
    historico: bancoIds.length,
  };

  const copyBtn = (val: string, label: string) => (
    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => handleCopy(val, label)}>
      {copiedId === val ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  );

  const codeCell = (val: string | null | undefined, label: string) =>
    val ? (
      <div className="flex items-center gap-1">
        <code className="flex-1 text-[11px] bg-background px-2 py-1 rounded font-mono truncate">{val}</code>
        {copyBtn(val, label)}
      </div>
    ) : (
      <span className="text-xs text-muted-foreground italic">—</span>
    );

  const handleDownloadReport = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const generatedAt = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Banco de IDs — ${tenantName}`, pageWidth / 2, 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Gerado em ${generatedAt}`, pageWidth / 2, 20, { align: 'center' });

    autoTable(doc, {
      startY: 26,
      head: [['CNJ', 'Request ID (CNJ)', 'Tracking ID', 'Monit.']],
      body: processosAgg
        .filter((p) => p.request_id || p.tracking_id)
        .sort((a, b) => (a.numero_cnj || '').localeCompare(b.numero_cnj || ''))
        .map((p) => [
          p.numero_cnj || '—',
          p.request_id || '—',
          p.tracking_id || '—',
          p.tracking_ativo ? 'Ativo' : '—',
        ]),
      styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak', font: 'courier' },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9, fontStyle: 'bold', font: 'helvetica' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 65 }, 2: { cellWidth: 55 }, 3: { cellWidth: 15 } },
      didDrawPage: () => {
        const pageCount = doc.getNumberOfPages();
        const currentPage = doc.getCurrentPageInfo().pageNumber;
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
        doc.setTextColor(0);
      },
    });

    const safeName = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    doc.save(`banco-ids-${safeName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({ title: 'Relatório gerado', description: `${processosAgg.length} processos exportados.` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Banco de IDs — {tenantName}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por CNJ, Request ID, Tracking ID, OAB..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="processos" className="text-xs">
              <Scale className="h-3 w-3 mr-1" />
              Processos ({counts.processos})
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Requests CNJ ({counts.requests})
            </TabsTrigger>
            <TabsTrigger value="trackings" className="text-xs">
              <Radio className="h-3 w-3 mr-1" />
              Trackings ({counts.trackingsAtivos}/{counts.trackings})
            </TabsTrigger>
            <TabsTrigger value="oabs" className="text-xs">OABs ({counts.oabs})</TabsTrigger>
            <TabsTrigger value="historico" className="text-xs">Histórico ({counts.historico})</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[480px] mt-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="pr-3 space-y-2">
                {/* TAB: Processos (visão consolidada) */}
                <TabsContent value="processos" className="m-0 space-y-2">
                  {processosFiltered.length === 0 ? (
                    <Empty />
                  ) : (
                    processosFiltered.map((p) => (
                      <div key={p.processo_id} className="p-3 bg-muted/40 rounded-lg border border-border">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Scale className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-mono text-sm font-medium truncate">
                              {p.numero_cnj || 'Sem CNJ'}
                            </span>
                            {p.tribunal && (
                              <Badge variant="secondary" className="text-xs">{p.tribunal}</Badge>
                            )}
                            {p.tracking_ativo ? (
                              <Badge className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                                🟢 Monitorando
                              </Badge>
                            ) : p.tracking_id ? (
                              <Badge variant="outline" className="text-xs">Desativado</Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="text-muted-foreground mb-0.5">Request ID (importação CNJ)</div>
                            {codeCell(p.request_id, 'Request ID')}
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-0.5">Tracking ID (monitoramento)</div>
                            {codeCell(p.tracking_id, 'Tracking ID')}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* TAB: Requests CNJ */}
                <TabsContent value="requests" className="m-0 space-y-2">
                  {requestsCnj.length === 0 ? (
                    <Empty />
                  ) : (
                    requestsCnj.map((p) => (
                      <div key={p.processo_id} className="p-3 bg-muted/40 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-1.5">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-mono text-sm font-medium truncate">
                            {p.numero_cnj || 'Sem CNJ'}
                          </span>
                          {p.tribunal && <Badge variant="secondary" className="text-xs">{p.tribunal}</Badge>}
                        </div>
                        {codeCell(p.request_id, 'Request ID')}
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* TAB: Trackings */}
                <TabsContent value="trackings" className="m-0 space-y-2">
                  {trackings.length === 0 ? (
                    <Empty />
                  ) : (
                    trackings.map((p) => (
                      <div key={p.processo_id} className="p-3 bg-muted/40 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Radio className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-mono text-sm font-medium truncate">
                            {p.numero_cnj || 'Sem CNJ'}
                          </span>
                          {p.tracking_ativo ? (
                            <Badge className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                              🟢 Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Desativado</Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mb-0.5">Tracking ID</div>
                        {codeCell(p.tracking_id, 'Tracking ID')}
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* TAB: OABs */}
                <TabsContent value="oabs" className="m-0 space-y-2">
                  {oabsFiltered.length === 0 ? (
                    <Empty />
                  ) : (
                    oabsFiltered.map((o) => (
                      <div key={o.id} className="p-3 bg-muted/40 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-1.5">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm font-medium">{o.oab}</span>
                        </div>
                        {codeCell(o.external_id, 'OAB ID')}
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* TAB: Histórico */}
                <TabsContent value="historico" className="m-0 space-y-2">
                  {historicoFiltered.length === 0 ? (
                    <Empty />
                  ) : (
                    historicoFiltered.map((item) => (
                      <div key={item.id} className="p-3 bg-muted/40 rounded-lg border border-border">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="text-[10px] uppercase">{item.tipo}</Badge>
                            <span className="text-sm truncate">{item.descricao}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {format(new Date(item.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                        {item.external_id && codeCell(item.external_id, 'ID')}
                      </div>
                    ))
                  )}
                </TabsContent>
              </div>
            )}
          </ScrollArea>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t border-border text-sm text-muted-foreground">
          <span>
            {counts.processos} processos · {counts.requests} requests · {counts.trackingsAtivos} monitorando
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadReport} disabled={loading || processos.length === 0}>
              <Download className="h-4 w-4 mr-1" /> Baixar PDF
            </Button>
            <Button variant="outline" size="sm" onClick={fetchAll}>Atualizar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
      <Database className="h-8 w-8 mb-2 opacity-50" />
      <p className="text-sm">Nenhum registro encontrado</p>
    </div>
  );
}
