import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, FileWarning } from 'lucide-react';
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
      // Aguarda um pouco e recarrega lista
      setTimeout(fetchProcessos, 1500);
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
      setTimeout(fetchProcessos, 2000);
      onComplete?.();
    } catch (err) {
      console.error('Erro no backfill:', err);
      toast.error('Erro ao recarregar em lote');
    } finally {
      setReloadingAll(false);
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

        <div className="flex justify-end">
          <Button
            onClick={handleReloadAll}
            disabled={reloadingAll || processos.length === 0}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReloadOne(p)}
                        disabled={reloadingId === p.id || reloadingAll}
                        className="gap-2"
                      >
                        {reloadingId === p.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        Recarregar
                      </Button>
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
