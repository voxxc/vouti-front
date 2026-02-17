import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Users2, Loader2, Wifi, WifiOff, QrCode, 
  Unplug, RotateCcw, Save, CheckCircle2, XCircle, RefreshCw, User, Trash2,
  Copy, ExternalLink, Globe, ChevronRight
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Agent } from "./AgentCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AddAgentDialog } from "./AddAgentDialog";
import { WhatsAppAISettings } from "./WhatsAppAISettings";
import { useToast } from "@/hooks/use-toast";
import { extractInstanceId, extractInstanceToken } from "@/utils/zapiHelpers";
import { cn } from "@/lib/utils";

interface InstanceConfig {
  id?: string;
  provider: string;
  zapi_instance_id: string;
  zapi_instance_token: string;
  zapi_client_token: string;
  meta_phone_number_id: string;
  meta_access_token: string;
  meta_waba_id: string;
  meta_verify_token: string;
}

export const WhatsAppAgentsSettings = () => {
  const { toast } = useToast();
  const { tenantId } = useTenantId();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados de expansão inline
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("connection");
  
  // Estados para Z-API
  // Estados para credenciais
  const [config, setConfig] = useState<InstanceConfig>({
    provider: "zapi",
    zapi_instance_id: "",
    zapi_instance_token: "",
    zapi_client_token: "",
    meta_phone_number_id: "",
    meta_access_token: "",
    meta_waba_id: "",
    meta_verify_token: "",
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
  const [hasOwnAgent, setHasOwnAgent] = useState(true);
  const [isCreatingMyAgent, setIsCreatingMyAgent] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);
  const [isDeletingAgent, setIsDeletingAgent] = useState(false);
  const [editingAgentName, setEditingAgentName] = useState<string>("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Get current user email
  useEffect(() => {
    const getEmail = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserEmail(data.user?.email || null);
    };
    getEmail();
  }, []);

  useEffect(() => {
    if (tenantId) {
      loadAgents();
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [tenantId]);

  const loadAgents = async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    try {
      const { data: agentsData, error: agentsError } = await supabase
        .from("whatsapp_agents")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

      if (agentsError) throw agentsError;

      const { data: instancesData } = await supabase
        .from("whatsapp_instances")
        .select("agent_id, connection_status")
        .eq("tenant_id", tenantId);

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

      // Check if current user already has an agent
      if (currentUserEmail) {
        const hasAgent = (agentsData || []).some(
          a => a.email?.toLowerCase() === currentUserEmail.toLowerCase()
        );
        setHasOwnAgent(hasAgent);
      }
    } catch (error) {
      console.error("Erro ao carregar agentes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create agent for current admin
  const handleCreateMyAgent = async () => {
    if (!tenantId || !currentUserEmail) return;
    
    setIsCreatingMyAgent(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      const name = profile?.full_name || currentUserEmail.split("@")[0];

      const { error } = await supabase
        .from("whatsapp_agents")
        .insert({
          tenant_id: tenantId,
          name,
          email: currentUserEmail.toLowerCase(),
          role: "admin",
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: "Agente criado!",
        description: "Seu agente foi criado. Agora você terá Caixa de Entrada e Kanban próprios.",
      });

      setHasOwnAgent(true);
      await loadAgents();
    } catch (error: any) {
      console.error("Erro ao criar agente:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o agente",
        variant: "destructive",
      });
    } finally {
      setIsCreatingMyAgent(false);
    }
  };

  const loadInstanceConfig = async (agentId: string) => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("agent_id", agentId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          provider: (data as any).provider || "zapi",
          zapi_instance_id: data.zapi_instance_id || "",
          zapi_instance_token: data.zapi_instance_token || "",
          zapi_client_token: data.zapi_client_token || "",
          meta_phone_number_id: (data as any).meta_phone_number_id || "",
          meta_access_token: (data as any).meta_access_token || "",
          meta_waba_id: (data as any).meta_waba_id || "",
          meta_verify_token: (data as any).meta_verify_token || "",
        });
        setIsConnected(data.connection_status === "connected");
        setConnectionStatus(data.connection_status || "disconnected");
      } else {
        // Limpar config se não existir
        setConfig({
          provider: "zapi",
          zapi_instance_id: "",
          zapi_instance_token: "",
          zapi_client_token: "",
          meta_phone_number_id: "",
          meta_access_token: "",
          meta_waba_id: "",
          meta_verify_token: "",
        });
        setIsConnected(false);
        setConnectionStatus("not_configured");
      }

      // Para Meta, verificar status via Meta API
      if ((data as any)?.provider === 'meta' && (data as any)?.meta_phone_number_id && (data as any)?.meta_access_token) {
        await checkMetaStatus((data as any).meta_phone_number_id, (data as any).meta_access_token);
      } else if (data?.zapi_instance_id && data?.zapi_instance_token) {
        await checkZAPIStatus(data.zapi_instance_id, data.zapi_instance_token, data.zapi_client_token);
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
    }
  };

  const checkMetaStatus = async (phoneId?: string, accessToken?: string) => {
    setIsCheckingStatus(true);
    try {
      const id = phoneId || config.meta_phone_number_id;
      const token = accessToken || config.meta_access_token;

      if (!id || !token) {
        setConnectionStatus("not_configured");
        setIsConnected(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("whatsapp-zapi-action", {
        body: {
          action: "status",
          provider: "meta",
          meta_phone_number_id: id,
          meta_access_token: token,
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
      console.error("Erro ao verificar status Meta:", error);
      setConnectionStatus("error");
    } finally {
      setIsCheckingStatus(false);
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
      setActiveTab("connection");
      setQrCode(null);
      setEditingAgentName(agent.name);
      await loadInstanceConfig(agent.id);
    }
  };

  const handleSaveCredentials = async () => {
    if (!expandedAgentId || !tenantId) return;
    
    setIsSaving(true);
    try {
      // Generate verify_token for Meta if not set
      const verifyToken = config.meta_verify_token || 
        (config.provider === 'meta' ? crypto.randomUUID().replace(/-/g, '').substring(0, 16) : '');

      const payload: Record<string, unknown> = {
        agent_id: expandedAgentId,
        tenant_id: tenantId,
        instance_name: `tenant-${tenantId}-${expandedAgentId}`,
        provider: config.provider,
        connection_status: "disconnected",
        updated_at: new Date().toISOString(),
      };

      if (config.provider === 'meta') {
        payload.meta_phone_number_id = config.meta_phone_number_id;
        payload.meta_access_token = config.meta_access_token;
        payload.meta_waba_id = config.meta_waba_id || null;
        payload.meta_verify_token = verifyToken;
      } else {
        payload.zapi_instance_id = config.zapi_instance_id;
        payload.zapi_instance_token = config.zapi_instance_token;
        payload.zapi_client_token = config.zapi_client_token || null;
      }

      if (config.id) {
        const { error } = await supabase
          .from("whatsapp_instances")
          .update(payload)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("whatsapp_instances")
          .insert(payload as any)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setConfig(prev => ({ ...prev, id: data.id, meta_verify_token: verifyToken }));
        }
      }

      toast({
        title: "Credenciais salvas",
        description: config.provider === 'meta' 
          ? "Credenciais Meta WhatsApp salvas com sucesso" 
          : "Credenciais Z-API salvas com sucesso",
      });

      // Auto-check status after saving
      if (config.provider === 'meta') {
        await checkMetaStatus();
      }
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

          // Ativar captura de mensagens enviadas pelo celular
          try {
            await supabase.functions.invoke("whatsapp-zapi-action", {
              body: {
                action: "update-notify-sent-by-me",
                zapi_instance_id: config.zapi_instance_id,
                zapi_instance_token: config.zapi_instance_token,
                zapi_client_token: config.zapi_client_token || undefined,
              },
            });
            console.log("notifySentByMe ativado com sucesso");
          } catch (e) {
            console.error("Erro ao ativar notifySentByMe:", e);
          }

          // Configurar webhook para receber mensagens
          try {
            await supabase.functions.invoke("whatsapp-zapi-action", {
              body: {
                action: "set-webhook",
                zapi_instance_id: config.zapi_instance_id,
                zapi_instance_token: config.zapi_instance_token,
                zapi_client_token: config.zapi_client_token || undefined,
              },
            });
            console.log("Webhook configurado com sucesso");
          } catch (e) {
            console.error("Erro ao configurar webhook:", e);
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
        provider: "zapi",
        zapi_instance_id: "",
        zapi_instance_token: "",
        zapi_client_token: "",
        meta_phone_number_id: "",
        meta_access_token: "",
        meta_waba_id: "",
        meta_verify_token: "",
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

  const handleDeleteAgent = async () => {
    if (!deleteAgentId || !tenantId) return;
    
    setIsDeletingAgent(true);
    try {
      // Delete associated instance first
      await supabase
        .from("whatsapp_instances")
        .delete()
        .eq("agent_id", deleteAgentId)
        .eq("tenant_id", tenantId);

      // Delete kanban data
      const { data: columns } = await supabase
        .from("whatsapp_kanban_columns")
        .select("id")
        .eq("agent_id", deleteAgentId);

      if (columns && columns.length > 0) {
        const columnIds = columns.map(c => c.id);
        await supabase
          .from("whatsapp_conversation_kanban")
          .delete()
          .in("column_id", columnIds);
        await supabase
          .from("whatsapp_kanban_columns")
          .delete()
          .eq("agent_id", deleteAgentId);
      }

      // Delete the agent
      const { error } = await supabase
        .from("whatsapp_agents")
        .delete()
        .eq("id", deleteAgentId)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      // Close expanded if it was the deleted one
      if (expandedAgentId === deleteAgentId) {
        setExpandedAgentId(null);
      }

      toast({
        title: "Agente apagado",
        description: "O agente e suas configurações foram removidos",
      });

      await loadAgents();
    } catch (error: any) {
      console.error("Erro ao apagar agente:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível apagar o agente",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAgent(false);
      setDeleteAgentId(null);
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
          <div className="flex items-center gap-2">
            {!hasOwnAgent && (
              <Button 
                onClick={handleCreateMyAgent} 
                disabled={isCreatingMyAgent}
                variant="outline"
                className="gap-2 border-primary text-primary hover:bg-primary/10"
              >
                <User className="h-4 w-4" />
                {isCreatingMyAgent ? "Criando..." : "Criar Meu Agente"}
              </Button>
            )}
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Agente
            </Button>
          </div>
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
          <div className="border border-border rounded-lg divide-y divide-border">
            {agents.map(agent => {
              const roleLabels: Record<string, string> = {
                admin: "Administrador",
                atendente: "Atendente",
                supervisor: "Supervisor",
              };

              return (
              <div key={agent.id}>
                {/* Linha do Agente - Lista minimalista */}
                <div 
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleAgentClick(agent)}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {agent.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {roleLabels[agent.role] || agent.role}
                    </p>
                  </div>
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    agent.isConnected ? "bg-emerald-500" : "bg-muted-foreground/30"
                  )} />
                  <ChevronRight className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                    expandedAgentId === agent.id && "rotate-90"
                  )} />
                </div>

                {/* Expansão Inline com Tabs */}
                {expandedAgentId === agent.id && (
                  <Card className="mt-4 border-primary/50 shadow-lg">
                    {/* Editable Agent Name */}
                    <div className="px-6 pt-6 pb-2">
                      <Label htmlFor="agent-name-edit" className="text-sm font-medium">Nome do Agente (usado nas mensagens)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          id="agent-name-edit"
                          value={editingAgentName}
                          onChange={(e) => setEditingAgentName(e.target.value)}
                          placeholder="Nome que aparecerá nas mensagens"
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          disabled={isSavingName || editingAgentName.trim() === agent.name}
                          onClick={async () => {
                            if (!editingAgentName.trim()) return;
                            setIsSavingName(true);
                            try {
                              const { error } = await supabase
                                .from("whatsapp_agents")
                                .update({ name: editingAgentName.trim() })
                                .eq("id", agent.id);
                              if (error) throw error;
                              setAgents(prev => prev.map(a => 
                                a.id === agent.id ? { ...a, name: editingAgentName.trim() } : a
                              ));
                              toast({ title: "Nome atualizado", description: "O nome do agente foi salvo com sucesso" });
                            } catch (error: any) {
                              toast({ title: "Erro", description: error.message || "Não foi possível salvar", variant: "destructive" });
                            } finally {
                              setIsSavingName(false);
                            }
                          }}
                        >
                          {isSavingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Este nome será usado como prefixo <strong>*Nome*</strong> nas mensagens enviadas pelo CRM
                      </p>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <CardHeader className="pb-0">
                        <div className="flex items-center justify-between">
                          <TabsList className="grid w-full grid-cols-2 flex-1">
                          <TabsTrigger value="connection" className="gap-2">
                            <Wifi className="h-4 w-4" />
                            Conexão
                          </TabsTrigger>
                          <TabsTrigger value="ai" className="gap-2">
                            Comportamento da IA
                          </TabsTrigger>
                          </TabsList>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); setDeleteAgentId(agent.id); }}
                            title="Apagar agente"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-6">
                        {/* Aba Conexão */}
                        <TabsContent value="connection" className="mt-0 space-y-6">
                          {/* Provider Selector */}
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Provedor WhatsApp</Label>
                            <div className="flex gap-2">
                              <Button
                                variant={config.provider === 'zapi' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setConfig(prev => ({ ...prev, provider: 'zapi' }))}
                                className="flex-1 gap-2"
                              >
                                <Wifi className="h-4 w-4" />
                                Vouti.API (Z-API)
                              </Button>
                              <Button
                                variant={config.provider === 'meta' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setConfig(prev => ({ ...prev, provider: 'meta' }))}
                                className="flex-1 gap-2"
                              >
                                <Globe className="h-4 w-4" />
                                Meta WhatsApp (API Oficial)
                              </Button>
                            </div>
                          </div>

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
                              onClick={() => config.provider === 'meta' ? checkMetaStatus() : checkZAPIStatus()}
                              disabled={isCheckingStatus}
                            >
                              <RefreshCw className={cn("h-4 w-4", isCheckingStatus && "animate-spin")} />
                            </Button>
                          </div>

                          {/* ========== META FORM ========== */}
                          {config.provider === 'meta' && (
                            <div className="space-y-4">
                              <h3 className="font-semibold flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                Credenciais Meta WhatsApp Cloud API
                              </h3>

                              <div className="space-y-2">
                                <Label htmlFor="meta_phone_number_id">Phone Number ID</Label>
                                <Input
                                  id="meta_phone_number_id"
                                  value={config.meta_phone_number_id}
                                  onChange={(e) => setConfig(prev => ({ ...prev, meta_phone_number_id: e.target.value.trim() }))}
                                  placeholder="Ex: 123456789012345"
                                  className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Encontrado em Meta Developers → WhatsApp → API Setup
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="meta_access_token">Access Token (Permanente)</Label>
                                <Input
                                  id="meta_access_token"
                                  type="password"
                                  value={config.meta_access_token}
                                  onChange={(e) => setConfig(prev => ({ ...prev, meta_access_token: e.target.value.trim() }))}
                                  placeholder="Token permanente do Meta"
                                  className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Token gerado no painel Meta Business. Use um token permanente (System User Token).
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="meta_waba_id">WABA ID (Opcional)</Label>
                                <Input
                                  id="meta_waba_id"
                                  value={config.meta_waba_id}
                                  onChange={(e) => setConfig(prev => ({ ...prev, meta_waba_id: e.target.value.trim() }))}
                                  placeholder="WhatsApp Business Account ID"
                                  className="font-mono"
                                />
                              </div>

                              {/* Webhook URL - Read Only */}
                              <div className="space-y-2 p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                                <Label className="font-semibold text-primary">Webhook URL</Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    readOnly
                                    value="https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/whatsapp-meta-webhook"
                                    className="font-mono text-xs bg-background"
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      navigator.clipboard.writeText("https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/whatsapp-meta-webhook");
                                      toast({ title: "Copiado!", description: "URL do webhook copiada" });
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Cole esta URL no painel Meta Developers → WhatsApp → Configuration → Webhook URL
                                </p>
                              </div>

                              {/* Verify Token - Read Only */}
                              {config.meta_verify_token && (
                                <div className="space-y-2">
                                  <Label>Verify Token</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      readOnly
                                      value={config.meta_verify_token}
                                      className="font-mono text-xs bg-muted"
                                    />
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => {
                                        navigator.clipboard.writeText(config.meta_verify_token);
                                        toast({ title: "Copiado!", description: "Verify Token copiado" });
                                      }}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Use este token no campo "Verify Token" do webhook no Meta Developers
                                  </p>
                                </div>
                              )}

                              <Button onClick={handleSaveCredentials} disabled={isSaving} className="w-full">
                                <Save className="h-4 w-4 mr-2" />
                                {isSaving ? "Salvando..." : "Salvar Credenciais Meta"}
                              </Button>

                              {/* Link to Meta */}
                              <a 
                                href="https://developers.facebook.com/apps/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary hover:underline"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Abrir Meta Developers
                              </a>
                            </div>
                          )}

                          {/* ========== Z-API FORM ========== */}
                          {config.provider === 'zapi' && (
                            <>
                              {/* Credenciais */}
                              <div className="space-y-4">
                                <h3 className="font-semibold">Credenciais Vouti.API</h3>
                                
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
                            </>
                          )}
                        </TabsContent>

                        {/* Aba Comportamento da IA */}
                        <TabsContent value="ai" className="mt-0">
                          <WhatsAppAISettings isSuperAdmin={false} agentId={agent.id} />
                        </TabsContent>
                      </CardContent>
                    </Tabs>
                  </Card>
                )}
              </div>
              );
            })}
          </div>
        )}

        {/* Dialog para adicionar */}
        <AddAgentDialog 
          open={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen}
          onAgentAdded={loadAgents}
        />

        {/* Dialog de confirmação para apagar */}
        <AlertDialog open={!!deleteAgentId} onOpenChange={(open) => !open && setDeleteAgentId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar agente?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação é irreversível. O agente, suas credenciais Z-API, colunas do Kanban e conversas vinculadas serão removidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingAgent}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAgent}
                disabled={isDeletingAgent}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingAgent ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Apagando...</>
                ) : (
                  "Apagar"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
