import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Globe, 
  Building2, 
  Wifi, 
  WifiOff, 
  QrCode,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const WhatsAppSettings = () => {
  const { toast } = useToast();
  const { tenantId } = useTenantId();
  const { whatsappLeadSource, updateFeature } = useTenantFeatures();
  
  const [activeTab, setActiveTab] = useState("conexao");
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isResetting, setIsResetting] = useState(false);
  const [leadSource, setLeadSource] = useState<'landing_leads' | 'leads_captacao'>(
    whatsappLeadSource || 'leads_captacao'
  );
  const [isSavingLeadSource, setIsSavingLeadSource] = useState(false);
  
  const [zapiConfig, setZapiConfig] = useState({
    url: '',
    instanceId: '',
    token: ''
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    if (whatsappLeadSource) {
      setLeadSource(whatsappLeadSource);
    }
  }, [whatsappLeadSource]);

  // Carregar credenciais existentes do tenant
  useEffect(() => {
    const loadExistingConfig = async () => {
      if (!tenantId) return;
      
      const { data: instance } = await supabase
        .from('whatsapp_instances')
        .select('instance_name, zapi_url, zapi_token, connection_status')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (instance) {
        setZapiConfig({
          url: instance.zapi_url || '',
          instanceId: instance.instance_name || '',
          token: instance.zapi_token || ''
        });
        
        setConnectionStatus(
          instance.connection_status === 'connected' ? 'connected' : 'disconnected'
        );
        setIsConnected(instance.connection_status === 'connected');
      }
    };
    
    loadExistingConfig();
  }, [tenantId]);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const { data } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'get_status' }
      });

      if (data?.success && data?.data?.connected) {
        setIsConnected(true);
        setConnectionStatus('connected');
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const handleLeadSourceChange = async (value: 'landing_leads' | 'leads_captacao') => {
    setLeadSource(value);
    setIsSavingLeadSource(true);
    
    const success = await updateFeature('whatsapp_lead_source', value);
    
    if (success) {
      toast({
        title: "Fonte de leads atualizada",
        description: value === 'leads_captacao' 
          ? "Leads serão capturados das Landing Pages do Escritório"
          : "Leads serão capturados da Landing Page Principal",
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração",
        variant: "destructive",
      });
    }
    
    setIsSavingLeadSource(false);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    
    try {
      const { data: statusData } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'create_instance' }
      });

      if (statusData?.success) {
        toast({
          title: "Verificando instância",
          description: "Conectando com Z-API...",
        });

        const { data: qrData } = await supabase.functions.invoke('whatsapp-connect', {
          body: { action: 'get_qrcode' }
        });

        if (qrData?.success && qrData.qrcode) {
          const qrCodeData = qrData.qrcode.startsWith('data:') 
            ? qrData.qrcode 
            : `data:image/png;base64,${qrData.qrcode}`;
          
          setQrCode(qrCodeData);
          toast({
            title: "QR Code gerado",
            description: "Escaneie o QR Code com seu WhatsApp",
          });
        }

        const statusInterval = setInterval(async () => {
          const { data: connectionData } = await supabase.functions.invoke('whatsapp-connect', {
            body: { action: 'get_status' }
          });

          if (connectionData?.success && connectionData.status === 'open') {
            setIsConnected(true);
            setConnectionStatus('connected');
            setQrCode(null);
            clearInterval(statusInterval);
            
            toast({
              title: "WhatsApp conectado!",
              description: "Sua conta foi conectada com sucesso",
            });
          }
        }, 5000);

        setTimeout(() => {
          clearInterval(statusInterval);
          if (!isConnected) {
            setConnectionStatus('disconnected');
            setIsConnecting(false);
            toast({
              title: "Timeout",
              description: "Tempo limite para conexão. Tente novamente.",
              variant: "destructive",
            });
          }
        }, 300000);
      }
    } catch (error) {
      console.error('Erro ao conectar:', error);
      toast({
        title: "Erro na conexão",
        description: "Falha ao conectar com Z-API. Verifique suas credenciais.",
        variant: "destructive",
      });
      setConnectionStatus('disconnected');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { data } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'disconnect' }
      });

      if (data?.success) {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setQrCode(null);
        toast({
          title: "WhatsApp desconectado",
          description: "Conexão encerrada com sucesso",
        });
      }
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      toast({
        title: "Erro",
        description: "Falha ao desconectar",
        variant: "destructive",
      });
    }
  };

  const saveZapiConfig = async () => {
    setIsSavingConfig(true);
    
    try {
      if (!zapiConfig.url || !zapiConfig.instanceId || !zapiConfig.token) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha todos os campos de configuração",
          variant: "destructive",
        });
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error: instanceError } = await supabase
        .from('whatsapp_instances')
        .upsert({
          instance_name: zapiConfig.instanceId,
          user_id: userData.user.id,
          tenant_id: tenantId,
          connection_status: 'disconnected',
          last_update: new Date().toISOString()
        }, {
          onConflict: 'instance_name'
        });

      if (instanceError) throw instanceError;

      const { data } = await supabase.functions.invoke('save-zapi-config', {
        body: {
          url: zapiConfig.url,
          instanceId: zapiConfig.instanceId,
          token: zapiConfig.token
        }
      });

      if (data?.success) {
        toast({
          title: "Configuração salva",
          description: "Credenciais salvas com sucesso! Agora você pode conectar.",
        });
        setActiveTab('conexao');
      } else {
        throw new Error(data?.error || 'Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configuração Z-API",
        variant: "destructive",
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      setIsConnected(false);
      setQrCode(null);
      setConnectionStatus('disconnected');
      
      await supabase.from('whatsapp_instances').delete().eq('user_id', userData.user.id);
      
      toast({
        title: "Configurações resetadas",
        description: "Você pode reconfigurar agora com novos dados",
      });
    } catch (error) {
      console.error('Erro ao resetar:', error);
      toast({
        title: "Erro",
        description: "Falha ao resetar configurações",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configurações</h2>
        <p className="text-muted-foreground">Configure a conexão Z-API e fonte de leads</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="conexao">Conexão Z-API</TabsTrigger>
          <TabsTrigger value="fonte">Fonte de Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="conexao" className="space-y-4">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {connectionStatus === 'connected' ? (
                  <Wifi className="h-5 w-5 text-green-600" />
                ) : (
                  <WifiOff className="h-5 w-5 text-muted-foreground" />
                )}
                Status da Conexão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                    'bg-red-500'
                  }`} />
                  <span className="text-sm">
                    {connectionStatus === 'connected' ? 'Conectado' :
                     connectionStatus === 'connecting' ? 'Conectando...' :
                     'Desconectado'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {connectionStatus === 'connected' ? (
                    <Button variant="outline" size="sm" onClick={handleDisconnect}>
                      <WifiOff className="h-4 w-4 mr-2" />
                      Desconectar
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleConnect} disabled={isConnecting}>
                      <QrCode className="h-4 w-4 mr-2" />
                      {isConnecting ? 'Conectando...' : 'Conectar'}
                    </Button>
                  )}
                </div>
              </div>

              {qrCode && (
                <div className="mt-6 flex flex-col items-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Escaneie o QR Code com seu WhatsApp
                  </p>
                  <img src={qrCode} alt="QR Code" className="w-64 h-64 border rounded-lg" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuração Z-API */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Credenciais Z-API
              </CardTitle>
              <CardDescription>
                Configure suas credenciais para conectar o WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL Base Z-API</Label>
                <Input
                  placeholder="https://api.z-api.io"
                  value={zapiConfig.url}
                  onChange={(e) => setZapiConfig(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Instance ID</Label>
                <Input
                  placeholder="Seu instance ID"
                  value={zapiConfig.instanceId}
                  onChange={(e) => setZapiConfig(prev => ({ ...prev, instanceId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Token</Label>
                <Input
                  type="password"
                  placeholder="Seu token Z-API"
                  value={zapiConfig.token}
                  onChange={(e) => setZapiConfig(prev => ({ ...prev, token: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveZapiConfig} disabled={isSavingConfig}>
                  {isSavingConfig ? 'Salvando...' : 'Salvar Configuração'}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={isResetting}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Resetar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Resetar configurações?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso irá remover todas as configurações Z-API salvas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReset}>
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fonte" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fonte de Leads para Automação</CardTitle>
              <CardDescription>
                Escolha de qual fonte os leads serão capturados para receber mensagens automáticas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={leadSource}
                onValueChange={(v) => handleLeadSourceChange(v as 'landing_leads' | 'leads_captacao')}
                className="space-y-4"
              >
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="landing_leads" id="landing_leads" />
                  <div className="flex-1">
                    <Label htmlFor="landing_leads" className="flex items-center gap-2 cursor-pointer">
                      <Globe className="h-4 w-4 text-blue-600" />
                      Landing Page Principal (vouti.co)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Leads que se cadastram na página inicial do Vouti
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="leads_captacao" id="leads_captacao" />
                  <div className="flex-1">
                    <Label htmlFor="leads_captacao" className="flex items-center gap-2 cursor-pointer">
                      <Building2 className="h-4 w-4 text-green-600" />
                      Landing Pages do Escritório
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Leads que se cadastram nas landing pages específicas do seu escritório
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {isSavingLeadSource && (
                <Alert className="mt-4">
                  <AlertDescription>Salvando configuração...</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
