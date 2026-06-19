import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { Download, Trash2, Loader2, AlertTriangle, FolderArchive, Calendar, User, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Tenant } from '@/types/superadmin';
import { toast } from 'sonner';
import { format } from 'date-fns';

type ArquivoSource = 'reuniao' | 'reuniao_cliente';

interface ArquivoRow {
  id: string;
  source: ArquivoSource;
  bucket: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
  parent_id: string | null;
}

interface ReuniaoInfo {
  id: string;
  titulo: string | null;
  data: string | null;
  horario: string | null;
  cliente_nome: string | null;
}

interface ClienteInfo {
  id: string;
  nome: string | null;
  telefone: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
}

const BUCKET_BY_SOURCE: Record<ArquivoSource, string> = {
  reuniao: 'reuniao-attachments',
  reuniao_cliente: 'reuniao-cliente-attachments',
};

const FOLDER_BY_SOURCE: Record<ArquivoSource, string> = {
  reuniao: 'reunioes',
  reuniao_cliente: 'reunioes-clientes',
};

function formatBytes(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return results;
}

export function TenantReuniaoArquivosDialog({ open, onOpenChange, tenant }: Props) {
  const [loading, setLoading] = useState(false);
  const [arquivos, setArquivos] = useState<ArquivoRow[]>([]);
  const [reunioesById, setReunioesById] = useState<Record<string, ReuniaoInfo>>({});
  const [clientesById, setClientesById] = useState<Record<string, ClienteInfo>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<ArquivoSource>('reuniao');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ scope: 'all' | 'selected' } | null>(null);
  const [singleDelete, setSingleDelete] = useState<ArquivoRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        supabase
          .from('reuniao_arquivos')
          .select('id,file_name,file_path,file_size,file_type,created_at,reuniao_id')
          .eq('tenant_id', tenant.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('reuniao_cliente_arquivos')
          .select('id,file_name,file_path,file_size,file_type,created_at,cliente_id')
          .eq('tenant_id', tenant.id)
          .order('created_at', { ascending: false }),
      ]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
      const rows: ArquivoRow[] = [
        ...(a.data || []).map((r: any) => ({
          id: r.id,
          file_name: r.file_name,
          file_path: r.file_path,
          file_size: r.file_size,
          file_type: r.file_type,
          created_at: r.created_at,
          parent_id: r.reuniao_id ?? null,
          source: 'reuniao' as const,
          bucket: BUCKET_BY_SOURCE.reuniao,
        })),
        ...(b.data || []).map((r: any) => ({
          id: r.id,
          file_name: r.file_name,
          file_path: r.file_path,
          file_size: r.file_size,
          file_type: r.file_type,
          created_at: r.created_at,
          parent_id: r.cliente_id ?? null,
          source: 'reuniao_cliente' as const,
          bucket: BUCKET_BY_SOURCE.reuniao_cliente,
        })),
      ];
      setArquivos(rows);
      setSelected(new Set());

      // Carrega contexto (reuniões / clientes) para exibir origem
      const reuniaoIds = Array.from(new Set((a.data || []).map((r: any) => r.reuniao_id).filter(Boolean)));
      const clienteIds = Array.from(new Set((b.data || []).map((r: any) => r.cliente_id).filter(Boolean)));
      const [rRes, cRes] = await Promise.all([
        reuniaoIds.length
          ? supabase
              .from('reunioes')
              .select('id,titulo,data,horario,cliente_nome')
              .in('id', reuniaoIds as string[])
          : Promise.resolve({ data: [] as any[], error: null }),
        clienteIds.length
          ? supabase
              .from('reuniao_clientes')
              .select('id,nome,telefone')
              .in('id', clienteIds as string[])
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);
      const rMap: Record<string, ReuniaoInfo> = {};
      (rRes.data || []).forEach((r: any) => { rMap[r.id] = r; });
      const cMap: Record<string, ClienteInfo> = {};
      (cRes.data || []).forEach((c: any) => { cMap[c.id] = c; });
      setReunioesById(rMap);
      setClientesById(cMap);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar arquivos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tenant.id]);

  const reuniao = useMemo(() => arquivos.filter((a) => a.source === 'reuniao'), [arquivos]);
  const reuniaoCliente = useMemo(() => arquivos.filter((a) => a.source === 'reuniao_cliente'), [arquivos]);
  const totalSize = arquivos.reduce((acc, a) => acc + (a.file_size || 0), 0);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const downloadOne = async (row: ArquivoRow) => {
    setBusy(row.id);
    try {
      const { data, error } = await supabase.storage.from(row.bucket).createSignedUrl(row.file_path, 60, {
        download: row.file_name,
      });
      if (error || !data) throw error;
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = row.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
      toast.error('Falha ao baixar arquivo');
    } finally {
      setBusy(null);
    }
  };

  const downloadZip = async (rows: ArquivoRow[]) => {
    if (!rows.length) return;
    setBusy('zip');
    const zip = new JSZip();
    let ok = 0;
    let fail = 0;
    try {
      await runWithConcurrency(rows, 4, async (row) => {
        try {
          const { data, error } = await supabase.storage.from(row.bucket).download(row.file_path);
          if (error || !data) throw error;
          const folder = FOLDER_BY_SOURCE[row.source];
          // evitar colisao de nome
          const safeName = `${row.id.slice(0, 8)}-${row.file_name}`;
          zip.file(`${folder}/${safeName}`, data);
          ok++;
        } catch (e) {
          console.error('zip download error', row, e);
          fail++;
        }
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tenant.slug}-reunioes-${format(new Date(), 'yyyy-MM-dd')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`ZIP gerado (${ok} arquivos${fail ? `, ${fail} falharam` : ''})`);
    } catch (e) {
      console.error(e);
      toast.error('Falha ao gerar ZIP');
    } finally {
      setBusy(null);
    }
  };

  const deleteRows = async (rows: ArquivoRow[]) => {
    if (!rows.length) return;
    setBusy('delete');
    let ok = 0;
    let fail = 0;
    try {
      // agrupa por bucket para remoção em lote
      const byBucket = new Map<string, ArquivoRow[]>();
      for (const r of rows) {
        const arr = byBucket.get(r.bucket) || [];
        arr.push(r);
        byBucket.set(r.bucket, arr);
      }
      const removed = new Set<string>();
      for (const [bucket, list] of byBucket) {
        // chunks de 100 paths
        for (let i = 0; i < list.length; i += 100) {
          const chunk = list.slice(i, i + 100);
          const { error } = await supabase.storage.from(bucket).remove(chunk.map((c) => c.file_path));
          if (error) {
            console.error('storage remove error', bucket, error);
            fail += chunk.length;
            continue;
          }
          chunk.forEach((c) => removed.add(c.id));
        }
      }
      // deleta linhas das tabelas (somente as que removemos do storage)
      const reuniaoIds = rows.filter((r) => r.source === 'reuniao' && removed.has(r.id)).map((r) => r.id);
      const clienteIds = rows.filter((r) => r.source === 'reuniao_cliente' && removed.has(r.id)).map((r) => r.id);
      if (reuniaoIds.length) {
        const { error } = await supabase.from('reuniao_arquivos').delete().in('id', reuniaoIds);
        if (error) { fail += reuniaoIds.length; console.error(error); }
        else ok += reuniaoIds.length;
      }
      if (clienteIds.length) {
        const { error } = await supabase.from('reuniao_cliente_arquivos').delete().in('id', clienteIds);
        if (error) { fail += clienteIds.length; console.error(error); }
        else ok += clienteIds.length;
      }
      if (ok) toast.success(`${ok} arquivo(s) apagado(s)${fail ? ` · ${fail} falharam` : ''}`);
      else toast.error('Nenhum arquivo apagado');
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Falha ao apagar arquivos');
    } finally {
      setBusy(null);
    }
  };

  const askDelete = (scope: 'all' | 'selected') => {
    setPendingDelete({ scope });
    setConfirmText('');
    setConfirmOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (!pendingDelete) return;
    const rows = pendingDelete.scope === 'all'
      ? arquivos
      : arquivos.filter((a) => selected.has(a.id));
    setConfirmOpen(false);
    setPendingDelete(null);
    await deleteRows(rows);
  };

  const renderTable = (rows: ArquivoRow[]) => (
    <ScrollArea className="h-[360px] border border-border rounded-md">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 sticky top-0">
          <tr className="text-left">
            <th className="p-2 w-8"></th>
            <th className="p-2">Nome</th>
            <th className="p-2">Origem</th>
            <th className="p-2 w-24">Tamanho</th>
            <th className="p-2 w-32">Data</th>
            <th className="p-2 w-24 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum arquivo</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border hover:bg-muted/30">
              <td className="p-2">
                <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
              </td>
              <td className="p-2 truncate max-w-[280px]" title={r.file_name}>{r.file_name}</td>
              <td className="p-2 max-w-[260px]">{renderOrigem(r)}</td>
              <td className="p-2 text-muted-foreground">{formatBytes(r.file_size)}</td>
              <td className="p-2 text-muted-foreground">{format(new Date(r.created_at), 'dd/MM/yyyy')}</td>
              <td className="p-2">
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => downloadOne(r)} disabled={busy === r.id} title="Baixar">
                    {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setSingleDelete(r)} title="Apagar">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );

  const renderOrigem = (r: ArquivoRow) => {
    if (!r.parent_id) {
      return <Badge variant="destructive" className="text-[10px]">Órfão</Badge>;
    }
    if (r.source === 'reuniao') {
      const info = reunioesById[r.parent_id];
      if (!info) {
        return (
          <span className="inline-flex items-center gap-1 text-xs">
            <Badge variant="destructive" className="text-[10px]">Órfão</Badge>
            <span className="text-muted-foreground truncate" title={r.parent_id}>{r.parent_id.slice(0, 8)}…</span>
          </span>
        );
      }
      const dataStr = info.data ? format(new Date(`${info.data}T12:00:00`), 'dd/MM/yyyy') : '';
      const href = `/reunioes?id=${info.id}`;
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:underline" title={info.id}>
          <span className="inline-flex items-center gap-1 text-xs font-medium">
            <Calendar className="h-3 w-3" />
            <span className="truncate max-w-[200px]">{info.titulo || 'Sem título'}</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </span>
          <span className="block text-[11px] text-muted-foreground truncate">
            {dataStr}{info.horario ? ` ${info.horario}` : ''}{info.cliente_nome ? ` · ${info.cliente_nome}` : ''}
          </span>
        </a>
      );
    }
    const info = clientesById[r.parent_id];
    if (!info) {
      return (
        <span className="inline-flex items-center gap-1 text-xs">
          <Badge variant="destructive" className="text-[10px]">Órfão</Badge>
          <span className="text-muted-foreground truncate" title={r.parent_id}>{r.parent_id.slice(0, 8)}…</span>
        </span>
      );
    }
    const href = `/reuniao-clientes?id=${info.id}`;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:underline" title={info.id}>
        <span className="inline-flex items-center gap-1 text-xs font-medium">
          <User className="h-3 w-3" />
          <span className="truncate max-w-[200px]">{info.nome || 'Sem nome'}</span>
          <ExternalLink className="h-3 w-3 opacity-60" />
        </span>
        {info.telefone && (
          <span className="block text-[11px] text-muted-foreground truncate">{info.telefone}</span>
        )}
      </a>
    );
  };

  const selectedRows = arquivos.filter((a) => selected.has(a.id));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderArchive className="h-5 w-5" />
              Documentos de Reuniões — {tenant.name}
            </DialogTitle>
            <DialogDescription>
              Baixe um backup local antes de apagar permanentemente. A exclusão remove os arquivos do storage e do banco.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{arquivos.length} arquivo(s)</Badge>
            <Badge variant="secondary">{formatBytes(totalSize)}</Badge>
            {selected.size > 0 && <Badge>{selected.size} selecionado(s)</Badge>}
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as ArquivoSource)}>
            <TabsList>
              <TabsTrigger value="reuniao">Reuniões ({reuniao.length})</TabsTrigger>
              <TabsTrigger value="reuniao_cliente">Dossiê do Cliente ({reuniaoCliente.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="reuniao" className="mt-3">{renderTable(reuniao)}</TabsContent>
            <TabsContent value="reuniao_cliente" className="mt-3">{renderTable(reuniaoCliente)}</TabsContent>
          </Tabs>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={!selectedRows.length || !!busy} onClick={() => downloadZip(selectedRows)}>
                <Download className="h-4 w-4 mr-1" /> Baixar selecionados (ZIP)
              </Button>
              <Button size="sm" variant="outline" disabled={!arquivos.length || !!busy} onClick={() => downloadZip(arquivos)}>
                {busy === 'zip' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                Baixar tudo (ZIP)
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="destructive" disabled={!selectedRows.length || !!busy} onClick={() => askDelete('selected')}>
                <Trash2 className="h-4 w-4 mr-1" /> Apagar selecionados
              </Button>
              <Button size="sm" variant="destructive" disabled={!arquivos.length || !!busy} onClick={() => askDelete('all')}>
                <Trash2 className="h-4 w-4 mr-1" /> Apagar TUDO
              </Button>
            </div>
          </div>
          {loading && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão em massa */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Apagar permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Você vai apagar {pendingDelete?.scope === 'all' ? `TODOS os ${arquivos.length} arquivos` : `${selected.size} arquivo(s) selecionado(s)`} de <strong>{tenant.name}</strong>. Esta ação é irreversível.
              </span>
              <span className="block">Digite <strong>APAGAR</strong> para confirmar:</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="APAGAR" autoFocus />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" disabled={confirmText !== 'APAGAR' || !!busy} onClick={confirmBulkDelete}>
              {busy === 'delete' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Apagar permanentemente
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação individual */}
      <AlertDialog open={!!singleDelete} onOpenChange={(o) => !o && setSingleDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Apagar arquivo
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apagar <strong>{singleDelete?.file_name}</strong> permanentemente? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" disabled={!!busy} onClick={async () => {
              if (!singleDelete) return;
              const row = singleDelete;
              setSingleDelete(null);
              await deleteRows([row]);
            }}>
              Apagar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}