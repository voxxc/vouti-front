import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Camera, X, FileImage, RotateCw, Trash2, RefreshCw, MapPin, Info, Clock, User, Calendar, Package, ChevronDown, ChevronUp } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { MetalOP, MetalSetorFlow } from "@/types/metal";
import { SetorControls } from "./SetorControls";
import { format } from "date-fns";

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
  const [userSetor, setUserSetor] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [setorFlows, setSetorFlows] = useState<MetalSetorFlow[]>([]);
  const [formData, setFormData] = useState<Partial<MetalOP>>(
    selectedOP || {
      numero_op: "",
      produto: "",
      data_entrada: new Date().toISOString().split('T')[0],
      quantidade: 1,
      status: "aguardando",
    }
  );

  // Atualizar formData e rotation quando selectedOP mudar
  useEffect(() => {
    if (isCreating) {
      setFormData({
        numero_op: "",
        produto: "",
        data_entrada: new Date().toISOString().split('T')[0],
        quantidade: 1,
        status: "aguardando",
      });
      setRotation(0);
    } else if (selectedOP) {
      setFormData(selectedOP);
      setRotation(selectedOP.ficha_tecnica_rotation || 0);
    }
  }, [selectedOP, isCreating]);

  useEffect(() => {
    loadUserSetor();
  }, []);

  useEffect(() => {
    if (selectedOP?.id && showDetails) {
      loadSetorFlows();
    }
  }, [selectedOP?.id, showDetails]);

  const loadUserSetor = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("metal_profiles")
      .select("setor")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      setUserSetor(profile.setor);
    }
  };

  const loadSetorFlows = async () => {
    if (!selectedOP?.id) return;

    const { data } = await supabase
      .from("metal_setor_flow")
      .select("*")
      .eq("op_id", selectedOP.id)
      .order("entrada", { ascending: true });

    if (data) {
      setSetorFlows(data);
    }
  };

  const getSetorStatus = (setor: string) => {
    const flow = setorFlows.find(f => f.setor === setor);
    if (!flow) return 'pending';
    if (flow.saida) return 'completed';
    return 'in-progress';
  };

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Se for Programação ou Admin, resetar tudo
      if (userSetor === 'Programação' || !userSetor) {
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

        toast({ title: "OP resetada completamente!" });
      } else {
        // Para outros setores, resetar apenas o setor atual
        const { error: deleteError } = await supabase
          .from("metal_setor_flow")
          .delete()
          .eq("op_id", selectedOP.id)
          .eq("setor", userSetor);
        
        if (deleteError) throw deleteError;

        toast({ title: `Resetado apenas o setor ${userSetor}` });
      }

      // Recarregar dados
      setFormData({
        ...formData,
        setor_atual: userSetor === 'Programação' ? null : formData.setor_atual,
        status: userSetor === 'Programação' ? "aguardando" : formData.status
      });
      onSave();
    } catch (error: any) {
      toast({
        title: "Erro ao resetar",
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
      // Criar nome único usando ID da OP (se existir) ou timestamp
      const uniqueId = selectedOP?.id || `temp-${Date.now()}`;
      const fileName = `op-${uniqueId}.${fileExt}`;
      const filePath = `${fileName}`;

      // Se já existe uma imagem antiga, deletar primeiro para evitar lixo no storage
      if (formData.ficha_tecnica_url) {
        try {
          const oldPath = formData.ficha_tecnica_url.split('/').pop();
          if (oldPath) {
            await supabase.storage
              .from("op-fichas-tecnicas")
              .remove([oldPath]);
          }
        } catch (error) {
          console.log("Erro ao deletar imagem antiga, continuando...");
        }
      }

      // Upload da nova imagem - sem upsert para evitar sobrescrever
      const { error: uploadError } = await supabase.storage
        .from("op-fichas-tecnicas")
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        // Se arquivo já existe, deletar e tentar novamente
        if (uploadError.message.includes('already exists')) {
          await supabase.storage
            .from("op-fichas-tecnicas")
            .remove([filePath]);
          
          const { error: retryError } = await supabase.storage
            .from("op-fichas-tecnicas")
            .upload(filePath, file, { upsert: false });
          
          if (retryError) throw retryError;
        } else {
          throw uploadError;
        }
      }

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
      
      // Ao salvar, atualizar rotation no banco
      if (!isCreating && rotation !== selectedOP?.ficha_tecnica_rotation) {
        await supabase
          .from("metal_ops")
          .update({ ficha_tecnica_rotation: rotation })
          .eq("id", selectedOP?.id);
      }
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
                
                {/* Controles de setor */}
                {!isCreating && selectedOP && (
                  <SetorControls 
                    selectedOP={selectedOP}
                    userSetor={userSetor}
                    onUpdate={onSave}
                  />
                )}

                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  {/* Botões visíveis apenas para Programação */}
                  {userSetor === 'Programação' && (
                    <>
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

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleRemoveImage}
                            className="flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remover
                          </Button>
                        </>
                      )}
                    </>
                  )}

                  {/* Botão Resetar para outros setores (apenas resetar fase) */}
                  {!isCreating && userSetor !== 'Programação' && userSetor && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetOP}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Resetar Fase
                    </Button>
                  )}
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
                disabled={userSetor !== 'Programação' && !isCreating}
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
                disabled={userSetor !== 'Programação' && !isCreating}
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
                disabled={userSetor !== 'Programação' && !isCreating}
              />
            </div>
          </div>

          <Button onClick={handleSave} className="w-full h-12 text-base" size="lg">
            {isCreating ? "Criar OP" : "Salvar"}
          </Button>

          {!isCreating && selectedOP && (
            <Button 
              onClick={() => setShowDetails(!showDetails)} 
              variant="outline"
              className="w-full h-12 text-base" 
              size="lg"
            >
              <Info className="h-4 w-4 mr-2" />
              DETALHES
              {showDetails ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>
          )}

          {/* Seção de Detalhes Expandida */}
          {!isCreating && selectedOP && showDetails && (
            <div className="space-y-6 pt-4 border-t">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-semibold">Detalhes da OP</h3>
                <p className="text-muted-foreground font-medium">OP {selectedOP.numero_op}</p>
              </div>

              {/* Status Card */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={selectedOP.status === 'concluido' ? 'default' : 'secondary'}>
                      {selectedOP.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedOP.produto}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedOP.cliente}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(selectedOP.data_entrada), 'dd/MM/yyyy')}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>Qtd: {selectedOP.quantidade}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Progresso nos Setores */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <h3 className="font-semibold">Progresso nos Setores</h3>
                </div>

                <div className="space-y-2">
                  {SETORES.map((setor, index) => {
                    const status = getSetorStatus(setor);
                    const flow = setorFlows.find(f => f.setor === setor);

                    return (
                      <div
                        key={setor}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="relative">
                          <div
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                              status === 'completed'
                                ? 'bg-primary border-primary text-primary-foreground'
                                : status === 'in-progress'
                                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-600'
                                : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                            }`}
                          >
                            {status === 'completed' ? (
                              <span className="text-xs font-bold">✓</span>
                            ) : (
                              <span className="text-xs">{index + 1}</span>
                            )}
                          </div>
                          {index < SETORES.length - 1 && (
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-border" />
                          )}
                        </div>

                        <div className="flex-1">
                          <p className="font-medium text-sm">{setor}</p>
                          {flow && (
                            <p className="text-xs text-muted-foreground">
                              {flow.entrada && `Entrada: ${format(new Date(flow.entrada), 'dd/MM HH:mm')}`}
                              {flow.saida && ` - Saída: ${format(new Date(flow.saida), 'dd/MM HH:mm')}`}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
