import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Download, Trash2, FileText } from 'lucide-react';
import { useReuniaoClienteArquivos } from '@/hooks/useReuniaoClienteArquivos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClienteArquivosTabProps {
  clienteId: string;
}

export const ClienteArquivosTab = ({ clienteId }: ClienteArquivosTabProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { arquivos, loading, uploading, uploadArquivo, deleteArquivo, downloadArquivo } = 
    useReuniaoClienteArquivos(clienteId);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }

    await uploadArquivo(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (arquivoId: string) => {
    if (confirm('Deseja realmente excluir este arquivo?')) {
      await deleteArquivo(arquivoId);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <div className="flex justify-end">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Enviando...' : 'Enviar Arquivo'}
        </Button>
      </div>

      {/* Lista de arquivos */}
      <ScrollArea className="h-[400px]">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Carregando arquivos...
          </p>
        ) : arquivos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum arquivo anexado
          </p>
        ) : (
          <div className="space-y-2">
            {arquivos.map((arquivo) => (
              <div
                key={arquivo.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{arquivo.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(arquivo.file_size)} • {' '}
                      {format(new Date(arquivo.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => downloadArquivo(arquivo)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(arquivo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
