import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Users2, Loader2, Wifi, WifiOff, QrCode, 
  Unplug, RotateCcw, Save, CheckCircle2, XCircle, RefreshCw, User, Trash2,
  Copy, ExternalLink, Globe, ChevronRight, FolderOpen, ChevronDown
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

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
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
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
  
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasOwnAgent, setHasOwnAgent] = useState(true);
  const [isCreatingMyAgent, setIsCreatingMyAgent] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);
  const [isDeletingAgent, setIsDeletingAgent] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
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
      const [agentsResult, instancesResult, teamsResult] = await Promise.all([
        supabase
          .from("whatsapp_agents")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: true }),
        supabase
          .from("whatsapp_instances")
          .select("agent_id, connection_status")
          .eq("tenant_id", tenantId),
        supabase
          .from("whatsapp_teams")
          .select("id, name")
          .eq("tenant_id", tenantId)
          .order("name"),
      ]);

      if (agentsResult.error) throw agentsResult.error;

      setTeams(teamsResult.data || []);

      const instanceMap = new Map(
        instancesResult.data?.map(i => [i.agent_id, i.connection_status === "connected"]) || []
      );

      const formattedAgents: Agent[] = (agentsResult.data || []).map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        is_active: a.is_active,
        isConnected: instanceMap.get(a.id) || false,
        team_id: a.team_id || null,
      }));

      setAgents(formattedAgents);

      // Check if current user already has an agent
      if (currentUserEmail) {
        const hasAgent = (agentsResult.data || []).some(
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
    
    const agentToDelete = agents.find(a => a.id === deleteAgentId);
    if (!agentToDelete || deleteConfirmName !== agentToDelete.name) {
      toast({ title: "Nome incorreto", description: "Digite o nome exato do agente para confirmar.", variant: "destructive" });
      return;
    }
    
    setIsDeletingAgent(true);
    try {
      // 1. Delete campaign messages (via campaigns)
      const { data: campaigns } = await supabase
        .from("whatsapp_campaigns")
        .select("id")
        .eq("agent_id", deleteAgentId);
      
      if (campaigns && campaigns.length > 0) {
        const campaignIds = campaigns.map(c => c.id);
        await supabase.from("whatsapp_campaign_messages").delete().in("campaign_id", campaignIds);
      }
      
      // 2. Delete campaigns
      await supabase.from("whatsapp_campaigns").delete().eq("agent_id", deleteAgentId);
      
      // 3. Delete tickets
      await supabase.from("whatsapp_tickets" as any).delete().eq("agent_id", deleteAgentId);
      
      // 4. Delete emoji history
      await supabase.from("whatsapp_emoji_history").delete().eq("agent_id", deleteAgentId);
      
      // 5. Delete macros
      await supabase.from("whatsapp_macros" as any).delete().eq("agent_id", deleteAgentId);
      
      // 6. Delete AI config
      await supabase.from("whatsapp_ai_config" as any).delete().eq("agent_id", deleteAgentId);
      
      // 7. Delete conversation access
      await supabase.from("whatsapp_conversation_access" as any).delete().eq("agent_id", deleteAgentId);
      
      // 8. Delete messages
      await supabase.from("whatsapp_messages").delete().eq("agent_id", deleteAgentId);
      
      // 9. Nullify transfer references in other agents' kanban cards
      await supabase
        .from("whatsapp_conversation_kanban")
        .update({ transferred_from_agent_id: null, transferred_from_agent_name: null } as any)
        .eq("transferred_from_agent_id", deleteAgentId);

      // 10. Delete kanban cards then columns
      const { data: columns } = await supabase
        .from("whatsapp_kanban_columns")
        .select("id")
        .eq("agent_id", deleteAgentId);

      if (columns && columns.length > 0) {
        const columnIds = columns.map(c => c.id);
        await supabase.from("whatsapp_conversation_kanban").delete().in("column_id", columnIds);
        await supabase.from("whatsapp_kanban_columns").delete().eq("agent_id", deleteAgentId);
      }

      // 10. Delete instances
      await supabase.from("whatsapp_instances").delete().eq("agent_id", deleteAgentId).eq("tenant_id", tenantId);
      
      // 11. Delete agent roles
      await supabase.from("whatsapp_agent_roles" as any).delete().eq("agent_id", deleteAgentId);

      // 12. Delete the agent
      const { error } = await supabase
        .from("whatsapp_agents")
        .delete()
        .eq("id", deleteAgentId)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      if (expandedAgentId === deleteAgentId) {
        setExpandedAgentId(null);
      }

      toast({
        title: "Agente apagado",
        description: "O agente e todo seu histórico foram removidos permanentemente.",
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
      setDeleteStep(1);
      setDeleteConfirmName("");
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
          (() => {
            const roleLabels: Record<string, string> = {
              admin: "Administrador",
              atendente: "Atendente",
              supervisor: "Supervisor",
            };

            // Group agents by team
            const teamMap = new Map<string | null, Agent[]>();
            agents.forEach(agent => {
              const key = agent.team_id || null;
              if (!teamMap.has(key)) teamMap.set(key, []);
              teamMap.get(key)!.push(agent);
            });

            const teamNameMap = new Map(teams.map(t => [t.id, t.name]));

            // Sort: teams first (alphabetically), then "Sem Time"
            const sortedKeys = Array.from(teamMap.keys()).sort((a, b) => {
              if (a === null) return 1;
              if (b === null) return -1;
              return (teamNameMap.get(a) || "").localeCompare(teamNameMap.get(b) || "");
            });

            const renderAgentRow = (agent: Agent) => (
              <div key={agent.id}>
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

                {expandedAgentId === agent.id && (
                  <Card className="mt-4 border-primary/50 shadow-lg">
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
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 ml-2 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteAgentId(agent.id);
                            }}
                            title="Apagar agente"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>

                      <TabsContent value="connection">
                        <CardContent className="space-y-6 pt-4">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2">
                              <StatusIcon className={cn("h-4 w-4", statusDisplay.className)} />
                              <span className="text-sm font-medium">{statusDisplay.text}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => {
                              if (config.provider === 'meta') checkMetaStatus();
                              else checkZAPIStatus();
                            }} disabled={isCheckingStatus}>
                              <RefreshCw className={cn("h-4 w-4", isCheckingStatus && "animate-spin")} />
                            </Button>
                          </div>

                          {/* Provider selector and credentials - kept inline */}
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium mb-2 block">Provedor</Label>
                              <div className="flex gap-2">
                                <Button variant={config.provider === 'zapi' ? 'default' : 'outline'} size="sm" onClick={() => setConfig(p => ({...p, provider: 'zapi'}))}>Z-API</Button>
                                <Button variant={config.provider === 'meta' ? 'default' : 'outline'} size="sm" onClick={() => setConfig(p => ({...p, provider: 'meta'}))}>
                                  <Globe className="h-4 w-4 mr-1" /> Meta Cloud API
                                </Button>
                              </div>
                            </div>

                            {config.provider === 'zapi' ? (
                              <div className="space-y-3">
                                <div><Label>Instance ID</Label><Input value={config.zapi_instance_id} onChange={e => setConfig(p => ({...p, zapi_instance_id: extractInstanceId(e.target.value)}))} placeholder="Cole o ID ou link da instância" /></div>
                                <div><Label>Instance Token</Label><Input value={config.zapi_instance_token} onChange={e => setConfig(p => ({...p, zapi_instance_token: extractInstanceToken(e.target.value)}))} placeholder="Cole o token ou link" /></div>
                                <div><Label>Client Token (opcional)</Label><Input value={config.zapi_client_token} onChange={e => setConfig(p => ({...p, zapi_client_token: e.target.value}))} placeholder="Token do cliente" /></div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div><Label>Phone Number ID</Label><Input value={config.meta_phone_number_id} onChange={e => setConfig(p => ({...p, meta_phone_number_id: e.target.value}))} placeholder="ID do número no Meta" /></div>
                                <div><Label>Access Token</Label><Input value={config.meta_access_token} onChange={e => setConfig(p => ({...p, meta_access_token: e.target.value}))} placeholder="Token de acesso permanente" /></div>
                                <div><Label>WABA ID (opcional)</Label><Input value={config.meta_waba_id} onChange={e => setConfig(p => ({...p, meta_waba_id: e.target.value}))} placeholder="WhatsApp Business Account ID" /></div>
                                {config.meta_verify_token && (
                                  <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                                    <Label className="text-xs">Verify Token (para webhook)</Label>
                                    <div className="flex items-center gap-2">
                                      <code className="text-xs bg-background px-2 py-1 rounded flex-1 overflow-x-auto">{config.meta_verify_token}</code>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(config.meta_verify_token); toast({title: "Copiado!"}); }}><Copy className="h-3 w-3" /></Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            <Button onClick={handleSaveCredentials} disabled={isSaving} className="w-full gap-2">
                              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              Salvar Credenciais
                            </Button>
                          </div>

                          {config.provider === 'zapi' && (
                            <>
                              {!qrCode && !isConnected && (
                                <Button onClick={handleGenerateQRCode} disabled={isGeneratingQR} variant="outline" className="w-full gap-2">
                                  {isGeneratingQR ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                                  Gerar QR Code
                                </Button>
                              )}
                              {qrCode && (
                                <div className="text-center space-y-3">
                                  <p className="text-sm text-muted-foreground">Escaneie com seu WhatsApp:</p>
                                  <img src={qrCode.startsWith('data:image/') ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code" className="mx-auto max-w-[250px] rounded-lg border" />
                                  {isPolling && <p className="text-xs text-muted-foreground animate-pulse">Aguardando conexão...</p>}
                                  <Button variant="ghost" size="sm" onClick={handleCancelQR}>Cancelar</Button>
                                </div>
                              )}
                              {isConnected && (
                                <div className="flex gap-2">
                                  <Button onClick={handleDisconnect} disabled={isDisconnecting} variant="destructive" className="flex-1 gap-2">
                                    {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                                    Desconectar
                                  </Button>
                                  <Button onClick={handleReset} disabled={isResetting} variant="outline" className="gap-2">
                                    {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                    Reset
                                  </Button>
                                </div>
                              )}
                            </>
                          )}

                          {config.provider === 'meta' && config.meta_verify_token && (
                            <div className="p-4 border rounded-lg space-y-2">
                              <h4 className="text-sm font-medium">Configurar Webhook no Meta</h4>
                              <p className="text-xs text-muted-foreground">Configure a URL do webhook e o Verify Token no painel da Meta:</p>
                              <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open('https://developers.facebook.com/apps/', '_blank')}>
                                <ExternalLink className="h-3 w-3" /> Abrir Meta Developers
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </TabsContent>

                      <TabsContent value="ai">
                        <CardContent className="pt-4">
                          <WhatsAppAISettings agentId={agent.id} />
                        </CardContent>
                      </TabsContent>
                    </Tabs>
                  </Card>
                )}
              </div>
            );

            return (
              <div className="space-y-4">
                {sortedKeys.map(teamKey => {
                  const teamAgents = teamMap.get(teamKey) || [];
                  const teamName = teamKey ? teamNameMap.get(teamKey) || "Time Desconhecido" : "Sem Time";

                  return (
                    <Collapsible key={teamKey || "no-team"} defaultOpen>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors group">
                        <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm font-semibold text-foreground">{teamName}</span>
                        <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">
                          {teamAgents.length}
                        </Badge>
                        <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto transition-transform group-data-[state=closed]:-rotate-90" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border border-border rounded-lg divide-y divide-border mt-1">
                          {teamAgents.map(renderAgentRow)}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            );
          })()
        )}

        {/* Dialog para adicionar */}
        <AddAgentDialog 
          open={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen}
          onAgentAdded={loadAgents}
        />

        {/* Dialog de confirmação para apagar - Dupla confirmação */}
        <AlertDialog open={!!deleteAgentId} onOpenChange={(open) => { if (!open) { setDeleteAgentId(null); setDeleteStep(1); setDeleteConfirmName(""); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteStep === 1 ? "Apagar agente?" : "⚠️ CONFIRMAÇÃO FINAL"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteStep === 1 ? (
                  `Tem certeza que deseja apagar o agente "${agents.find(a => a.id === deleteAgentId)?.name}"?`
                ) : (
                  <div className="space-y-3">
                    <p className="text-destructive font-medium">
                      Esta ação apagará PERMANENTEMENTE todas as conversas, kanbans, macros, campanhas e histórico deste agente.
                    </p>
                    <div>
                      <p className="text-sm mb-2">
                        Digite o nome do agente <strong>"{agents.find(a => a.id === deleteAgentId)?.name}"</strong> para confirmar:
                      </p>
                      <Input 
                        value={deleteConfirmName} 
                        onChange={(e) => setDeleteConfirmName(e.target.value)} 
                        placeholder="Nome do agente"
                      />
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingAgent}>Cancelar</AlertDialogCancel>
              {deleteStep === 1 ? (
                <AlertDialogAction
                  onClick={(e) => { e.preventDefault(); setDeleteStep(2); }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Continuar
                </AlertDialogAction>
              ) : (
                <AlertDialogAction
                  onClick={(e) => { e.preventDefault(); handleDeleteAgent(); }}
                  disabled={isDeletingAgent || deleteConfirmName !== agents.find(a => a.id === deleteAgentId)?.name}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeletingAgent ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Apagando...</>
                  ) : (
                    "Apagar Permanentemente"
                  )}
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
