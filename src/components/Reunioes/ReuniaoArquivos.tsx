import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReuniaoArquivos } from '@/hooks/useReuniaoArquivos';
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  File,
  X 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReuniaoArquivosProps {
  reuniaoId: string;
}

export const ReuniaoArquivos = ({ reuniaoId }: ReuniaoArquivosProps) => {
  const {
    arquivos,
    loading,
    uploading,
    uploadArquivo,
    deleteArquivo,
    downloadArquivo,
    getPreviewUrl
  } = useReuniaoArquivos(reuniaoId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      await uploadArquivo(file);
    }

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (arquivoId: string) => {
    if (confirm('Deseja realmente excluir este arquivo?')) {
      await deleteArquivo(arquivoId);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <File className="h-4 w-4" />;
    if (fileType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (fileType.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Arquivos Anexados</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Enviando...' : 'Anexar Arquivo'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        />
      </div>

      <ScrollArea className="h-64">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Carregando arquivos...
          </p>
        ) : arquivos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum arquivo anexado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
            {arquivos.map((arquivo) => {
              const previewUrl = getPreviewUrl(arquivo);
              const isImage = arquivo.file_type?.startsWith('image/');

              return (
                <div
                  key={arquivo.id}
                  className="border border-border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors"
                >
                  {/* Preview de imagem */}
                  {isImage && previewUrl && (
                    <div
                      className="relative w-full h-32 rounded-md overflow-hidden bg-muted cursor-pointer"
                      onClick={() => setPreviewImage(previewUrl)}
                    >
                      <img
                        src={previewUrl}
                        alt={arquivo.file_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Informações do arquivo */}
                  <div className="flex items-start gap-2">
                    {!isImage && (
                      <div className="p-2 rounded bg-muted">
                        {getFileIcon(arquivo.file_type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {arquivo.file_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(arquivo.file_size)}</span>
                        <span>•</span>
                        <span>
                          {format(new Date(arquivo.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadArquivo(arquivo)}
                      className="flex-1"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Baixar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(arquivo.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Modal de preview de imagem */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <Button
              variant="outline"
              size="icon"
              className="absolute -top-12 right-0"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};
