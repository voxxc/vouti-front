import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, X, FileImage, RotateCw, Trash2, RefreshCw, MapPin } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const [rotation, setRotation] = useState(selectedOP?.ficha_tecnica_rotation || 0);
  const [formData, setFormData] = useState<Partial<MetalOP>>(
    selectedOP || {
      numero_op: "",
      produto: "",
      data_entrada: new Date().toISOString().split('T')[0],
      quantidade: 1,
      status: "aguardando",
    }
  );

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, ficha_tecnica_url: null });
    setRotation(0);
  };

  const handleResetOP = async () => {
    if (!selectedOP) return;
    
    try {
      // Deletar todos os registros de fluxo de setor
      const { error: deleteError } = await supabase
        .from("metal_setor_flow")
        .delete()
        .eq("op_id", selectedOP.id);
      
      if (deleteError) throw deleteError;

      // Resetar setor_atual e status da OP
      const { error: updateError } = await supabase
        .from("metal_ops")
        .update({
          setor_atual: null,
          status: "aguardando"
        })
        .eq("id", selectedOP.id);

      if (updateError) throw updateError;

      toast({ title: "OP resetada com sucesso!" });
      // Não fecha o painel, apenas recarrega os dados
      setFormData({
        ...formData,
        setor_atual: null,
        status: "aguardando"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao resetar OP",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSetSetor = async (setor: string) => {
    if (!selectedOP) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Verificar se já existe um fluxo aberto (sem saída) para esta OP
      const { data: openFlow } = await supabase
        .from("metal_setor_flow")
        .select("*")
        .eq("op_id", selectedOP.id)
        .is("saida", null)
        .order("entrada", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Se existe um fluxo aberto em outro setor, fecha ele
      if (openFlow && openFlow.setor !== setor) {
        const { error: closeError } = await supabase
          .from("metal_setor_flow")
          .update({
            saida: new Date().toISOString(),
            operador_saida_id: user.id
          })
          .eq("id", openFlow.id);

        if (closeError) throw closeError;

        // Registrar histórico de saída do setor anterior
        await supabase.from("metal_op_history").insert({
          op_id: selectedOP.id,
          user_id: user.id,
          acao: "saida_setor",
          detalhes: `Saiu do setor: ${openFlow.setor}`
        });
      }

      // Se o setor selecionado é diferente do fluxo aberto, cria novo fluxo
      if (!openFlow || openFlow.setor !== setor) {
        const { error: flowError } = await supabase
          .from("metal_setor_flow")
          .insert({
            op_id: selectedOP.id,
            setor: setor,
            entrada: new Date().toISOString(),
            operador_entrada_id: user.id
          });

        if (flowError) throw flowError;

        // Registrar histórico de entrada no novo setor
        await supabase.from("metal_op_history").insert({
          op_id: selectedOP.id,
          user_id: user.id,
          acao: "entrada_setor",
          detalhes: `Entrou no setor: ${setor}`
        });
      }

      // Atualizar a OP com o setor atual
      const { error: updateError } = await supabase
        .from("metal_ops")
        .update({
          setor_atual: setor,
          status: "em_producao"
        })
        .eq("id", selectedOP.id);

      if (updateError) throw updateError;

      toast({ title: `OP movida para ${setor}` });
      onSave();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar setor",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const SETORES = [
    'Programação',
    'Guilhotina',
    'Corte a laser',
    'Dobra',
    'Montagem',
    'Acabamento',
    'Expedição',
    'Entrega'
  ];

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
          ficha_tecnica_rotation: rotation,
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
            ficha_tecnica_rotation: rotation,
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
              <div className="w-full space-y-6">
                <div className="w-full min-h-[200px] flex items-center justify-center mb-8">
                  <img
                    src={formData.ficha_tecnica_url}
                    alt="Ficha Técnica"
                    className="max-w-full h-auto object-contain rounded-lg border transition-transform duration-300"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRotate}
                    className="flex items-center gap-2"
                  >
                    <RotateCw className="h-4 w-4" />
                    Rotacionar
                  </Button>
                  
                  {!isCreating && (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <MapPin className="h-4 w-4" />
                            Definir Fase
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="center">
                          {SETORES.map((setor) => (
                            <DropdownMenuItem
                              key={setor}
                              onClick={() => handleSetSetor(setor)}
                            >
                              {setor}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetOP}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Resetar
                      </Button>
                    </>
                  )}

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveImage}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                </div>
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
    </div>
  );
}
