import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, X, FileImage, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { MetalOP } from "@/types/metal";

interface MetalOPDetailsProps {
  selectedOP: MetalOP | null;
  onClose: () => void;
  onSave: () => void;
  isCreating: boolean;
}

export function MetalOPDetails({ selectedOP, onClose, onSave, isCreating }: MetalOPDetailsProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [formData, setFormData] = useState<Partial<MetalOP>>(
    selectedOP || {
      numero_op: "",
      produto: "",
      data_entrada: new Date().toISOString().split('T')[0],
      quantidade: 1,
      status: "aguardando",
    }
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${formData.numero_op || Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("op-fichas-tecnicas")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("op-fichas-tecnicas")
        .getPublicUrl(filePath);

      setFormData({ ...formData, ficha_tecnica_url: data.publicUrl });
      toast({ title: "Imagem enviada com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar imagem",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (!formData.numero_op || !formData.produto) {
        toast({ 
          title: "Campos obrigatórios", 
          description: "Preencha Número OP e Chapa",
          variant: "destructive" 
        });
        return;
      }

      if (isCreating) {
        const { error } = await supabase.from("metal_ops").insert([{
          numero_op: formData.numero_op,
          produto: formData.produto,
          cliente: formData.cliente || "",
          quantidade: formData.quantidade || 1,
          data_entrada: formData.data_entrada || new Date().toISOString().split('T')[0],
          ficha_tecnica_url: formData.ficha_tecnica_url,
          status: formData.status || 'aguardando',
          created_by: user.id,
        }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("metal_ops")
          .update({
            numero_op: formData.numero_op,
            produto: formData.produto,
            data_entrada: formData.data_entrada,
            ficha_tecnica_url: formData.ficha_tecnica_url,
          })
          .eq("id", selectedOP?.id);
        if (error) throw error;
      }

      toast({ title: isCreating ? "OP criada com sucesso!" : "OP atualizada com sucesso!" });
      onSave();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar OP",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setImageZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setImageZoom(1);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-3 md:p-4 border-b flex items-center justify-between">
        <h2 className="text-base md:text-lg font-semibold">
          {isCreating ? "Nova OP" : `OP ${selectedOP?.numero_op}`}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3 md:p-4">
        <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
          {/* Upload de Ficha Técnica */}
          <Card className="p-4">
            <Label className="mb-3 block text-sm md:text-base">Ficha Técnica da OP</Label>
            {formData.ficha_tecnica_url ? (
              <div className="relative w-full">
                <div 
                  className="relative w-full cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setImageViewerOpen(true)}
                >
                  <img
                    src={formData.ficha_tecnica_url}
                    alt="Ficha Técnica"
                    className="w-full h-auto object-contain rounded-lg border"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors rounded-lg">
                    <Maximize2 className="h-8 w-8 text-white opacity-0 hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormData({ ...formData, ficha_tecnica_url: null });
                  }}
                >
                  Remover
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Botão de Câmera para Mobile */}
                <label className="flex flex-col items-center justify-center h-40 md:h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors bg-accent/20">
                  <Camera className="h-10 w-10 md:h-12 md:w-12 mb-2 text-primary" />
                  <span className="text-sm md:text-base font-medium text-center px-4">
                    {uploading ? "Enviando..." : "Tirar Foto da Ficha"}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Use a câmera do celular
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>

                {/* Botão de Galeria/Arquivo */}
                <label className="flex flex-col items-center justify-center h-32 md:h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                  <FileImage className="h-8 w-8 md:h-10 md:w-10 mb-2 text-muted-foreground" />
                  <span className="text-sm md:text-base text-center px-4">
                    {uploading ? "Enviando..." : "Escolher da Galeria"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            )}
          </Card>

          {/* Formulário Simplificado */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="numero_op" className="text-sm md:text-base">
                Número da OP *
              </Label>
              <Input
                id="numero_op"
                value={formData.numero_op}
                onChange={(e) => setFormData({ ...formData, numero_op: e.target.value })}
                placeholder="Ex: 1938/25"
                className="text-base h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="produto" className="text-sm md:text-base">
                Chapa *
              </Label>
              <Input
                id="produto"
                value={formData.produto}
                onChange={(e) => setFormData({ ...formData, produto: e.target.value })}
                placeholder="Ex: Funil, Passa Pratos"
                className="text-base h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_entrada" className="text-sm md:text-base">
                Data de Entrada
              </Label>
              <Input
                id="data_entrada"
                type="date"
                value={formData.data_entrada}
                onChange={(e) => setFormData({ ...formData, data_entrada: e.target.value })}
                className="text-base h-12"
              />
            </div>
          </div>

          <Button onClick={handleSave} className="w-full h-12 text-base" size="lg">
            {isCreating ? "Criar OP" : "Salvar"}
          </Button>
        </div>
      </ScrollArea>

      {/* Image Viewer Modal with Zoom */}
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95">
          <div className="relative h-[95vh] flex flex-col">
            {/* Controls */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={handleZoomOut}
                className="h-10 w-10"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleResetZoom}
                className="h-10 w-10"
              >
                <span className="text-xs font-bold">{Math.round(imageZoom * 100)}%</span>
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleZoomIn}
                className="h-10 w-10"
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setImageViewerOpen(false)}
                className="h-10 w-10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Image Container with Zoom and Pan */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
              <img
                src={formData.ficha_tecnica_url || ''}
                alt="Ficha Técnica"
                className="max-w-none transition-transform duration-200"
                style={{
                  transform: `scale(${imageZoom})`,
                  cursor: imageZoom > 1 ? 'move' : 'default',
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
