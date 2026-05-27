import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, IdCard, Save, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}

interface CredencialRow {
  id: string;
  system_name: string;
  customer_key: string;
  apelido: string | null;
  status: string;
}

export function CartaoCredencialDialog({ open, onOpenChange, tenantId, tenantName }: Props) {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cartao-credenciais', tenantId],
    enabled: open && !!tenantId,
    queryFn: async (): Promise<CredencialRow[]> => {
      const { data, error } = await supabase
        .from('credenciais_judit')
        .select('id, system_name, customer_key, apelido, status, created_at')
        .eq('tenant_id', tenantId)
        .neq('status', 'removed')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CredencialRow[];
    },
  });

  useEffect(() => {
    if (data) {
      const initial: Record<string, string> = {};
      data.forEach((c) => { initial[c.id] = c.apelido ?? ''; });
      setEdits(initial);
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async ({ id, apelido }: { id: string; apelido: string }) => {
      const trimmed = apelido.trim();
      const { error: rpcError } = await supabase.rpc('update_judit_credential_apelido', {
        p_id: id,
        p_apelido: trimmed,
      });
      if (rpcError) {
        // Fallback: super-admin pode atualizar direto pela tabela
        const { error: updError } = await supabase
          .from('credenciais_judit')
          .update({ apelido: trimmed || null })
          .eq('id', id);
        if (updError) throw updError;
      }
    },
    onSuccess: () => {
      toast.success('Apelido atualizado');
      qc.invalidateQueries({ queryKey: ['cartao-credenciais', tenantId] });
      qc.invalidateQueries({ queryKey: ['judit-system-names', tenantId] });
      qc.invalidateQueries({ queryKey: ['tenant-credenciais-judit', tenantId] });
    },
    onError: (e: Error) => toast.error('Erro ao salvar: ' + e.message),
  });

  const handleSave = async (id: string) => {
    setSavingId(id);
    try {
      await saveMut.mutateAsync({ id, apelido: edits[id] ?? '' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IdCard className="w-5 h-5" />
            Cartão Credencial — {tenantName}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Defina um apelido amigável para cada credencial. Ele será exibido na tela de importar processo por CNJ.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : !data || data.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">Nenhuma credencial cadastrada.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apelido</TableHead>
                <TableHead className="w-[140px]">Sistema</TableHead>
                <TableHead>Customer Key</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => {
                const current = edits[c.id] ?? '';
                const original = c.apelido ?? '';
                const dirty = current.trim() !== original.trim();
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Input
                        value={current}
                        onChange={(e) => setEdits((p) => ({ ...p, [c.id]: e.target.value }))}
                        placeholder="Ex.: PJE TJRO — Dr. Alan"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{c.system_name || '*'}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[200px]" title={c.customer_key}>
                      {c.customer_key}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.status === 'active' ? 'default' : c.status === 'error' ? 'destructive' : 'secondary'}
                        className="text-[10px]"
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={dirty ? 'default' : 'ghost'}
                        disabled={!dirty || savingId === c.id}
                        onClick={() => handleSave(c.id)}
                      >
                        {savingId === c.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : dirty ? (
                          <Save className="w-4 h-4" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CartaoCredencialDialog;