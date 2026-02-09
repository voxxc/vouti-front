import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, CheckCircle2, XCircle, RefreshCw, QrCode, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Agent } from "@/components/WhatsApp/settings/AgentCard";

interface SuperAdminAgentConfigDrawerProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentUpdated: () => void;
}

interface InstanceConfig {
  id?: string;
  zapi_instance_id: string;
  zapi_instance_token: string;
  zapi_client_token: string;
}

export const SuperAdminAgentConfigDrawer = ({ agent, open, onOpenChange, onAgentUpdated }: SuperAdminAgentConfigDrawerProps) => {
  const [config, setConfig] = useState<InstanceConfig>({
    zapi_instance_id: "",
    zapi_instance_token: "",
    zapi_client_token: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Carregar config da instância do agente
  useEffect(() => {
    if (!agent || !open) return;
    loadInstanceConfig();
  }, [agent, open]);

  const loadInstanceConfig = async () => {
    if (!agent) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .is("tenant_id", null)
        .eq("agent_id", agent.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          zapi_instance_id: data.instance_name || "",
          zapi_instance_token: data.zapi_token || "",
          zapi_client_token: data.zapi_url || "", // Reutilizando campo para client_token
        });
        setIsConnected(data.connection_status === "connected");
      } else {
        setConfig({
          zapi_instance_id: "",
          zapi_instance_token: "",
          zapi_client_token: "",
        });
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Erro ao carregar config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    if (!config.zapi_instance_id || !config.zapi_instance_token) return;
    
    setIsCheckingStatus(true);
    try {
      const response = await supabase.functions.invoke('whatsapp-zapi-action', {
        body: {
          action: 'status',
          zapi_instance_id: config.zapi_instance_id,
          zapi_instance_token: config.zapi_instance_token,
          zapi_client_token: config.zapi_client_token,
        }
      });

      if (response.error) throw response.error;
      
      const result = response.data;
      if (result.success) {
        const connected = result.data?.connected === true;
        setIsConnected(connected);
        
        if (config.id) {
          await supabase
            .from("whatsapp_instances")
            .update({ connection_status: connected ? "connected" : "disconnected" })
            .eq("id", config.id);
          onAgentUpdated();
        }
      }
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      toast.error("Não foi possível verificar o status");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSave = async () => {
    if (!agent) return;
    
    setIsSaving(true);
    try {
      if (config.id) {
        const { error } = await supabase
          .from("whatsapp_instances")
          .update({
            instance_name: config.zapi_instance_id,
            zapi_token: config.zapi_instance_token,
            zapi_url: config.zapi_client_token, // Reutilizando campo
          })
          .eq("id", config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("whatsapp_instances")
          .insert({
            tenant_id: null,
            agent_id: agent.id,
            instance_name: config.zapi_instance_id,
            zapi_token: config.zapi_instance_token,
            zapi_url: config.zapi_client_token,
            connection_status: "disconnected",
          })
          .select()
          .single();

        if (error) throw error;
        setConfig(prev => ({ ...prev, id: data.id }));
      }

      toast.success("Configurações salvas!");
      onAgentUpdated();
      
      checkConnectionStatus();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnect = async () => {
    if (!config.zapi_instance_id || !config.zapi_instance_token) {
      toast.error("Preencha Instance ID e Instance Token primeiro");
      return;
    }

    try {
      const response = await supabase.functions.invoke('whatsapp-zapi-action', {
        body: {
          action: 'qr-code',
          zapi_instance_id: config.zapi_instance_id,
          zapi_instance_token: config.zapi_instance_token,
          zapi_client_token: config.zapi_client_token,
        }
      });

      if (response.error) throw response.error;

      const result = response.data;
      
      if (result.success && result.data?.value) {
        setQrCode(result.data.value);
        toast.success("Escaneie o QR Code com seu WhatsApp");
      } else {
        toast.info("Dispositivo já conectado ou aguardando...");
        checkConnectionStatus();
      }
    } catch (error) {
      console.error("Erro ao conectar:", error);
      toast.error("Erro ao obter QR Code");
    }
  };

  const handleDisconnect = async () => {
    if (!config.zapi_instance_id || !config.zapi_instance_token) return;

    try {
      const response = await supabase.functions.invoke('whatsapp-zapi-action', {
        body: {
          action: 'disconnect',
          zapi_instance_id: config.zapi_instance_id,
          zapi_instance_token: config.zapi_instance_token,
          zapi_client_token: config.zapi_client_token,
        }
      });

      if (response.error) throw response.error;
      
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao desconectar');
      }

      setIsConnected(false);
      setQrCode(null);
      
      if (config.id) {
        await supabase
          .from("whatsapp_instances")
          .update({ connection_status: "disconnected" })
          .eq("id", config.id);
      }

      toast.success("Desconectado com sucesso!");
      onAgentUpdated();
    } catch (error: any) {
      console.error("Erro ao desconectar:", error);
      toast.error(error.message || "Erro ao desconectar");
    }
  };

  const handleReset = async () => {
    if (!config.id) return;

    try {
      if (config.zapi_instance_id && config.zapi_instance_token) {
        await supabase.functions.invoke('whatsapp-zapi-action', {
          body: {
            action: 'disconnect',
            zapi_instance_id: config.zapi_instance_id,
            zapi_instance_token: config.zapi_instance_token,
            zapi_client_token: config.zapi_client_token,
          }
        }).catch(() => {});
      }

      await supabase
        .from("whatsapp_instances")
        .delete()
        .eq("id", config.id);

      setConfig({
        zapi_instance_id: "",
        zapi_instance_token: "",
        zapi_client_token: "",
      });
      setIsConnected(false);
      setQrCode(null);

      toast.success("Configurações resetadas");
      onAgentUpdated();
    } catch (error) {
      console.error("Erro ao resetar:", error);
      toast.error("Erro ao resetar");
    }
  };

  if (!agent) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary/20 text-primary">
                {agent.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle>{agent.name}</SheetTitle>
              <SheetDescription>{agent.role}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status da Conexão</span>
            <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
              {isCheckingStatus ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isConnected ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {isConnected ? "Conectado" : "Desconectado"}
            </Badge>
          </div>

          <Separator />

          {/* Credenciais Z-API */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Credenciais Z-API</h3>
            
            <div className="space-y-2">
              <Label htmlFor="zapi_instance_id">Instance ID</Label>
              <Input
                id="zapi_instance_id"
                value={config.zapi_instance_id}
                onChange={(e) => setConfig(prev => ({ ...prev, zapi_instance_id: e.target.value }))}
                placeholder="Ex: 3E8A768C5D9F4A7B8C2E1D3F"
              />
              <p className="text-xs text-muted-foreground">
                Encontre no painel Z-API → Sua instância
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zapi_instance_token">Instance Token</Label>
              <Input
                id="zapi_instance_token"
                value={config.zapi_instance_token}
                onChange={(e) => setConfig(prev => ({ ...prev, zapi_instance_token: e.target.value }))}
                placeholder="Token da instância (obrigatório)"
              />
              <p className="text-xs text-muted-foreground">
                Token que aparece na URL da API Z-API
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zapi_client_token">Client-Token (Opcional)</Label>
              <Input
                id="zapi_client_token"
                type="password"
                value={config.zapi_client_token}
                onChange={(e) => setConfig(prev => ({ ...prev, zapi_client_token: e.target.value }))}
                placeholder="Só preencha se ativou Security Token"
              />
              <p className="text-xs text-muted-foreground">
                Somente se você ativou o Security Token em: Painel Z-API → Security
              </p>
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Configurações
            </Button>
          </div>

          <Separator />

          {/* Ações de Conexão */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Ações</h3>
            
            {isConnected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-primary font-medium">WhatsApp Conectado</span>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={handleDisconnect}>
                    <XCircle className="h-4 w-4" />
                    Desconectar
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={checkConnectionStatus}
                  >
                    <RefreshCw className={`h-4 w-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2" 
                  onClick={handleConnect}
                  disabled={!config.zapi_instance_id || !config.zapi_instance_token}
                >
                  <QrCode className="h-4 w-4" />
                  Conectar via QR Code
                </Button>
                <Button 
                  variant="outline" 
                  onClick={checkConnectionStatus}
                >
                  <RefreshCw className={`h-4 w-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            )}

            {config.id && (
              <Button variant="destructive" className="w-full gap-2" onClick={handleReset}>
                <Trash2 className="h-4 w-4" />
                Resetar Configurações
              </Button>
            )}
          </div>

          {/* QR Code */}
          {qrCode && (
            <div className="flex flex-col items-center gap-3 p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">Escaneie o QR Code</span>
              <img src={`data:image/png;base64,${qrCode}`} alt="QR Code" className="w-48 h-48" />
              <Button variant="ghost" size="sm" onClick={() => setQrCode(null)}>
                Fechar
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
