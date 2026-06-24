import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Pencil, Plus, Trash2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface SistemaTag {
  id: string;
  slug: string;
  nome: string;
  cor: string | null;
}

interface Props {
  processoOabId: string;
  sistemaTag: string | null | undefined;
  fallbackSigla?: string | null;
  onChanged: (slug: string | null) => void;
}

export function SistemaProcessoBadge({ processoOabId, sistemaTag, fallbackSigla, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [lista, setLista] = useState<SistemaTag[]>([]);
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaCor, setNovaCor] = useState('#3b82f6');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCor, setEditCor] = useState('');

  const atual = lista.find((s) => s.slug === sistemaTag);

  const carregar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('super-admin-listar-sistemas-processo', { body: {} });
      if (error) throw error;
      setLista(((data as any)?.sistemas || []) as SistemaTag[]);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar sistemas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) carregar();
  }, [open]);

  const aplicar = async (slug: string | null) => {
    setSalvando(true);
    try {
      const { data, error } = await supabase.functions.invoke('super-admin-atualizar-processo-oab-meta', {
        body: { processo_oab_id: processoOabId, sistema_tag: slug },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).detail || (data as any).error);
      onChanged(slug);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao aplicar sistema');
    } finally {
      setSalvando(false);
    }
  };

  const criar = async () => {
    if (!novoNome.trim()) return;
    setCriando(true);
    try {
      const { data, error } = await supabase.functions.invoke('super-admin-gerenciar-sistema-processo', {
        body: { action: 'criar', nome: novoNome.trim(), cor: novaCor || null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).detail || (data as any).error);
      const novo = (data as any)?.sistema as SistemaTag;
      setLista((prev) => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNovoNome('');
      setNovaCor('#3b82f6');
      if (novo?.slug) await aplicar(novo.slug);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar sistema');
    } finally {
      setCriando(false);
    }
  };

  const iniciarEdicao = (s: SistemaTag) => {
    setEditandoId(s.id);
    setEditNome(s.nome);
    setEditCor(s.cor || '#3b82f6');
  };

  const salvarEdicao = async () => {
    if (!editandoId) return;
    try {
      const { data, error } = await supabase.functions.invoke('super-admin-gerenciar-sistema-processo', {
        body: { action: 'editar', id: editandoId, nome: editNome.trim(), cor: editCor || null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).detail || (data as any).error);
      const upd = (data as any)?.sistema as SistemaTag;
      setLista((prev) => prev.map((x) => (x.id === upd.id ? upd : x)).sort((a, b) => a.nome.localeCompare(b.nome)));
      setEditandoId(null);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao editar');
    }
  };

  const excluir = async (s: SistemaTag) => {
    if (!confirm(`Excluir o sistema "${s.nome}"? Processos que usam ele voltarão a mostrar a sigla automática.`)) return;
    try {
      const { data, error } = await supabase.functions.invoke('super-admin-gerenciar-sistema-processo', {
        body: { action: 'excluir', id: s.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).detail || (data as any).error);
      setLista((prev) => prev.filter((x) => x.id !== s.id));
      if (sistemaTag === s.slug) onChanged(null);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir');
    }
  };

  const labelAtual = atual?.nome || sistemaTag || fallbackSigla || 'Definir sistema';
  const corAtual = atual?.cor || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center"
          title="Editar sistema do processo"
        >
          <Badge
            variant="outline"
            className="text-xs cursor-pointer hover:opacity-80"
            style={corAtual ? { borderColor: corAtual, color: corAtual } : undefined}
          >
            {labelAtual}
            <Pencil className="h-3 w-3 ml-1 opacity-60" />
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="text-xs font-medium text-muted-foreground">Sistema do processo</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Sobrescreve a sigla automática{fallbackSigla ? ` (atual: ${fallbackSigla})` : ''}.
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : lista.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-4 px-3">
              Nenhum sistema cadastrado. Crie o primeiro abaixo.
            </div>
          ) : (
            <div className="py-1">
              {lista.map((s) => (
                <div key={s.id} className="group flex items-center gap-2 px-2 py-1 hover:bg-muted/60">
                  {editandoId === s.id ? (
                    <>
                      <Input type="color" value={editCor} onChange={(e) => setEditCor(e.target.value)} className="w-9 p-1 h-7" />
                      <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="flex-1 h-7 text-xs" />
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={salvarEdicao}><Check className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditandoId(null)}><X className="h-3.5 w-3.5" /></Button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={cn(
                          'flex-1 flex items-center gap-2 text-left text-xs px-1 py-0.5 rounded',
                          sistemaTag === s.slug && 'font-semibold',
                        )}
                        onClick={() => aplicar(s.slug)}
                        disabled={salvando}
                      >
                        <span className="h-3 w-3 rounded shrink-0 border" style={{ background: s.cor || 'transparent' }} />
                        <span className="truncate">{s.nome}</span>
                        {sistemaTag === s.slug && <Check className="h-3 w-3 ml-auto text-primary" />}
                      </button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => iniciarEdicao(s)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => excluir(s)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {sistemaTag && (
          <div className="border-t px-2 py-1">
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => aplicar(null)} disabled={salvando}>
              <X className="h-3 w-3 mr-1" /> Remover do processo (usar sigla automática)
            </Button>
          </div>
        )}

        <div className="border-t p-2 flex items-end gap-1.5 bg-muted/30">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground">Novo sistema</label>
            <Input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex.: EPROC, PROJUDI"
              className="h-7 text-xs"
              onKeyDown={(e) => { if (e.key === 'Enter') criar(); }}
            />
          </div>
          <Input type="color" value={novaCor} onChange={(e) => setNovaCor(e.target.value)} className="w-9 p-1 h-7" />
          <Button size="icon" className="h-7 w-7" onClick={criar} disabled={criando || !novoNome.trim()}>
            {criando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}