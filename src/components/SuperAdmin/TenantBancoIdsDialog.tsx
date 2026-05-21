import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, Copy, Check, Scale, FileText, Radio, Database, Download,
  ChevronLeft, ChevronRight, BellRing,
} from 'lucide-react';
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

interface PushDocRow {
  id: string;
  tipo_documento: 'cpf' | 'cnpj' | 'oab';
  documento: string;
  descricao: string | null;
  tracking_id: string | null;
  tracking_status: string;
  total_processos_recebidos: number;
  created_at: string;
}

type TabKey = 'trackings_on' | 'trackings_off' | 'oabs' | 'push_docs';

const PAGE_SIZE = 20;

export function TenantBancoIdsDialog({ open, onOpenChange, tenantId, tenantName }: TenantBancoIdsDialogProps) {
  const [bancoIds, setBancoIds] = useState<BancoId[]>([]);
  const [pushDocs, setPushDocs] = useState<PushDocRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('trackings_on');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (open && tenantId) fetchAll();
  }, [open, tenantId]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [bancoRes, pushRes] = await Promise.all([
        fetchAllPaginated<BancoId>(
          () =>
            supabase
              .from('tenant_banco_ids')
              .select('id, tipo, referencia_id, external_id, descricao, metadata, created_at')
              .eq('tenant_id', tenantId)
              .order('created_at', { ascending: false }),
          { hardCap: 200 }
        ),
        fetchAllPaginated<PushDocRow>(
          () =>
            supabase
              .from('push_docs_cadastrados')
              .select('id, tipo_documento, documento, descricao, tracking_id, tracking_status, total_processos_recebidos, created_at')
              .eq('tenant_id', tenantId)
              .neq('tracking_status', 'deletado')
              .order('created_at', { ascending: false })
        ),
      ]);
      if (bancoRes.error) throw bancoRes.error;
      if (pushRes.error) throw pushRes.error;
      setBancoIds(bancoRes.data || []);
      setPushDocs(pushRes.data || []);
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

  // Aggregate processos w/ tracking from tenant_banco_ids
  const processosAgg = useMemo<ProcessoAgg[]>(() => {
    const byProcId = new Map<string, ProcessoAgg>();
    const ensure = (refId: string | null, cnj: string | null, createdAt: string) => {
      if (!refId) return null;
      let p = byProcId.get(refId);
      if (!p) {
        p = {
          processo_id: refId,
          numero_cnj: cnj,
          tribunal: null,
          request_id: null,
          tracking_id: null,
          tracking_ativo: false,
          tracking_created_at: null,
          created_at: createdAt,
        };
        byProcId.set(refId, p);
      }
      if (!p.numero_cnj && cnj) p.numero_cnj = cnj;
      return p;
    };
    for (const b of bancoIds) {
      if (b.tipo === 'processo' && b.referencia_id) {
        const p = ensure(b.referencia_id, (b.metadata?.numero_cnj as string) || null, b.created_at);
        if (p && b.metadata?.tribunal) p.tribunal = b.metadata.tribunal as string;
      }
    }
    for (const b of bancoIds) {
      if (b.tipo !== 'request_detalhes') continue;
      const p = ensure(b.referencia_id, (b.metadata?.numero_cnj as string) || null, b.created_at);
      if (p && !p.request_id) p.request_id = b.external_id;
    }
    for (const b of bancoIds) {
      if (b.tipo !== 'tracking' && b.tipo !== 'tracking_desativado') continue;
      const p = ensure(b.referencia_id, (b.metadata?.numero_cnj as string) || null, b.created_at);
      if (!p) continue;
      const ativo = b.tipo === 'tracking' && b.metadata?.monitoramento_ativo !== false;
      if (!p.tracking_id || b.created_at > (p.tracking_created_at || '')) {
        p.tracking_id = b.external_id;
        p.tracking_ativo = ativo;
        p.tracking_created_at = b.created_at;
      }
    }
    return Array.from(byProcId.values());
  }, [bancoIds]);

  const oabsAgg = useMemo<OabAgg[]>(
    () =>
      bancoIds
        .filter((b) => b.tipo === 'oab')
        .map((b) => ({
          id: b.id,
          oab: b.descricao || b.external_id || '',
          external_id: b.external_id,
          created_at: b.created_at,
        })),
    [bancoIds]
  );

  const trackingsOn = useMemo(
    () =>
      processosAgg
        .filter((p) => p.tracking_id && p.tracking_ativo && matches(p.numero_cnj, p.tracking_id))
        .sort((a, b) => (b.tracking_created_at || '').localeCompare(a.tracking_created_at || '')),
    [processosAgg, term]
  );
  const trackingsOff = useMemo(
    () =>
      processosAgg
        .filter((p) => p.tracking_id && !p.tracking_ativo && matches(p.numero_cnj, p.tracking_id))
        .sort((a, b) => (b.tracking_created_at || '').localeCompare(a.tracking_created_at || '')),
    [processosAgg, term]
  );
  const oabsFiltered = useMemo(
    () => oabsAgg.filter((o) => matches(o.oab, o.external_id)),
    [oabsAgg, term]
  );
  const pushDocsFiltered = useMemo(
    () => pushDocs.filter((d) => matches(d.documento, d.descricao, d.tracking_id)),
    [pushDocs, term]
  );

  const counts = {
    on: trackingsOn.length,
    off: trackingsOff.length,
    oabs: oabsFiltered.length,
    pushDocs: pushDocsFiltered.length,
  };

  const currentList: any[] =
    activeTab === 'trackings_on' ? trackingsOn
    : activeTab === 'trackings_off' ? trackingsOff
    : activeTab === 'oabs' ? oabsFiltered
    : pushDocsFiltered;

  const totalPages = Math.max(1, Math.ceil(currentList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = currentList.slice(pageStart, pageStart + PAGE_SIZE);

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

  const renderTrackingItem = (p: ProcessoAgg, ativo: boolean) => (
    <div key={p.processo_id} className="p-3 bg-muted/40 rounded-lg border border-border">
      <div className="flex items-center gap-2 mb-1.5">
        <Radio className="h-4 w-4 text-primary shrink-0" />
        <span className="font-mono text-sm font-medium truncate">{p.numero_cnj || 'Sem CNJ'}</span>
        {p.tribunal && <Badge variant="secondary" className="text-xs">{p.tribunal}</Badge>}
        {ativo ? (
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
  );

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      ativo: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      pausado: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
      pendente: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
      erro: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
    };
    return <Badge className={`text-xs border ${map[s] || 'bg-muted text-muted-foreground'}`}>{s}</Badge>;
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
            placeholder="Buscar por CNJ, Tracking ID, OAB ou documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trackings_on" className="text-xs">
              <Radio className="h-3 w-3 mr-1" /> Trackings ON ({counts.on})
            </TabsTrigger>
            <TabsTrigger value="trackings_off" className="text-xs">
              <Radio className="h-3 w-3 mr-1" /> Trackings OFF ({counts.off})
            </TabsTrigger>
            <TabsTrigger value="oabs" className="text-xs">
              <Scale className="h-3 w-3 mr-1" /> OABs ({counts.oabs})
            </TabsTrigger>
            <TabsTrigger value="push_docs" className="text-xs">
              <BellRing className="h-3 w-3 mr-1" /> Push-docs ({counts.pushDocs})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[460px] mt-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="pr-3 space-y-2">
                <TabsContent value="trackings_on" className="m-0 space-y-2">
                  {pageItems.length === 0 ? <Empty /> : (pageItems as ProcessoAgg[]).map((p) => renderTrackingItem(p, true))}
                </TabsContent>

                <TabsContent value="trackings_off" className="m-0 space-y-2">
                  {pageItems.length === 0 ? <Empty /> : (pageItems as ProcessoAgg[]).map((p) => renderTrackingItem(p, false))}
                </TabsContent>

                <TabsContent value="oabs" className="m-0 space-y-2">
                  {pageItems.length === 0 ? (
                    <Empty />
                  ) : (
                    (pageItems as OabAgg[]).map((o) => (
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

                <TabsContent value="push_docs" className="m-0 space-y-2">
                  {pageItems.length === 0 ? (
                    <Empty />
                  ) : (
                    (pageItems as PushDocRow[]).map((d) => (
                      <div key={d.id} className="p-3 bg-muted/40 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <BellRing className="h-4 w-4 text-primary shrink-0" />
                          <Badge variant="outline" className="text-[10px] uppercase">{d.tipo_documento}</Badge>
                          <span className="font-mono text-sm font-medium truncate">{d.documento}</span>
                          {statusBadge(d.tracking_status)}
                          <span className="text-[11px] text-muted-foreground ml-auto">
                            {d.total_processos_recebidos} processos
                          </span>
                        </div>
                        {d.descricao && (
                          <div className="text-xs text-muted-foreground mb-1.5">{d.descricao}</div>
                        )}
                        <div className="text-[11px] text-muted-foreground mb-0.5">Tracking ID</div>
                        {codeCell(d.tracking_id, 'Tracking ID')}
                      </div>
                    ))
                  )}
                </TabsContent>
              </div>
            )}
          </ScrollArea>
        </Tabs>

        <div className="flex flex-wrap justify-between items-center gap-2 pt-4 border-t border-border text-sm text-muted-foreground">
          <span>
            {currentList.length === 0
              ? 'Nenhum registro'
              : `${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, currentList.length)} de ${currentList.length}`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs tabular-nums">
              Página {safePage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadReport} disabled={loading || processosAgg.length === 0}>
              <Download className="h-4 w-4 mr-1" /> PDF
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
