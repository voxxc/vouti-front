import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Save, X, FileImage } from "lucide-react";
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
  const [formData, setFormData] = useState<Partial<MetalOP>>(
    selectedOP || {
      numero_op: "",
      produto: "",
      cliente: "",
      quantidade: 1,
      data_entrada: new Date().toISOString().split('T')[0],
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

      if (!formData.numero_op || !formData.produto || !formData.cliente) {
        toast({ 
          title: "Campos obrigatórios", 
          description: "Preencha Número OP, Produto e Cliente",
          variant: "destructive" 
        });
        return;
      }

      if (isCreating) {
        const { error } = await supabase.from("metal_ops").insert([{
          numero_op: formData.numero_op,
          produto: formData.produto,
          cliente: formData.cliente,
          quantidade: formData.quantidade || 1,
          data_entrada: formData.data_entrada || new Date().toISOString().split('T')[0],
          dimensoes: formData.dimensoes,
          material: formData.material,
          acabamento: formData.acabamento,
          pedido: formData.pedido,
          item: formData.item,
          desenhista: formData.desenhista,
          ficha_tecnica_url: formData.ficha_tecnica_url,
          data_prevista_saida: formData.data_prevista_saida,
          observacoes: formData.observacoes,
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
            cliente: formData.cliente,
            quantidade: formData.quantidade,
            data_entrada: formData.data_entrada,
            dimensoes: formData.dimensoes,
            material: formData.material,
            acabamento: formData.acabamento,
            pedido: formData.pedido,
            item: formData.item,
            desenhista: formData.desenhista,
            ficha_tecnica_url: formData.ficha_tecnica_url,
            data_prevista_saida: formData.data_prevista_saida,
            observacoes: formData.observacoes,
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

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isCreating ? "Nova Ordem de Produção" : `OP ${selectedOP?.numero_op}`}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Ficha Técnica */}
          <Card className="p-4">
            <Label className="mb-2 block">Ficha Técnica</Label>
            {formData.ficha_tecnica_url ? (
              <div className="relative aspect-[3/4] w-full max-w-md mx-auto">
                <img
                  src={formData.ficha_tecnica_url}
                  alt="Ficha Técnica"
                  className="w-full h-full object-contain rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setFormData({ ...formData, ficha_tecnica_url: undefined })}
                >
                  Remover
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                <FileImage className="h-12 w-12 mb-2 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Enviando..." : "Clique para enviar a ficha técnica"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </Card>

          {/* Formulário */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_op">Número OP *</Label>
              <Input
                id="numero_op"
                value={formData.numero_op}
                onChange={(e) => setFormData({ ...formData, numero_op: e.target.value })}
                placeholder="Ex: 1938/25"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_entrada">Data de Entrada</Label>
              <Input
                id="data_entrada"
                type="date"
                value={formData.data_entrada}
                onChange={(e) => setFormData({ ...formData, data_entrada: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="produto">Produto *</Label>
              <Input
                id="produto"
                value={formData.produto}
                onChange={(e) => setFormData({ ...formData, produto: e.target.value })}
                placeholder="Ex: Funil"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dimensoes">Dimensões</Label>
              <Input
                id="dimensoes"
                value={formData.dimensoes || ""}
                onChange={(e) => setFormData({ ...formData, dimensoes: e.target.value })}
                placeholder="Ex: 300x400mm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Input
                id="material"
                value={formData.material || ""}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                placeholder="Ex: Aço Inox"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acabamento">Acabamento</Label>
              <Input
                id="acabamento"
                value={formData.acabamento || ""}
                onChange={(e) => setFormData({ ...formData, acabamento: e.target.value })}
                placeholder="Ex: Polido"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente *</Label>
              <Input
                id="cliente"
                value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                placeholder="Nome do cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pedido">Pedido</Label>
              <Input
                id="pedido"
                value={formData.pedido || ""}
                onChange={(e) => setFormData({ ...formData, pedido: e.target.value })}
                placeholder="Número do pedido"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item">Item</Label>
              <Input
                id="item"
                value={formData.item || ""}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                placeholder="Item do pedido"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                value={formData.quantidade}
                onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) })}
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desenhista">Desenhista</Label>
              <Input
                id="desenhista"
                value={formData.desenhista || ""}
                onChange={(e) => setFormData({ ...formData, desenhista: e.target.value })}
                placeholder="Nome do desenhista"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_prevista_saida">Previsão de Saída</Label>
              <Input
                id="data_prevista_saida"
                type="date"
                value={formData.data_prevista_saida || ""}
                onChange={(e) => setFormData({ ...formData, data_prevista_saida: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes || ""}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações adicionais"
                rows={3}
              />
            </div>
          </div>

          <Button onClick={handleSave} className="w-full" size="lg">
            <Save className="h-4 w-4 mr-2" />
            {isCreating ? "Criar OP" : "Salvar Alterações"}
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
