import { FileText, Download, Lock, Loader2, FileQuestion, File } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProcessoAnexos, ProcessoAnexo } from '@/hooks/useProcessoAnexos';

interface DocumentosTabProps {
  processoOabId: string;
  numeroCnj: string;
  instancia?: number;
}

const getFileIcon = (extension: string | null) => {
  if (!extension) return FileQuestion;
  const ext = extension.toLowerCase();
  if (['pdf'].includes(ext)) return FileText;
  if (['doc', 'docx', 'odt'].includes(ext)) return File;
  return FileQuestion;
};

const getFileTypeBadge = (extension: string | null) => {
  if (!extension) return 'Arquivo';
  return extension.toUpperCase();
};

export const DocumentosTab = ({ processoOabId, numeroCnj, instancia = 1 }: DocumentosTabProps) => {
  const { anexos, loading, downloading, downloadAnexo } = useProcessoAnexos(processoOabId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (anexos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Nenhum documento encontrado</p>
        <p className="text-sm mt-1">
          Os documentos serao exibidos aqui quando disponiveis
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-400px)]">
      <div className="space-y-3 pr-4">
        <p className="text-sm text-muted-foreground mb-4">
          {anexos.length} documento(s) encontrado(s)
        </p>
        
        {anexos.map((anexo) => {
          const FileIcon = getFileIcon(anexo.extension);
          const isDownloading = downloading === anexo.id;
          
          return (
            <Card key={anexo.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <FileIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">
                      {anexo.attachment_name}
                    </p>
                    {anexo.is_private && (
                      <Badge variant="secondary" className="text-xs">
                        <Lock className="w-3 h-3 mr-1" />
                        Privado
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {getFileTypeBadge(anexo.extension)}
                    </Badge>
                    {anexo.status && anexo.status !== 'done' && (
                      <Badge variant="secondary" className="text-xs">
                        {anexo.status}
                      </Badge>
                    )}
                  </div>
                  
                  {anexo.content_description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {anexo.content_description}
                    </p>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadAnexo(anexo, numeroCnj, instancia)}
                  disabled={isDownloading || anexo.is_private}
                  title={anexo.is_private ? 'Documento privado' : 'Baixar documento'}
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
};
