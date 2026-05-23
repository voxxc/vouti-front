import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Paperclip, Loader2, FileText, FileImage, File, Eye, Download, X, CheckCircle2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProcessoAnexo } from '@/hooks/useProcessoAnexos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { htmlBytesToText } from '@/lib/htmlAttachment';

export interface MovimentacaoSelecionada {
  id: string;
  descricao: string | null;
  data_movimentacao: string | null;
  tipo_movimentacao?: string | null;
  lida: boolean;
  origem: 'andamento' | 'intimacao';
}

interface MovimentacaoDetalheProps {
  movimentacao: MovimentacaoSelecionada;
  anexos: ProcessoAnexo[];
  processoOabId: string;
  numeroCnj: string;
  instancia: number;
  onClose: () => void;
  onMarcarLida?: (id: string) => void;
}

const getFileIcon = (extension: string | null) => {
  if (!extension) return File;
  const ext = extension.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return FileImage;
  if (['pdf', 'doc', 'docx', 'txt', 'html', 'htm'].includes(ext)) return FileText;
  return File;
};

const cleanAttachmentName = (name: string | null | undefined) => {
  if (!name) return '';
  return name
    .replace(/\s*[-–]\s*(SEM|COM)\s+SIGILO/gi, '')
    .replace(/\s*\(?\s*N[ÍI]VEL\s*\d+\s*\)?/gi, '')
    .replace(/\s*[-–]\s*\d+(?:[.,]\d+)?\s*(KB|MB|GB|BYTES?|B)\b/gi, '')
    .replace(/\s*[-–]\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

interface PreviewState {
  anexoId: string;
  url?: string;
  blobUrl?: string;
  text?: string;
  mimeType?: string;
  ext?: string;
}

export const MovimentacaoDetalhe = ({
  movimentacao,
  anexos,
  processoOabId,
  numeroCnj,
  instancia,
  onClose,
  onMarcarLida,
}: MovimentacaoDetalheProps) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const formatData = (data: string | null) => {
    if (!data) return 'Data não informada';
    try {
      return format(new Date(data), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return data;
    }
  };

  const fecharPreview = () => {
    if (preview?.blobUrl) URL.revokeObjectURL(preview.blobUrl);
    setPreview(null);
  };

  const visualizarAnexo = async (anexo: ProcessoAnexo) => {
    // Toggle: se já está aberto, fecha.
    if (preview?.anexoId === anexo.id) {
      fecharPreview();
      return;
    }
    if (anexo.status === 'pending') {
      toast({ title: 'Anexo em processamento', description: 'Tente novamente em instantes.', variant: 'destructive' });
      return;
    }
    if (anexo.attachment_name?.includes('Restrição na Visualização') || anexo.is_private) {
      toast({ title: 'Anexo restrito', description: 'Documento sigiloso, não disponível.', variant: 'destructive' });
      return;
    }

    setLoadingId(anexo.id);
    try {
      // Fallback: anexos simulados / reaproveitados de publicações já estão no storage.
      // Tenta resolver via tabela publicacoes (storage_path) antes de chamar a edge function.
      try {
        const { data: pub } = await supabase
          .from('publicacoes')
          .select('storage_path')
          .eq('metadata->>attachment_id', anexo.attachment_id)
          .not('storage_path', 'is', null)
          .limit(1)
          .maybeSingle();
        if (pub?.storage_path) {
          const ext = (anexo.extension || anexo.attachment_name?.split('.').pop() || '').toLowerCase();
          const isHtml = ext === 'html' || ext === 'htm';
          if (preview?.blobUrl) URL.revokeObjectURL(preview.blobUrl);
          if (isHtml) {
            const { data: file } = await supabase.storage
              .from('processo-documentos')
              .download(pub.storage_path);
            if (file) {
              const buf = new Uint8Array(await file.arrayBuffer());
              const text = htmlBytesToText(buf, (file as any).type || '');
              setPreview({ anexoId: anexo.id, text: text.slice(0, 80000), ext });
              setLoadingId(null);
              return;
            }
          }
          const { data: signed } = await supabase.storage
            .from('processo-documentos')
            .createSignedUrl(pub.storage_path, 60 * 10);
          if (signed?.signedUrl) {
            setPreview({ anexoId: anexo.id, url: signed.signedUrl, ext });
            setLoadingId(null);
            return;
          }
        }
      } catch { /* segue para edge function */ }

      const { data, error } = await supabase.functions.invoke('judit-baixar-anexo', {
        body: {
          processoOabId,
          attachmentId: anexo.attachment_id,
          numeroCnj,
          instancia,
          fileName: anexo.attachment_name,
          stepId: anexo.step_id,
          status: anexo.status,
        },
      });
      if (error) throw error;
      if (!data?.success && data?.errorType) {
        toast({ title: 'Não foi possível abrir', description: data.error || 'Erro ao baixar anexo', variant: 'destructive' });
        return;
      }

      const ext = (anexo.extension || anexo.attachment_name?.split('.').pop() || '').toLowerCase();
      const isHtml = ext === 'html' || ext === 'htm';

      // Limpa preview anterior
      if (preview?.blobUrl) URL.revokeObjectURL(preview.blobUrl);

      if (data?.url) {
        // URL direta (PDF/imagem)
        if (isHtml) {
          // baixa e decodifica
          try {
            const resp = await fetch(data.url);
            const buf = new Uint8Array(await resp.arrayBuffer());
            const text = htmlBytesToText(buf, resp.headers.get('content-type') || '');
            setPreview({ anexoId: anexo.id, text: text.slice(0, 80000), ext });
          } catch {
            setPreview({ anexoId: anexo.id, url: data.url, ext });
          }
        } else {
          setPreview({ anexoId: anexo.id, url: data.url, ext });
        }
      } else if (data?.content) {
        const byteCharacters = atob(data.content);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
        const mimeType = data.mimeType || 'application/octet-stream';
        if (isHtml) {
          const text = htmlBytesToText(byteNumbers, mimeType);
          setPreview({ anexoId: anexo.id, text: text.slice(0, 80000), ext, mimeType });
        } else {
          const blob = new Blob([byteNumbers], { type: mimeType });
          const blobUrl = URL.createObjectURL(blob);
          setPreview({ anexoId: anexo.id, blobUrl, ext, mimeType });
        }
      }
    } catch (e: any) {
      toast({ title: 'Erro ao abrir', description: e?.message || 'Falha ao carregar anexo', variant: 'destructive' });
    } finally {
      setLoadingId(null);
    }
  };

  const downloadAtual = () => {
    const src = preview?.url || preview?.blobUrl;
    if (src) window.open(src, '_blank');
  };

  const previewSrc = preview?.url || preview?.blobUrl;
  const isPdf = preview?.ext === 'pdf';
  const isImage = preview?.ext && ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(preview.ext);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4 border-b">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="text-xs border-primary/40 text-primary">
              {movimentacao.origem === 'intimacao' ? 'Intimação' : 'Andamento'}
            </Badge>
            {movimentacao.tipo_movimentacao && (
              <Badge variant="secondary" className="text-xs">{movimentacao.tipo_movimentacao}</Badge>
            )}
            {anexos.length > 0 && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Paperclip className="w-3 h-3" /> {anexos.length}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{formatData(movimentacao.data_movimentacao)}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Descrição */}
          {movimentacao.descricao && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Descrição</h4>
              <div className="bg-muted/40 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap">
                {movimentacao.descricao}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center gap-2">
            {!movimentacao.lida && onMarcarLida && (
              <Button size="sm" className="gap-1.5" onClick={() => onMarcarLida(movimentacao.id)}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como lida
              </Button>
            )}
            {movimentacao.lida && (
              <Badge variant="outline" className="text-xs gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" /> Lida
              </Badge>
            )}
          </div>

          {/* Documentos */}
          {anexos.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Paperclip className="w-3 h-3" /> Documentos
              </h4>
              <div className="space-y-1.5">
                {anexos.map((anexo) => {
                  const FileIcon = getFileIcon(anexo.extension);
                  const isLoading = loadingId === anexo.id;
                  const isActive = preview?.anexoId === anexo.id;
                  const displayName = cleanAttachmentName(anexo.attachment_name) || 'Documento';
                  return (
                    <button
                      type="button"
                      key={anexo.id}
                      onClick={() => visualizarAnexo(anexo)}
                      disabled={isLoading}
                      aria-expanded={isActive}
                      className={`w-full flex items-center gap-2 p-2 rounded border transition-colors text-left ${
                        isActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30 hover:bg-muted/60'
                      } ${isLoading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
                    >
                      <FileIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xs truncate flex-1" title={displayName}>
                        {displayName}
                      </span>
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />
                      ) : isActive ? (
                        <ChevronDown className="w-3.5 h-3.5 text-primary shrink-0" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preview do anexo */}
          {preview && (
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground">Resultado do anexo</h4>
                {previewSrc && (
                  <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={downloadAtual}>
                    <Download className="h-3 w-3" /> Baixar
                  </Button>
                )}
              </div>
              {isPdf && previewSrc && (
                <div className="border rounded-lg overflow-hidden bg-muted/30">
                  <iframe src={previewSrc} title="Documento" className="w-full h-[60vh] bg-background" />
                </div>
              )}
              {isImage && previewSrc && (
                <div className="border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center">
                  <img src={previewSrc} alt="Anexo" className="max-h-[60vh] w-auto" />
                </div>
              )}
              {preview.text && (
                <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                  {preview.text}
                </div>
              )}
              {!previewSrc && !preview.text && (
                <p className="text-xs text-muted-foreground">Anexo sem visualização disponível.</p>
              )}
            </div>
          )}

          {anexos.length === 0 && (
            <div className="border-t pt-4 text-xs text-muted-foreground">
              Esta movimentação não possui documentos anexados.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};