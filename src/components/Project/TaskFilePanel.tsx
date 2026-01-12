import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Paperclip, 
  Upload, 
  FileText, 
  Image, 
  File, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  ExternalLink,
  Loader2
} from "lucide-react";
import { TaskFile } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TaskFilePanelProps {
  files: TaskFile[];
  onUploadFile: (file: File) => void;
  onDeleteFile: (fileId: string) => void;
}

const TaskFilePanel = ({ files, onUploadFile, onDeleteFile }: TaskFilePanelProps) => {
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [previewFile, setPreviewFile] = useState<TaskFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB",
          variant: "destructive",
        });
        return;
      }
      onUploadFile(file);
      event.target.value = ''; // Reset input
    }
  };

  const handleDownload = async (file: TaskFile) => {
    setDownloading(file.id);
    try {
      // Buscar file_path do banco
      const { data: fileData } = await supabase
        .from('task_files' as any)
        .select('file_path')
        .eq('id', file.id)
        .single();
      
      if (!fileData) throw new Error('Arquivo não encontrado');

      const filePath = (fileData as any).file_path;

      // Criar signed URL (válido por 1 hora)
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;

      // Baixar arquivo
      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      
      // Criar link de download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast({ title: "Download concluído", description: file.name });
    } catch (error) {
      console.error('Erro no download:', error);
      toast({ 
        title: "Erro no download", 
        description: "Não foi possível baixar o arquivo",
        variant: "destructive" 
      });
    } finally {
      setDownloading(null);
    }
  };

  const handlePreview = async (file: TaskFile) => {
    try {
      // Buscar file_path do banco
      const { data: fileData } = await supabase
        .from('task_files' as any)
        .select('file_path')
        .eq('id', file.id)
        .single();
      
      if (!fileData) throw new Error('Arquivo não encontrado');

      const filePath = (fileData as any).file_path;

      // Criar signed URL para preview
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;

      // Para PDFs, abrir em nova aba
      if (file.type.includes('pdf')) {
        window.open(data.signedUrl, '_blank');
        return;
      }

      // Para imagens, mostrar no modal
      if (file.type.startsWith('image/')) {
        setPreviewFile(file);
        setPreviewUrl(data.signedUrl);
      } else {
        // Outros tipos, abrir em nova aba
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Erro ao visualizar:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível visualizar o arquivo",
        variant: "destructive" 
      });
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const nextFile = () => {
    setCurrentFileIndex((prev) => (prev + 1) % files.length);
  };

  const prevFile = () => {
    setCurrentFileIndex((prev) => (prev - 1 + files.length) % files.length);
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Paperclip className="h-4 w-4" />
            Arquivos
            {files.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {files.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        
        <SheetContent side="right" className="w-[400px]">
          <SheetHeader>
            <SheetTitle>Arquivos da Tarefa</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 mt-6">
            {/* Upload Area */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Adicionar Arquivo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center relative">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Clique para selecionar arquivo
                  </p>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Máximo 10MB
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Files List */}
            {files.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      Arquivos ({files.length})
                    </CardTitle>
                    {files.length > 1 && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={prevFile}
                          className="h-6 w-6"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground px-2">
                          {currentFileIndex + 1} de {files.length}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={nextFile}
                          className="h-6 w-6"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {files.length > 0 && (
                    <div className="space-y-3">
                      {files.slice(currentFileIndex, currentFileIndex + 1).map((file) => (
                        <div key={file.id} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              {getFileIcon(file.type)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {file.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(file.size)} • Por {file.uploadedBy}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(file.uploadedAt).toLocaleString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Botão Visualizar */}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => handlePreview(file)}
                                title="Visualizar"
                              >
                                {file.type.startsWith('image/') ? (
                                  <Eye className="h-3 w-3" />
                                ) : (
                                  <ExternalLink className="h-3 w-3" />
                                )}
                              </Button>

                              {/* Botão Download */}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => handleDownload(file)}
                                disabled={downloading === file.id}
                                title="Download"
                              >
                                {downloading === file.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Download className="h-3 w-3" />
                                )}
                              </Button>

                              {/* Botão Excluir */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir o arquivo "{file.name}"?
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => onDeleteFile(file.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {files.length === 0 && (
              <div className="text-center py-8">
                <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Nenhum arquivo anexado
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal de Preview para Imagens */}
      <Dialog open={!!previewFile} onOpenChange={() => { setPreviewFile(null); setPreviewUrl(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-auto max-h-[60vh]">
            {previewUrl && previewFile?.type.startsWith('image/') && (
              <img 
                src={previewUrl} 
                alt={previewFile.name}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => previewFile && handleDownload(previewFile)}
              disabled={downloading === previewFile?.id}
            >
              {downloading === previewFile?.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Baixar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskFilePanel;
