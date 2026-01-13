import { useState, useRef } from 'react';
import { Upload, Trash2, Users, ImageIcon, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSuperAdminAvisos, Aviso } from '@/hooks/useSuperAdminAvisos';
import { toast } from '@/hooks/use-toast';

interface SuperAdminAvisosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemTypeId: string;
  systemTypeName: string;
}

export function SuperAdminAvisosDialog({
  open,
  onOpenChange,
  systemTypeId,
  systemTypeName
}: SuperAdminAvisosDialogProps) {
  const { avisos, isLoading, createAviso, toggleAvisoStatus, deleteAviso, uploadImage } = useSuperAdminAvisos(systemTypeId);
  
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titulo.trim()) {
      toast({ title: 'Digite um título', variant: 'destructive' });
      return;
    }

    if (!imageFile) {
      toast({ title: 'Selecione uma imagem', variant: 'destructive' });
      return;
    }

    setIsUploading(true);

    try {
      const imageUrl = await uploadImage(imageFile);
      
      await createAviso.mutateAsync({
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        imagem_url: imageUrl,
        system_type_id: systemTypeId
      });

      // Reset form
      setTitulo('');
      setDescricao('');
      setImageFile(null);
      setImagePreview(null);
    } catch (error) {
      console.error('Error creating aviso:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (aviso: Aviso) => {
    await deleteAviso.mutateAsync(aviso.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Avisos - {systemTypeName}
          </DialogTitle>
          <DialogDescription>
            Gerencie os avisos/comunicados que aparecerão para os administradores ao logar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 flex-1 overflow-hidden">
          {/* Formulário de Novo Aviso */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Novo Aviso
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  placeholder="Ex: Comunicado Importante"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição (opcional)</Label>
                <Textarea
                  id="descricao"
                  placeholder="Texto adicional do comunicado..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  disabled={isUploading}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Imagem *</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
                
                {imagePreview ? (
                  <div className="relative group">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Trocar
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Clique para selecionar
                    </span>
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isUploading || createAviso.isPending}
              >
                {isUploading || createAviso.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  'Criar Aviso'
                )}
              </Button>
            </form>
          </div>

          {/* Lista de Avisos */}
          <div className="flex flex-col overflow-hidden">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
              Avisos Cadastrados
            </h3>
            
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : avisos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum aviso cadastrado.
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {avisos.map((aviso) => (
                    <Card key={aviso.id} className={!aviso.ativo ? 'opacity-50' : ''}>
                      <CardContent className="p-3">
                        <div className="flex gap-3">
                          <img
                            src={aviso.imagem_url}
                            alt={aviso.titulo}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{aviso.titulo}</h4>
                            {aviso.descricao && (
                              <p className="text-xs text-muted-foreground truncate">
                                {aviso.descricao}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {aviso.total_ciencias} ciência(s)
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Switch
                              checked={aviso.ativo}
                              onCheckedChange={(checked) => 
                                toggleAvisoStatus.mutate({ id: aviso.id, ativo: checked })
                              }
                            />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Aviso?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. O aviso "{aviso.titulo}" será permanentemente excluído.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(aviso)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
