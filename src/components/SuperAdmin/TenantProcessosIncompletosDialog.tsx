import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, FileWarning, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tenant } from '@/types/superadmin';

interface ProcessoIncompleto {
  id: string;
  numero_cnj: string | null;
  created_at: string;
  monitoramento_ativo: boolean | null;
  oab_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
  onComplete?: () => void;
}

export function TenantProcessosIncompletosDialog({ open, onOpenChange, tenant, onComplete }: Props) {
  const [processos, setProcessos] = useState<ProcessoIncompleto[]>([]);
  const [loading, setLoading] = useState(false);
  const [reloadingId, setReloadingId] = useState<string | null>(null);
  const [reloadingAll, setReloadingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const fetchProcessos = async () => {
    setLoading(true);
    try {
      // RPC SECURITY DEFINER permite super admin ver dados cross-tenant
      const { data, error } = await supabase.rpc('get_incomplete_processos_by_tenant', {
        p_tenant_id: tenant.id,
      });

      if (error) throw error;
      setProcessos((data || []) as ProcessoIncompleto[]);
    } catch (err) {
      console.error('Erro ao carregar processos incompletos:', err);
      toast.error('Erro ao carregar processos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchProcessos();
  }, [open, tenant.id]);

  const handleReloadOne = async (processo: ProcessoIncompleto) => {
    if (!processo.numero_cnj) return;
    setReloadingId(processo.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.functions.invoke('judit-buscar-detalhes-processo', {
        body: {
          processoOabId: processo.id,
          numeroCnj: processo.numero_cnj,
          tenantId: tenant.id,
          userId: user?.id,
          oabId: processo.oab_id,
        },
      });
      if (error) throw error;
      toast.success(`Detalhes solicitados para ${processo.numero_cnj}`);
      await fetchProcessos();
      onComplete?.();
    } catch (err) {
      console.error('Erro ao recarregar:', err);
      toast.error('Erro ao recarregar detalhes');
    } finally {
      setReloadingId(null);
    }
  };

  const handleReloadAll = async () => {
    if (!confirm(`Recarregar detalhes de até 50 processos? Pode levar alguns minutos.`)) return;
    setReloadingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke('judit-backfill-detalhes-tenant', {
        body: { tenantId: tenant.id, batchSize: 50 },
      });
      if (error) throw error;
      toast.success(
        `Processados: ${data.success_count} sucesso, ${data.failed_count} falhas (de ${data.processed})`,
      );
      await fetchProcessos();
      onComplete?.();
    } catch (err) {
      console.error('Erro no backfill:', err);
      toast.error('Erro ao recarregar em lote');
    } finally {
      setReloadingAll(false);
    }
  };

  const deleteProcessoCascade = async (id: string) => {
    // Desativa monitoramento (caso haja triggers que dependam) e apaga andamentos + processo
    await supabase.from('processos_oab').update({ monitoramento_ativo: false }).eq('id', id);
    await supabase.from('processos_oab_andamentos').delete().eq('processo_oab_id', id);
    const { error } = await supabase.from('processos_oab').delete().eq('id', id);
    if (error) throw error;
  };

  const handleDeleteOne = async (processo: ProcessoIncompleto) => {
    if (!confirm(`Excluir definitivamente o processo ${processo.numero_cnj}?`)) return;
    setDeletingId(processo.id);
    try {
      await deleteProcessoCascade(processo.id);
      toast.success(`Processo ${processo.numero_cnj} excluído`);
      setProcessos((prev) => prev.filter((p) => p.id !== processo.id));
      onComplete?.();
    } catch (err: any) {
      console.error('Erro ao excluir:', err);
      toast.error(err.message || 'Erro ao excluir processo');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (processos.length === 0) return;
    if (!confirm(`Excluir TODOS os ${processos.length} processos incompletos deste tenant? Esta ação é irreversível.`)) return;
    setDeletingAll(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const p of processos) {
        try {
          await deleteProcessoCascade(p.id);
          ok++;
        } catch (e) {
          console.error('Falha ao excluir', p.numero_cnj, e);
          fail++;
        }
      }
      toast.success(`Exclusão concluída: ${ok} sucesso${fail ? `, ${fail} falhas` : ''}`);
      await fetchProcessos();
      onComplete?.();
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-amber-500" />
            Processos Incompletos — {tenant.name}
            <Badge variant="secondary">{processos.length}</Badge>
          </DialogTitle>
          <DialogDescription>
            Processos importados que ainda não tiveram os detalhes carregados da Judit
            (sem <code className="text-xs">detalhes_request_id</code>).
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 flex-wrap">
          <Button
            onClick={handleDeleteAll}
            disabled={deletingAll || processos.length === 0 || reloadingAll}
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            {deletingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Excluir todos
          </Button>
          <Button
            onClick={handleReloadAll}
            disabled={reloadingAll || processos.length === 0 || deletingAll}
            variant="default"
            size="sm"
            className="gap-2"
          >
            {reloadingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Recarregar todos (lote 50)
          </Button>
        </div>

        <ScrollArea className="h-[55vh] border border-border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : processos.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              Nenhum processo incompleto neste tenant 🎉
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CNJ</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Monitoramento</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.numero_cnj}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {p.monitoramento_ativo ? (
                        <Badge variant="default" className="bg-green-500/20 text-green-700 dark:text-green-400">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReloadOne(p)}
                          disabled={reloadingId === p.id || reloadingAll || deletingAll || deletingId === p.id}
                          className="gap-2"
                        >
                          {reloadingId === p.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Recarregar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteOne(p)}
                          disabled={deletingId === p.id || deletingAll || reloadingAll}
                          className="gap-2 text-destructive hover:text-destructive"
                        >
                          {deletingId === p.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
