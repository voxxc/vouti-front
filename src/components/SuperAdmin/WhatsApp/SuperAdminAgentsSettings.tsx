import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Users2, Loader2, Wifi, WifiOff, QrCode, 
  Unplug, RotateCcw, Save, CheckCircle2, XCircle, RefreshCw 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AgentCard, Agent } from "@/components/WhatsApp/settings/AgentCard";
import { SuperAdminAddAgentDialog } from "./SuperAdminAddAgentDialog";
import { WhatsAppAISettings } from "@/components/WhatsApp/settings/WhatsAppAISettings";
import { useToast } from "@/hooks/use-toast";
import { extractInstanceId, extractInstanceToken } from "@/utils/zapiHelpers";
import { cn } from "@/lib/utils";

interface InstanceConfig {
  id?: string;
  zapi_instance_id: string;
  zapi_instance_token: string;
  zapi_client_token: string;
}

export const SuperAdminAgentsSettings = () => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados de expansão inline
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("zapi");
  
  // Estados para Z-API
  const [config, setConfig] = useState<InstanceConfig>({
    zapi_instance_id: "",
    zapi_instance_token: "",
    zapi_client_token: "",
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("unknown");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadAgents();
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const loadAgents = async () => {
    setIsLoading(true);
    try {
      const { data: agentsData, error: agentsError } = await supabase
        .from("whatsapp_agents")
        .select("*")
        .is("tenant_id", null)
        .order("created_at", { ascending: true });

      if (agentsError) throw agentsError;

      const { data: instancesData } = await supabase
        .from("whatsapp_instances")
        .select("agent_id, connection_status")
        .is("tenant_id", null);

      const instanceMap = new Map(
        instancesData?.map(i => [i.agent_id, i.connection_status === "connected"]) || []
      );

      const formattedAgents: Agent[] = (agentsData || []).map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        is_active: a.is_active,
        isConnected: instanceMap.get(a.id) || false,
      }));

      setAgents(formattedAgents);
    } catch (error) {
      console.error("Erro ao carregar agentes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInstanceConfig = async (agentId: string) => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("agent_id", agentId)
        .is("tenant_id", null)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          zapi_instance_id: data.zapi_instance_id || "",
          zapi_instance_token: data.zapi_instance_token || "",
          zapi_client_token: data.zapi_client_token || "",
        });
        setIsConnected(data.connection_status === "connected");
        setConnectionStatus(data.connection_status || "disconnected");
      } else {
        // Limpar config se não existir
        setConfig({
          zapi_instance_id: "",
          zapi_instance_token: "",
          zapi_client_token: "",
        });
        setIsConnected(false);
        setConnectionStatus("not_configured");
      }

      // Verificar status real da Z-API
      if (data?.zapi_instance_id && data?.zapi_instance_token) {
        await checkZAPIStatus(data.zapi_instance_id, data.zapi_instance_token, data.zapi_client_token);
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
    }
  };

  const checkZAPIStatus = async (instanceId?: string, instanceToken?: string, clientToken?: string) => {
    setIsCheckingStatus(true);
    try {
      const id = instanceId || config.zapi_instance_id;
      const token = instanceToken || config.zapi_instance_token;
      const cToken = clientToken || config.zapi_client_token;

      if (!id || !token) {
        setConnectionStatus("not_configured");
        setIsConnected(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("whatsapp-zapi-action", {
        body: {
          action: "status",
          zapi_instance_id: id,
          zapi_instance_token: token,
          zapi_client_token: cToken || undefined,
        },
      });

      if (error) throw error;

      const status = data?.data?.connected ? "connected" : "disconnected";
      setConnectionStatus(status);
      setIsConnected(status === "connected");

      // Atualizar no banco se mudou
      if (expandedAgentId && config.id) {
        await supabase
          .from("whatsapp_instances")
          .update({ connection_status: status, updated_at: new Date().toISOString() })
          .eq("id", config.id);
      }
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      setConnectionStatus("error");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleAgentClick = async (agent: Agent) => {
    if (expandedAgentId === agent.id) {
      // Fecha e para polling
      setExpandedAgentId(null);
      setQrCode(null);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setIsPolling(false);
    } else {
      // Abre e carrega configuração
      setExpandedAgentId(agent.id);
      setActiveTab("zapi");
      setQrCode(null);
      await loadInstanceConfig(agent.id);
    }
  };

  const handleSaveCredentials = async () => {
    if (!expandedAgentId) return;
    
    setIsSaving(true);
    try {
      const payload = {
        agent_id: expandedAgentId,
        tenant_id: null,
        instance_name: `superadmin-${expandedAgentId}`,
        zapi_instance_id: config.zapi_instance_id,
        zapi_instance_token: config.zapi_instance_token,
        zapi_client_token: config.zapi_client_token || null,
        connection_status: "disconnected",
        updated_at: new Date().toISOString(),
      };

      if (config.id) {
        const { error } = await supabase
          .from("whatsapp_instances")
          .update(payload)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("whatsapp_instances")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setConfig(prev => ({ ...prev, id: data.id }));
        }
      }

      toast({
        title: "Credenciais salvas",
        description: "As credenciais Z-API foram salvas com sucesso",
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as credenciais",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateQRCode = async () => {
    if (!config.zapi_instance_id || !config.zapi_instance_token) {
      toast({
        title: "Credenciais incompletas",
        description: "Preencha o ID e Token da instância antes de conectar",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingQR(true);
    try {
      // Timeout de 30 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const { data, error } = await supabase.functions.invoke("whatsapp-zapi-action", {
        body: {
          action: "qr-code",
          zapi_instance_id: config.zapi_instance_id,
          zapi_instance_token: config.zapi_instance_token,
          zapi_client_token: config.zapi_client_token || undefined,
        },
      });

      clearTimeout(timeoutId);

      if (error) throw error;

      console.log("QR Code response:", data);

      // A Z-API retorna o QR Code em data.value (base64)
      const qrValue = data?.data?.value;
      if (qrValue) {
        setQrCode(qrValue);
        startPolling();
        toast({
          title: "QR Code gerado",
          description: "Escaneie o código com seu WhatsApp",
        });
      } else {
        console.error("Resposta sem QR Code:", data);
        throw new Error(data?.data?.error || "QR Code não retornado pela API");
      }
    } catch (error: any) {
      console.error("Erro ao gerar QR Code:", error);
      const message = error?.name === 'AbortError' 
        ? "Timeout: A requisição demorou muito" 
        : "Não foi possível gerar o QR Code";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const startPolling = () => {
    setIsPolling(true);
    
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("whatsapp-zapi-action", {
          body: {
            action: "status",
            zapi_instance_id: config.zapi_instance_id,
            zapi_instance_token: config.zapi_instance_token,
            zapi_client_token: config.zapi_client_token || undefined,
          },
        });

        if (error) throw error;

        if (data?.data?.connected) {
          // Conectou!
          setIsConnected(true);
          setConnectionStatus("connected");
          setQrCode(null);
          setIsPolling(false);
          
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          // Atualizar no banco
          if (config.id) {
            await supabase
              .from("whatsapp_instances")
              .update({ 
                connection_status: "connected", 
                updated_at: new Date().toISOString() 
              })
              .eq("id", config.id);
          }

          // Recarregar agentes para atualizar o card
          await loadAgents();

          toast({
            title: "Conectado!",
            description: "WhatsApp conectado com sucesso",
          });
        }
      } catch (error) {
        console.error("Erro no polling:", error);
      }
    }, 5000); // A cada 5 segundos
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const { error } = await supabase.functions.invoke("whatsapp-zapi-action", {
        body: {
          action: "disconnect",
          zapi_instance_id: config.zapi_instance_id,
          zapi_instance_token: config.zapi_instance_token,
          zapi_client_token: config.zapi_client_token || undefined,
        },
      });

      if (error) throw error;

      setIsConnected(false);
      setConnectionStatus("disconnected");

      // Atualizar no banco
      if (config.id) {
        await supabase
          .from("whatsapp_instances")
          .update({ 
            connection_status: "disconnected", 
            updated_at: new Date().toISOString() 
          })
          .eq("id", config.id);
      }

      await loadAgents();

      toast({
        title: "Desconectado",
        description: "WhatsApp desconectado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao desconectar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível desconectar",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      // Tentar desconectar primeiro (ignora erros)
      if (config.zapi_instance_id && config.zapi_instance_token) {
        await supabase.functions.invoke("whatsapp-zapi-action", {
          body: {
            action: "disconnect",
            zapi_instance_id: config.zapi_instance_id,
            zapi_instance_token: config.zapi_instance_token,
            zapi_client_token: config.zapi_client_token || undefined,
          },
        }).catch(() => {});
      }

      // Deletar do banco
      if (config.id) {
        await supabase
          .from("whatsapp_instances")
          .delete()
          .eq("id", config.id);
      }

      // Limpar estados
      setConfig({
        zapi_instance_id: "",
        zapi_instance_token: "",
        zapi_client_token: "",
      });
      setIsConnected(false);
      setConnectionStatus("not_configured");
      setQrCode(null);

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setIsPolling(false);

      await loadAgents();

      toast({
        title: "Resetado",
        description: "Configuração resetada com sucesso",
      });
    } catch (error) {
      console.error("Erro ao resetar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível resetar",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleCancelQR = () => {
    setQrCode(null);
    setIsPolling(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const getStatusDisplay = () => {
    if (isCheckingStatus) {
      return { icon: RefreshCw, text: "Verificando...", className: "text-muted-foreground animate-spin" };
    }
    switch (connectionStatus) {
      case "connected":
        return { icon: CheckCircle2, text: "Conectado", className: "text-green-500" };
      case "disconnected":
        return { icon: XCircle, text: "Desconectado", className: "text-red-500" };
      case "not_configured":
        return { icon: WifiOff, text: "Não configurado", className: "text-muted-foreground" };
      default:
        return { icon: WifiOff, text: "Status desconhecido", className: "text-muted-foreground" };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users2 className="h-6 w-6" />
              Agentes
            </h1>
            <p className="text-muted-foreground">
              Gerencie os agentes e suas configurações Z-API individuais
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Agente
          </Button>
        </div>

        {/* Grid de Agentes com expansão inline */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum agente cadastrado</p>
            <p className="text-sm">Clique em "Adicionar Agente" para começar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {agents.map(agent => (
              <div key={agent.id}>
                {/* Card do Agente */}
                <AgentCard 
                  agent={agent} 
                  onClick={() => handleAgentClick(agent)}
                />

                {/* Expansão Inline com Tabs */}
                {expandedAgentId === agent.id && (
                  <Card className="mt-4 border-primary/50 shadow-lg">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <CardHeader className="pb-0">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="zapi" className="gap-2">
                            <Wifi className="h-4 w-4" />
                            Conexão Z-API
                          </TabsTrigger>
                          <TabsTrigger value="ai" className="gap-2">
                            Comportamento da IA
                          </TabsTrigger>
                        </TabsList>
                      </CardHeader>

                      <CardContent className="pt-6">
                        {/* Aba Conexão Z-API */}
                        <TabsContent value="zapi" className="mt-0 space-y-6">
                          {/* Status */}
                          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-3 h-3 rounded-full",
                                isConnected ? "bg-green-500" : "bg-muted-foreground/40"
                              )} />
                              <div className="flex items-center gap-2">
                                <StatusIcon className={cn("h-5 w-5", statusDisplay.className)} />
                                <span className="font-medium">{statusDisplay.text}</span>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => checkZAPIStatus()}
                              disabled={isCheckingStatus}
                            >
                              <RefreshCw className={cn("h-4 w-4", isCheckingStatus && "animate-spin")} />
                            </Button>
                          </div>

                          {/* Credenciais */}
                          <div className="space-y-4">
                            <h3 className="font-semibold">Credenciais Z-API</h3>
                            
                            {/* Campo para colar URL completa */}
                            <div className="space-y-2">
                              <Label htmlFor="zapi_full_url">API da Instância (URL Completa)</Label>
                              <Input
                                id="zapi_full_url"
                                placeholder="Cole a URL completa da Z-API aqui..."
                                className="font-mono text-xs"
                                onChange={(e) => {
                                  const url = e.target.value;
                                  const instanceId = extractInstanceId(url);
                                  const instanceToken = extractInstanceToken(url);
                                  if (instanceId || instanceToken) {
                                    setConfig(prev => ({
                                      ...prev,
                                      zapi_instance_id: instanceId || prev.zapi_instance_id,
                                      zapi_instance_token: instanceToken || prev.zapi_instance_token,
                                    }));
                                    e.target.value = "";
                                    toast({
                                      title: "Credenciais extraídas",
                                      description: "ID e Token foram preenchidos automaticamente",
                                    });
                                  }
                                }}
                              />
                              <p className="text-xs text-muted-foreground">
                                Cole a URL e os campos abaixo serão preenchidos automaticamente
                              </p>
                            </div>

                            {/* Grid de credenciais */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="zapi_instance_id">ID da Instância</Label>
                                <Input
                                  id="zapi_instance_id"
                                  value={config.zapi_instance_id}
                                  onChange={(e) => setConfig(prev => ({ 
                                    ...prev, 
                                    zapi_instance_id: extractInstanceId(e.target.value)
                                  }))}
                                  placeholder="3E8A7687..."
                                  className="font-mono"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="zapi_instance_token">Token da Instância</Label>
                                <Input
                                  id="zapi_instance_token"
                                  value={config.zapi_instance_token}
                                  onChange={(e) => setConfig(prev => ({ 
                                    ...prev, 
                                    zapi_instance_token: extractInstanceToken(e.target.value)
                                  }))}
                                  placeholder="F5DA3871..."
                                  className="font-mono"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="zapi_client_token">Client-Token (Opcional)</Label>
                              <Input
                                id="zapi_client_token"
                                value={config.zapi_client_token}
                                onChange={(e) => setConfig(prev => ({ ...prev, zapi_client_token: e.target.value }))}
                                placeholder="Token de segurança (opcional)"
                                className="font-mono"
                              />
                              <p className="text-xs text-muted-foreground">
                                Se sua instância Z-API exigir token de segurança adicional
                              </p>
                            </div>

                            <Button onClick={handleSaveCredentials} disabled={isSaving} className="w-full">
                              <Save className="h-4 w-4 mr-2" />
                              {isSaving ? "Salvando..." : "Salvar Credenciais"}
                            </Button>
                          </div>

                          {/* Separador */}
                          <div className="border-t pt-6">
                            <h3 className="font-semibold mb-4">Ações</h3>
                            
                            {/* Botões de Ação */}
                            <div className="flex flex-wrap gap-3">
                              <Button
                                onClick={handleGenerateQRCode}
                                disabled={isGeneratingQR || isConnected || !config.zapi_instance_id}
                                variant={isConnected ? "outline" : "default"}
                              >
                                {isGeneratingQR ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <QrCode className="h-4 w-4 mr-2" />
                                )}
                                {isConnected ? "Já Conectado" : "Conectar via QR Code"}
                              </Button>

                              <Button
                                onClick={handleDisconnect}
                                disabled={isDisconnecting || !isConnected}
                                variant="outline"
                              >
                                {isDisconnecting ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Unplug className="h-4 w-4 mr-2" />
                                )}
                                Desconectar
                              </Button>

                              <Button
                                onClick={handleReset}
                                disabled={isResetting}
                                variant="destructive"
                              >
                                {isResetting ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                )}
                                Resetar
                              </Button>
                            </div>
                          </div>

                          {/* QR Code Display */}
                          {qrCode && (
                            <div className="border rounded-lg p-6 bg-background flex flex-col items-center gap-4">
                              <img
                                src={qrCode.startsWith('data:image/') ? qrCode : `data:image/png;base64,${qrCode}`}
                                alt="QR Code WhatsApp"
                                className="w-64 h-64"
                              />
                              <div className="text-center">
                                <p className="font-medium">Escaneie com seu WhatsApp</p>
                                {isPolling && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center mt-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Aguardando conexão...
                                  </p>
                                )}
                              </div>
                              <Button variant="ghost" size="sm" onClick={handleCancelQR}>
                                Cancelar
                              </Button>
                            </div>
                          )}
                        </TabsContent>

                        {/* Aba Comportamento da IA */}
                        <TabsContent value="ai" className="mt-0">
                          <WhatsAppAISettings isSuperAdmin={true} agentId={agent.id} />
                        </TabsContent>
                      </CardContent>
                    </Tabs>
                  </Card>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dialog para adicionar */}
        <SuperAdminAddAgentDialog 
          open={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen}
          onAgentAdded={loadAgents}
        />
      </div>
    </div>
  );
};
