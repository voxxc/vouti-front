import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, FilePlus2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tenant } from '@/types/superadmin';
import { AdicionarMovimentoManualDialog } from './AdicionarMovimentoManualDialog';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
}

interface ProcessoLite {
  id: string;
  numero_cnj: string;
  parte_ativa: string | null;
  parte_passiva: string | null;
  tribunal_sigla: string | null;
}

export function SuperAdminMovimentosManuaisDrawer({ open, onOpenChange, tenant }: Props) {
  const [loading, setLoading] = useState(false);
  const [processos, setProcessos] = useState<ProcessoLite[]>([]);
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<ProcessoLite | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          'super-admin-listar-processos-oab',
          { body: { tenant_id: tenant.id } },
        );
        if (error) throw error;
        if (!cancel) setProcessos((data as any)?.processos || []);
      } catch (e) {
        console.error(e);
        toast.error('Erro ao carregar processos do tenant');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [open, tenant.id]);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return processos;
    return processos.filter(
      (p) =>
        p.numero_cnj?.toLowerCase().includes(t) ||
        p.parte_ativa?.toLowerCase().includes(t) ||
        p.parte_passiva?.toLowerCase().includes(t),
    );
  }, [processos, busca]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus2 className="h-5 w-5" />
              Movimentos manuais — {tenant.name}
            </DialogTitle>
            <DialogDescription>
              Selecione um processo para lançar um andamento manualmente. Ele aparecerá na Central
              de Não Lidos dos usuários do tenant.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por CNJ, parte ativa ou passiva…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            {loading ? 'Carregando…' : `${filtrados.length} processo(s)`}
          </div>

          <ScrollArea className="flex-1 min-h-[300px] pr-3">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : filtrados.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                Nenhum processo encontrado.
              </div>
            ) : (
              <div className="space-y-2">
                {filtrados.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelecionado(p)}
                    className="w-full text-left rounded-md border border-border/60 hover:bg-muted/40 transition-colors p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm">{p.numero_cnj}</span>
                      {p.tribunal_sigla && (
                        <Badge variant="outline" className="text-xs">
                          {p.tribunal_sigla}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.parte_ativa || '—'} <span className="opacity-60">×</span>{' '}
                      {p.parte_passiva || '—'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {selecionado && (
        <AdicionarMovimentoManualDialog
          open={!!selecionado}
          onOpenChange={(o) => !o && setSelecionado(null)}
          processo={selecionado}
          tenantNome={tenant.name}
          onSuccess={() => setSelecionado(null)}
        />
      )}
    </>
  );
}