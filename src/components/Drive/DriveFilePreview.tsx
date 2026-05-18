import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { DriveFile } from "@/hooks/useGoogleDrive";

interface Props {
  file: DriveFile | null;
  onClose: () => void;
  previewFile: (file: DriveFile) => Promise<{ url: string; contentType: string }>;
  download: (file: DriveFile) => Promise<void>;
}

type Kind = "pdf" | "image" | "video" | "audio" | "text" | "unsupported";

function detectKind(mime: string): Kind {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml"
  ) return "text";
  return "unsupported";
}

export const DriveFilePreview = ({ file, onClose, previewFile, download }: Props) => {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>("");
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      setTextContent(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setTextContent(null);
    previewFile(file)
      .then(async ({ url, contentType }) => {
        if (cancelled) return;
        setUrl(url);
        setContentType(contentType);
        const kind = detectKind(contentType || file.mimeType);
        if (kind === "text") {
          try {
            const r = await fetch(url);
            const t = await r.text();
            if (!cancelled) setTextContent(t);
          } catch {
            // ignore
          }
        }
      })
      .catch((e) => {
        if (!cancelled) toast.error(`Erro ao abrir: ${(e as Error).message}`);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [file, previewFile]);

  if (!file) return null;
  const kind = detectKind(contentType || file.mimeType);

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 flex flex-col gap-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {contentType || file.mimeType}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              download(file).catch((e) =>
                toast.error(`Erro: ${(e as Error).message}`)
              )
            }
          >
            <Download className="h-4 w-4" />
            Baixar
          </Button>
          {file.webViewLink && (
            <Button asChild size="sm" variant="ghost">
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir no Google
              </a>
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden bg-muted/30">
          {loading || !url ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : kind === "pdf" ? (
            <iframe src={url} className="w-full h-full" title={file.name} />
          ) : kind === "image" ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
              <img src={url} alt={file.name} className="max-w-full max-h-full object-contain" />
            </div>
          ) : kind === "video" ? (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <video src={url} controls className="max-w-full max-h-full" />
            </div>
          ) : kind === "audio" ? (
            <div className="w-full h-full flex items-center justify-center p-6">
              <audio src={url} controls className="w-full max-w-xl" />
            </div>
          ) : kind === "text" ? (
            <pre className="w-full h-full overflow-auto text-xs p-4 whitespace-pre-wrap font-mono">
              {textContent ?? ""}
            </pre>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center p-6">
              <p className="text-sm text-muted-foreground max-w-md">
                Pré-visualização não disponível para este tipo de arquivo
                ({contentType || file.mimeType}). Use o botão Baixar para
                acessá-lo localmente.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
