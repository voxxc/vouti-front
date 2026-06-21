import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EyeOff, Loader2, Paperclip, Plus, Settings2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { GerenciarTribunaisDialog, TribunalTag } from './GerenciarTribunaisDialog';

interface ProcessoLite {
  id: string;
  numero_cnj: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processo: ProcessoLite;
  tenantNome: string;
  onSuccess: () => void;
}

const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
const MAX_BYTES = 25 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface AbaMovimento {
  id: string;
  data: string;
  tipo: string;
  descricao: string;
  marcarNaoLido: boolean;
  marcarComoAtualizado: boolean;
  arquivo: File | null;
  sigiloso: boolean;
  tribunalTag: string | null;
}

function novaAba(hoje: string): AbaMovimento {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random()),
    data: hoje,
    tipo: '',
    descricao: '',
    marcarNaoLido: true,
    marcarComoAtualizado: false,
    arquivo: null,
    sigiloso: false,
    tribunalTag: null,
  };
}

export function AdicionarMovimentoManualDialog({
  open,
  onOpenChange,
  processo,
  tenantNome,
  onSuccess,
}: Props) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [abas, setAbas] = useState<AbaMovimento[]>([novaAba(hoje)]);
  const [ativaId, setAtivaId] = useState<string>(() => '');
  const [salvando, setSalvando] = useState(false);
  const salvandoRef = useRef(false);
  const [tribunais, setTribunais] = useState<TribunalTag[]>([]);
  const [gerenciarOpen, setGerenciarOpen] = useState(false);

  const carregarTribunais = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('super-admin-listar-tribunais-andamento', { body: {} });
      if (error) throw error;
      setTribunais(((data as any)?.tribunais || []) as TribunalTag[]);
    } catch (e) {
      console.warn('falha ao listar tribunais', e);
    }
  };

  useEffect(() => {
    if (open) carregarTribunais();
  }, [open]);

  // inicializa quando abre
  useEffect(() => {
    if (open) {
      const inicial = novaAba(hoje);
      setAbas([inicial]);
      setAtivaId(inicial.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ativa = abas.find((a) => a.id === ativaId) ?? abas[0];

  const updateAtiva = (patch: Partial<AbaMovimento>) => {
    setAbas((prev) => prev.map((a) => (a.id === ativa.id ? { ...a, ...patch } : a)));
  };

  const handleArquivo = (f: File | null) => {
    if (!f) {
      updateAtiva({ arquivo: null });
      return;
    }
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      toast.error('Formato não permitido. Use PDF, DOC, DOCX, JPG ou PNG.');
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error('Arquivo maior que 25 MB.');
      return;
    }
    updateAtiva({ arquivo: f });
  };

  const adicionarAba = () => {
    const aba = novaAba(hoje);
    setAbas((prev) => [aba, ...prev]); // nova aba no topo
    setAtivaId(aba.id);
  };

  const removerAba = (id: string) => {
    if (abas.length <= 1) {
      toast.info('Pelo menos uma aba precisa existir.');
      return;
    }
    const alvo = abas.find((a) => a.id === id);
    if (!alvo) return;
    const temConteudo = alvo.tipo.trim() || alvo.descricao.trim() || alvo.arquivo;
    if (temConteudo && !confirm('Esta aba tem conteúdo preenchido. Remover mesmo assim?')) return;
    setAbas((prev) => {
      const restante = prev.filter((a) => a.id !== id);
      if (id === ativaId) setAtivaId(restante[0]?.id ?? '');
      return restante;
    });
  };

  const labelAba = (a: AbaMovimento, idx: number) =>
    a.tipo.trim() ? a.tipo.trim().slice(0, 24) : `Movimento ${abas.length - idx}`;

  const handleSalvar = async () => {
    if (salvandoRef.current) return;

    // valida todas as abas
    for (let i = 0; i < abas.length; i++) {
      const a = abas[i];
      if (!a.tipo.trim()) {
        setAtivaId(a.id);
        toast.error(`Informe o nome do movimento na aba "${labelAba(a, i)}".`);
        return;
      }
      if (a.descricao.trim().length < 10) {
        setAtivaId(a.id);
        toast.error(`A descrição precisa de ao menos 10 caracteres na aba "${labelAba(a, i)}".`);
        return;
      }
    }

    salvandoRef.current = true;
    setSalvando(true);
    // ordem: da última (mais antiga) para a primeira (mais nova)
    const ordem = [...abas].reverse();
    const idsSalvos: string[] = [];
    try {
      for (const a of ordem) {
        const payload: any = {
          processo_oab_id: processo.id,
          data_movimentacao: a.data,
          tipo_movimentacao: a.tipo.trim(),
          descricao: a.descricao.trim(),
          marcar_nao_lido: a.marcarNaoLido,
          marcar_como_atualizado: a.marcarComoAtualizado,
          sigiloso: a.sigiloso,
          tribunal_tag: a.tribunalTag || null,
        };
        if (a.arquivo) {
          const base64 = await fileToBase64(a.arquivo);
          payload.anexo = {
            nome: a.arquivo.name,
            content_type: a.arquivo.type || 'application/octet-stream',
            base64,
          };
        }
        const { data: resp, error } = await supabase.functions.invoke(
          'super-admin-criar-andamento-manual',
          { body: payload },
        );
        if (error) throw error;
        if (resp?.error) throw new Error(resp.error);
        idsSalvos.push(a.id);
      }
      toast.success(
        ordem.length === 1
          ? 'Movimento manual lançado com sucesso.'
          : `${ordem.length} movimentos lançados com sucesso.`,
      );
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      // remove apenas as abas já salvas com sucesso
      if (idsSalvos.length) {
        setAbas((prev) => {
          const restante = prev.filter((a) => !idsSalvos.includes(a.id));
          if (!restante.find((a) => a.id === ativaId)) {
            setAtivaId(restante[0]?.id ?? '');
          }
          return restante.length ? restante : [novaAba(hoje)];
        });
        onSuccess();
      }
      toast.error(e?.message || 'Erro ao lançar movimento.');
    } finally {
      setSalvando(false);
      salvandoRef.current = false;
    }
  };

  if (!ativa) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar movimento manual</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{processo.numero_cnj}</span> — {tenantNome}
          </DialogDescription>
        </DialogHeader>

        {/* Faixa de abas */}
        <div className="flex items-center gap-1 overflow-x-auto border-b pb-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 h-8"
            onClick={adicionarAba}
            disabled={salvando}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nova aba
          </Button>
          {abas.map((a, idx) => (
            <div
              key={a.id}
              className={cn(
                'group shrink-0 inline-flex items-center gap-1 h-8 px-2 rounded-md border text-xs cursor-pointer select-none',
                a.id === ativaId
                  ? 'bg-primary/10 border-primary text-foreground'
                  : 'bg-background hover:bg-muted border-border text-muted-foreground',
              )}
              onClick={() => setAtivaId(a.id)}
            >
              <span className="truncate max-w-[140px]">{labelAba(a, idx)}</span>
              {abas.length > 1 && (
                <button
                  type="button"
                  className="opacity-60 group-hover:opacity-100 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    removerAba(a.id);
                  }}
                  title="Remover aba"
                  disabled={salvando}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="mov-data">Data da movimentação</Label>
            <Input
              id="mov-data"
              type="date"
              value={ativa.data}
              onChange={(e) => updateAtiva({ data: e.target.value })}
              max={hoje}
            />
          </div>

          <div>
            <Label htmlFor="mov-tipo">Nome do movimento</Label>
            <Input
              id="mov-tipo"
              value={ativa.tipo}
              onChange={(e) => updateAtiva({ tipo: e.target.value })}
              placeholder="Ex.: Intimação, Decisão, Sentença, Audiência…"
              maxLength={120}
            />
          </div>

          <div>
            <Label htmlFor="mov-descricao">Detalhe / descrição</Label>
            <Textarea
              id="mov-descricao"
              value={ativa.descricao}
              onChange={(e) => updateAtiva({ descricao: e.target.value })}
              rows={5}
              placeholder="Descreva o conteúdo do movimento (mínimo 10 caracteres)…"
              maxLength={8000}
            />
          </div>

          <div>
            <Label htmlFor="mov-arquivo" className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Documento (opcional)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="mov-arquivo"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => handleArquivo(e.target.files?.[0] ?? null)}
              />
              {ativa.arquivo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => updateAtiva({ arquivo: null })}
                  title="Remover arquivo"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, DOC, DOCX, JPG ou PNG — até 25 MB.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="mov-tribunal" className="text-sm">Tribunal</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setGerenciarOpen(true)}
              >
                <Settings2 className="h-3.5 w-3.5 mr-1" /> Gerenciar
              </Button>
            </div>
            <select
              id="mov-tribunal"
              value={ativa.tribunalTag ?? ''}
              onChange={(e) => updateAtiva({ tribunalTag: e.target.value || null })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Sem tribunal</option>
              {tribunais.map((t) => (
                <option key={t.id} value={t.slug}>{t.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="mov-sigiloso"
              checked={ativa.sigiloso}
              onCheckedChange={(v) => updateAtiva({ sigiloso: v === true })}
            />
            <Label htmlFor="mov-sigiloso" className="text-sm font-normal cursor-pointer flex items-center gap-1">
              <EyeOff className="h-3.5 w-3.5" /> Sigiloso
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="mov-naolido"
              checked={ativa.marcarNaoLido}
              onCheckedChange={(v) => updateAtiva({ marcarNaoLido: v === true })}
            />
            <Label htmlFor="mov-naolido" className="text-sm font-normal cursor-pointer">
              Marcar como não lido para os usuários do tenant
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="mov-atualizado"
              checked={ativa.marcarComoAtualizado}
              onCheckedChange={(v) => updateAtiva({ marcarComoAtualizado: v === true })}
            />
            <Label htmlFor="mov-atualizado" className="text-sm font-normal cursor-pointer">
              Marcar processo como atualizado (move para a aba Atualizado por 7 dias)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {abas.length === 1 ? 'Salvar movimento' : `Salvar ${abas.length} movimentos`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <GerenciarTribunaisDialog
      open={gerenciarOpen}
      onOpenChange={setGerenciarOpen}
      onChanged={carregarTribunais}
    />
    </>
  );
}