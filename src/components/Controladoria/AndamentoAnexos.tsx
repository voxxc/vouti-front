import { Paperclip, Download, Loader2, FileText, FileImage, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProcessoAnexo } from '@/hooks/useProcessoAnexos';

interface AndamentoAnexosProps {
  anexos: ProcessoAnexo[];
  numeroCnj: string;
  instancia: number;
  downloading: string | null;
  onDownload: (anexo: ProcessoAnexo, numeroCnj: string, instancia: number) => void;
}

const getFileIcon = (extension: string | null) => {
  if (!extension) return File;
  const ext = extension.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return FileImage;
  if (['pdf', 'doc', 'docx', 'txt', 'html'].includes(ext)) return FileText;
  return File;
};

export const AndamentoAnexos = ({ 
  anexos, 
  numeroCnj, 
  instancia, 
  downloading, 
  onDownload 
}: AndamentoAnexosProps) => {
  if (anexos.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-border/50">
      <div className="flex items-center gap-1.5 mb-2">
        <Paperclip className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">
          {anexos.length} documento(s)
        </span>
      </div>
      <div className="space-y-1.5">
        {anexos.map((anexo) => {
          const FileIcon = getFileIcon(anexo.extension);
          const isDownloading = downloading === anexo.id;
          
          return (
            <div 
              key={anexo.id}
              className="flex items-center gap-2 p-1.5 rounded bg-muted/50 hover:bg-muted transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <FileIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs truncate flex-1" title={anexo.attachment_name}>
                {anexo.attachment_name}
              </span>
              {anexo.extension && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                  {anexo.extension.toUpperCase()}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(anexo, numeroCnj, instancia);
                }}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};