import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Paperclip, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export function AdicionarMovimentoManualDialog({
  open,
  onOpenChange,
  processo,
  tenantNome,
  onSuccess,
}: Props) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(hoje);
  const [tipo, setTipo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [marcarNaoLido, setMarcarNaoLido] = useState(true);
  const [marcarComoAtualizado, setMarcarComoAtualizado] = useState(true);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);

  const reset = () => {
    setData(hoje);
    setTipo('');
    setDescricao('');
    setMarcarNaoLido(true);
    setMarcarComoAtualizado(true);
    setArquivo(null);
  };

  const handleArquivo = (f: File | null) => {
    if (!f) {
      setArquivo(null);
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
    setArquivo(f);
  };

  const handleSalvar = async () => {
    if (!tipo.trim() || tipo.trim().length < 1) {
      toast.error('Informe o nome do movimento.');
      return;
    }
    if (descricao.trim().length < 10) {
      toast.error('A descrição precisa de ao menos 10 caracteres.');
      return;
    }
    setSalvando(true);
    try {
      const payload: any = {
        processo_oab_id: processo.id,
        data_movimentacao: data,
        tipo_movimentacao: tipo.trim(),
        descricao: descricao.trim(),
        marcar_nao_lido: marcarNaoLido,
        marcar_como_atualizado: marcarComoAtualizado,
      };
      if (arquivo) {
        const base64 = await fileToBase64(arquivo);
        payload.anexo = {
          nome: arquivo.name,
          content_type: arquivo.type || 'application/octet-stream',
          base64,
        };
      }
      const { data: resp, error } = await supabase.functions.invoke(
        'super-admin-criar-andamento-manual',
        { body: payload },
      );
      if (error) throw error;
      if (resp?.error) throw new Error(resp.error);
      toast.success('Movimento manual lançado com sucesso.');
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao lançar movimento.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar movimento manual</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{processo.numero_cnj}</span> — {tenantNome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="mov-data">Data da movimentação</Label>
            <Input
              id="mov-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              max={hoje}
            />
          </div>

          <div>
            <Label htmlFor="mov-tipo">Nome do movimento</Label>
            <Input
              id="mov-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              placeholder="Ex.: Intimação, Decisão, Sentença, Audiência…"
              maxLength={120}
            />
          </div>

          <div>
            <Label htmlFor="mov-descricao">Detalhe / descrição</Label>
            <Textarea
              id="mov-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
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
              {arquivo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setArquivo(null)}
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

          <div className="flex items-center gap-2">
            <Checkbox
              id="mov-naolido"
              checked={marcarNaoLido}
              onCheckedChange={(v) => setMarcarNaoLido(v === true)}
            />
            <Label htmlFor="mov-naolido" className="text-sm font-normal cursor-pointer">
              Marcar como não lido para os usuários do tenant
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="mov-atualizado"
              checked={marcarComoAtualizado}
              onCheckedChange={(v) => setMarcarComoAtualizado(v === true)}
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
            Salvar movimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}