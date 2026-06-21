import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2, Check, X, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TribunalTag {
  id: string;
  slug: string;
  nome: string;
  cor: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export function GerenciarTribunaisDialog({ open, onOpenChange, onChanged }: Props) {
  const [loading, setLoading] = useState(false);
  const [lista, setLista] = useState<TribunalTag[]>([]);
  const [novoNome, setNovoNome] = useState('');
  const [novaCor, setNovaCor] = useState('#3b82f6');
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCor, setEditCor] = useState('');

  const carregar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('super-admin-listar-tribunais-andamento', { body: {} });
      if (error) throw error;
      setLista((data as any)?.tribunais || []);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar tribunais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) carregar();
  }, [open]);

  const criar = async () => {
    if (!novoNome.trim()) return;
    setCriando(true);
    try {
      const { data, error } = await supabase.functions.invoke('super-admin-gerenciar-tribunal-andamento', {
        body: { action: 'criar', slug: novoNome.trim(), nome: novoNome.trim(), cor: novaCor || null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).detail || (data as any).error);
      setNovoNome('');
      setNovaCor('#3b82f6');
      await carregar();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar tribunal');
    } finally {
      setCriando(false);
    }
  };

  const iniciarEdicao = (t: TribunalTag) => {
    setEditandoId(t.id);
    setEditNome(t.nome);
    setEditCor(t.cor || '#3b82f6');
  };

  const salvarEdicao = async () => {
    if (!editandoId) return;
    try {
      const { data, error } = await supabase.functions.invoke('super-admin-gerenciar-tribunal-andamento', {
        body: { action: 'editar', id: editandoId, nome: editNome.trim(), cor: editCor || null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).detail || (data as any).error);
      setEditandoId(null);
      await carregar();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao editar');
    }
  };

  const excluir = async (t: TribunalTag) => {
    if (!confirm(`Excluir o tribunal "${t.nome}"? Andamentos com essa tag perderão a cor mas manterão o nome.`)) return;
    try {
      const { data, error } = await supabase.functions.invoke('super-admin-gerenciar-tribunal-andamento', {
        body: { action: 'excluir', id: t.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).detail || (data as any).error);
      await carregar();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar tribunais</DialogTitle>
          <DialogDescription>
            Crie, edite ou exclua tags usadas para classificar movimentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-end gap-2 border-b pb-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex.: TJSP 1ª Instância"
                onKeyDown={(e) => { if (e.key === 'Enter') criar(); }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cor</label>
              <Input type="color" value={novaCor} onChange={(e) => setNovaCor(e.target.value)} className="w-12 p-1 h-9" />
            </div>
            <Button onClick={criar} disabled={criando || !novoNome.trim()}>
              {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : lista.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">Nenhum tribunal cadastrado.</div>
          ) : (
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {lista.map((t) => (
                <div key={t.id} className="flex items-center gap-2 border rounded p-2">
                  {editandoId === t.id ? (
                    <>
                      <Input type="color" value={editCor} onChange={(e) => setEditCor(e.target.value)} className="w-10 p-1 h-8" />
                      <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="flex-1 h-8" />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={salvarEdicao}><Check className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditandoId(null)}><X className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <>
                      <span className="h-4 w-4 rounded shrink-0 border" style={{ background: t.cor || 'transparent' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{t.nome}</div>
                        <div className="text-[10px] font-mono text-muted-foreground truncate">{t.slug}</div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => iniciarEdicao(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => excluir(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}