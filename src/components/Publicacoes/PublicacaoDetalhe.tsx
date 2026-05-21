import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ExternalLink, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { htmlBytesToText, looksMojibake } from "@/lib/htmlAttachment";

interface PublicacaoDetalheProps {
  publicacao: {
    id: string;
    data_disponibilizacao: string | null;
    data_publicacao: string | null;
    tipo: string | null;
    numero_processo: string | null;
    diario_sigla: string | null;
    diario_nome: string | null;
    comarca: string | null;
    nome_pesquisado: string | null;
    conteudo_completo: string | null;
    link_acesso: string | null;
    status: string;
    orgao: string | null;
    responsavel: string | null;
    partes: string | null;
    origem?: string | null;
    storage_path?: string | null;
    metadata?: any;
  };
  onStatusChange: (status: string) => void;
}

export function PublicacaoDetalhe({ publicacao, onStatusChange }: PublicacaoDetalheProps) {
  const p = publicacao;
  const [openingDoc, setOpeningDoc] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cleanText, setCleanText] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  const ext = String(
    p.metadata?.extension || (p.storage_path ? p.storage_path.split('.').pop() : '') || ''
  ).toLowerCase();
  const isHtml = ext === 'html' || ext === 'htm';
  const isPdf = ext === 'pdf';
  const isMonit = p.origem === 'monitoramento_processo';

  useEffect(() => {
    setPreviewUrl(null);
    if (!p.storage_path || !isMonit || !isPdf) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.storage
        .from('processo-documentos')
        .createSignedUrl(p.storage_path!, 60 * 10);
      if (!cancelled && !error && data?.signedUrl) setPreviewUrl(data.signedUrl);
    })();
    return () => { cancelled = true; };
  }, [p.id, p.storage_path, isMonit, isPdf]);

  // Para anexos HTML: baixar do storage, decodificar charset e gerar texto limpo
  useEffect(() => {
    setCleanText(null);
    if (!isMonit || !isHtml || !p.storage_path) {
      // Se já temos texto razoável em conteudo_completo, usa direto
      if (p.conteudo_completo && !looksMojibake(p.conteudo_completo)) {
        setCleanText(p.conteudo_completo);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingText(true);
      try {
        const { data, error } = await supabase.storage
          .from('processo-documentos')
          .download(p.storage_path!);
        if (error || !data) throw error || new Error('Falha ao baixar anexo');
        const buf = new Uint8Array(await data.arrayBuffer());
        const text = htmlBytesToText(buf, (data as any).type);
        if (!cancelled) setCleanText(text.slice(0, 80000));
      } catch {
        if (!cancelled && p.conteudo_completo) setCleanText(p.conteudo_completo);
      } finally {
        if (!cancelled) setLoadingText(false);
      }
    })();
    return () => { cancelled = true; };
  }, [p.id, p.storage_path, isMonit, isHtml, p.conteudo_completo]);


  const abrirDocumento = async () => {
    if (!p.storage_path) return;
    setOpeningDoc(true);
    try {
      const { data, error } = await supabase.storage
        .from('processo-documentos')
        .createSignedUrl(p.storage_path, 60 * 10);
      if (error || !data?.signedUrl) throw error || new Error('URL inválida');
      window.open(data.signedUrl, '_blank');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao abrir documento');
    } finally {
      setOpeningDoc(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {isMonit && (
        <div className="space-y-3 -mt-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-primary/40 text-primary">
              {p.tipo || 'Publicação'} · Monitoramento
            </Badge>
            {p.storage_path && (
              <Button size="sm" variant="outline" className="h-7 gap-1.5 ml-auto" onClick={abrirDocumento} disabled={openingDoc}>
                {openingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                Abrir em nova aba
              </Button>
            )}
          </div>
          {isPdf && previewUrl && (
            <div className="border rounded-lg overflow-hidden bg-muted/30">
              <iframe
                src={previewUrl}
                title="Documento"
                className="w-full h-[60vh] bg-background"
              />
            </div>
          )}
          {isPdf && !previewUrl && p.storage_path && (
            <div className="border rounded-lg p-6 flex items-center justify-center text-xs text-muted-foreground gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Carregando documento…
            </div>
          )}
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4">
        <InfoItem label="Nº Processo" value={p.numero_processo} />
        <InfoItem label="Tipo" value={p.tipo} />
        <InfoItem label="Data Disponibilização" value={p.data_disponibilizacao ? new Date(p.data_disponibilizacao + 'T12:00:00').toLocaleDateString('pt-BR') : null} />
        <InfoItem label="Data Publicação" value={p.data_publicacao ? new Date(p.data_publicacao + 'T12:00:00').toLocaleDateString('pt-BR') : null} />
        <InfoItem label="Diário" value={p.diario_sigla} />
        <InfoItem label="Órgão" value={p.diario_nome || p.orgao} />
        <InfoItem label="Comarca" value={p.comarca} />
        <InfoItem label="Responsável" value={p.responsavel} />
        <InfoItem label="Nome pesquisado" value={p.nome_pesquisado} className="col-span-2" />
        <InfoItem label="Partes" value={p.partes} className="col-span-2" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t pt-4">
        {p.status === 'nao_tratada' && (
          <>
            <Button size="sm" className="gap-1.5" onClick={() => onStatusChange('tratada')}>
              <Check className="h-3.5 w-3.5" />Marcar como tratada
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onStatusChange('descartada')}>
              <X className="h-3.5 w-3.5" />Descartar
            </Button>
          </>
        )}
        {p.status === 'tratada' && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onStatusChange('nao_tratada')}>
            Reabrir
          </Button>
        )}
        {p.status === 'descartada' && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onStatusChange('nao_tratada')}>
            Reabrir
          </Button>
        )}
        {p.link_acesso && (
          <Button variant="ghost" size="sm" className="gap-1.5 ml-auto" onClick={() => window.open(p.link_acesso!, '_blank')}>
            <ExternalLink className="h-3.5 w-3.5" />Acessar publicação
          </Button>
        )}
      </div>

      {/* Content */}
      {(isMonit ? cleanText : p.conteudo_completo) && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            {isMonit && isHtml ? 'Resultado dos anexos' : 'Conteúdo da Publicação'}
            {loadingText && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </h4>
          <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
            {(isMonit ? cleanText : p.conteudo_completo) || ''}
          </div>
        </div>
      )}
      {isMonit && isHtml && !cleanText && loadingText && (
        <div className="border-t pt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Lendo anexo…
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, className }: { label: string; value: string | null; className?: string }) {
  if (!value) return null;
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
